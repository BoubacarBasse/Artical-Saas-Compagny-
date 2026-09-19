-- Undoes seed_hosted.sql for one account. Deleting an order cascades to its
-- order_events, so only notifications and orders are named here. Leaves the
-- account itself alone, so you stay signed in and can re-seed immediately.
--
-- Same two rules as seed_hosted.sql: one statement, no apostrophes in
-- comments. See tests/unit/seed-sql.spec.ts and context.md.

with

me as (
  select id from auth.users
   where email = 'you@example.com'
),

del_notifications as (
  delete from public.notifications
   where user_id = (select id from me)
  returning 1
),

del_orders as (
  delete from public.orders
   where user_id = (select id from me)
  returning 1
)

select
  case
    when not exists (select 1 from me)
      then 'NO ACCOUNT. Nothing was deleted. No user has that email.'
    when not exists (select 1 from del_orders)
         and not exists (select 1 from del_notifications)
      then 'NOTHING TO DELETE. That account had no demo data.'
    else 'CLEANED'
  end                                           as result,
  (select count(*) from del_orders)             as orders_deleted,
  (select count(*) from del_notifications)      as notifications_deleted;
