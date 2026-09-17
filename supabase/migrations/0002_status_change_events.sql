-- ===========================================================================
-- Automate the staff workflow: status change -> history + notification
-- ===========================================================================
-- 0001 gave a new order its opening `submitted` event via a trigger, and then
-- stopped. Everything after that was manual: to advance an order, staff had to
-- edit the `status` cell, remember to add a matching `order_events` row, and
-- remember to add a `notifications` row. Three steps, done by hand, in a table
-- editor.
--
-- That is not a workflow, it is a drift generator. Miss step two and the detail
-- page shows a "Completed" badge above a timeline that stops at "submitted".
-- Miss step three and the client is never told. Both failures are silent.
--
-- So the status cell is now the only thing staff touch. The triggers below
-- derive the history row and the client notification from the change itself,
-- which also means the two can no longer contradict the badge: they are written
-- in the same transaction as the status that caused them.
--
-- Labels and notification titles deliberately match src/lib/data/mock/seed.ts
-- word for word. The mock and Supabase providers are supposed to be
-- indistinguishable to a user, and a timeline that reads differently between
-- `npm run dev` and `npm run dev:supabase` is exactly the drift this project
-- keeps trying to design out.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Status changes
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER for the same reason as the 0001 triggers: clients have no
-- INSERT rights on `order_events` or `notifications` and must never get any.
-- The history is written *for* them, never *by* them. `search_path` is pinned
-- because a definer function with a mutable search_path is a privilege
-- escalation waiting to happen.

create or replace function public.record_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  event_kind public.order_event_kind;
  notif_kind public.notification_kind;
  notif_title text;
begin
  -- 'in_progress' -> 'in progress', so the label reads as prose.
  event_kind := case new.status
                  when 'cancelled' then 'cancelled'::public.order_event_kind
                  else 'status_changed'::public.order_event_kind
                end;

  insert into public.order_events (order_id, kind, label, created_at)
  values (
    new.id,
    event_kind,
    case when new.status = 'cancelled'
         then 'Order cancelled'
         else 'Status changed to ' || replace(new.status::text, '_', ' ')
    end,
    now()
  );

  -- A move back to draft is a staff correction, not news. Everything else is
  -- something the client asked to be told about.
  if new.status <> 'draft' then
    notif_kind := case new.status
                    when 'completed' then 'order_complete'::public.notification_kind
                    else 'order_update'::public.notification_kind
                  end;

    notif_title := case new.status
      when 'in_progress'    then 'Your order ''' || new.title || ''' is now in progress'
      when 'pending_review' then 'Order ''' || new.title || ''' is ready for your review'
      when 'completed'      then 'Order ''' || new.title || ''' marked as complete'
      when 'cancelled'      then 'Order ''' || new.title || ''' was cancelled'
    end;

    insert into public.notifications (user_id, kind, title, order_id, created_at)
    values (new.user_id, notif_kind, notif_title, new.id, now());
  end if;

  return new;
end;
$$;

drop trigger if exists orders_record_status_change on public.orders;
create trigger orders_record_status_change
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.record_order_status_change();

-- ---------------------------------------------------------------------------
-- Delivery
-- ---------------------------------------------------------------------------
-- Separate from the status change on purpose. Uploading the finished piece and
-- flipping the badge to `completed` are two different edits in the table
-- editor, they can happen in either order, and the dashboard chart counts
-- `delivered` events rather than completed orders — so the file landing has to
-- record itself independently of whatever the status happens to be.

create or replace function public.record_order_delivered()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_events (order_id, kind, label, created_at)
  values (
    new.id,
    'delivered',
    'Delivered ' || coalesce(new.deliverable ->> 'filename', 'the finished piece'),
    now()
  );
  return new;
end;
$$;

drop trigger if exists orders_record_delivered on public.orders;
create trigger orders_record_delivered
  after update of deliverable on public.orders
  for each row
  -- Fires on the upload, not on later edits to an already-present file.
  when (old.deliverable is null and new.deliverable is not null)
  execute function public.record_order_delivered();
