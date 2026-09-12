-- ===========================================================================
-- Article-ordering SaaS — initial schema
-- ===========================================================================
-- Apply by pasting this whole file into the Supabase SQL editor and running it
-- (Supabase dashboard -> SQL Editor -> New query). It is written for a fresh
-- project, not to be re-run over live data.
--
-- HOW STAFF WORK IN v1
-- There is no admin UI. To advance an order, staff open Table Editor ->
-- `orders` and change the `status` cell, then add a row to `order_events` so
-- the client's timeline reflects it. Statuses are flat badges, not a pipeline
-- with a percentage: fewer states means fewer chances for hand-maintained data
-- to go stale.
--
-- BEFORE YOU TEST SIGN-UP
-- Supabase enables "Confirm email" by default, which means a new account has no
-- session until the user clicks a link. v1 has no confirmation UI. Either
-- confirm the address from the inbox, or turn the setting off under
-- Authentication -> Providers -> Email while developing.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum
      ('draft', 'in_progress', 'pending_review', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_format') then
    create type public.order_format as enum
      ('blog_post', 'whitepaper', 'case_study', 'newsletter', 'landing_page');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_priority') then
    create type public.order_priority as enum ('low', 'medium', 'high');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_event_kind') then
    create type public.order_event_kind as enum
      ('submitted', 'status_changed', 'delivered', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_kind') then
    create type public.notification_kind as enum
      ('order_update', 'order_complete', 'system');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
-- `preferences` is jsonb rather than one column per toggle. This is a
-- design-led project: screens reveal switches nobody anticipated, and shipping
-- a migration for each one would slow the design loop to a crawl. Shape is
-- validated with Zod at the application boundary, on the way in and on the way
-- out. Anything we would ever filter or sort on gets a real column instead.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text        not null,
  full_name   text,
  company     text,
  avatar_url  text,
  preferences jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
-- `order_number` is the human-readable reference shown as "Order #1024". It
-- comes from a sequence rather than a count, so numbers are never reused and
-- two concurrent inserts cannot collide.

create sequence if not exists public.order_number_seq start with 1001;

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  bigint      not null unique default nextval('public.order_number_seq'),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  title         text        not null check (char_length(title) between 3 and 120),
  brief         text        not null check (char_length(brief) between 10 and 5000),
  keywords      text[]      not null default '{}',
  format        public.order_format   not null,
  word_count    integer     not null check (word_count between 100 and 10000),
  deadline      date,
  status        public.order_status   not null default 'draft',
  -- Set by staff, read by the client. If clients could set it, every order
  -- would be 'high' and the field would carry no information.
  priority      public.order_priority not null default 'medium',
  -- Writers, stored inline rather than in a join table. In v1 staff maintain an
  -- order by editing one row; a join table would mean editing two places to
  -- reassign a piece. Shape: [{"name": "...", "avatarUrl": null}]
  assignees     jsonb       not null default '[]'::jsonb,
  -- The finished piece: {"filename": "...", "path": "...", "uploadedAt": "..."}
  -- `path` points into the private `deliverables` storage bucket. The app mints
  -- a short-lived signed URL on the detail page; the file is never public.
  deliverable   jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (cardinality(keywords) <= 10)
);

-- Matches the access patterns the app actually has: a user's orders newest
-- first, and a user's orders filtered by status.
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_user_status_idx  on public.orders (user_id, status);

-- ---------------------------------------------------------------------------
-- Order events
-- ---------------------------------------------------------------------------
-- Append-only history. This is what makes the detail-page timeline show *when*
-- something happened rather than only *what* happened, and it is also where the
-- dashboard's completion chart gets its dates from. Without it both features
-- are guesswork.

create table if not exists public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid        not null references public.orders (id) on delete cascade,
  kind       public.order_event_kind not null,
  -- Pre-rendered for display, e.g. "Status changed to in progress".
  label      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_created_idx
  on public.order_events (order_id, created_at desc);
create index if not exists order_events_kind_created_idx
  on public.order_events (kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       public.notification_kind not null,
  title      text        not null,
  order_id   uuid        references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Give every new auth user a profile row. SECURITY DEFINER so it runs as the
-- owner and is not blocked by the RLS policies below; `search_path` is pinned
-- because a definer function with a mutable search_path is a privilege
-- escalation waiting to happen.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Record the opening event automatically, so a client's own order still gets a
-- timeline without the client being able to write history directly.
create or replace function public.record_order_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_events (order_id, kind, label, created_at)
  values (new.id, 'submitted', 'Order submitted', new.created_at);
  return new;
end;
$$;

drop trigger if exists orders_record_submitted on public.orders;
create trigger orders_record_submitted
  after insert on public.orders
  for each row execute function public.record_order_submitted();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
-- This is the real enforcement layer. The app also filters by user_id, but that
-- is belt-and-braces: if a policy below were wrong, the app filter would hide
-- the mistake rather than fix it.

alter table public.profiles      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_events  enable row level security;
alter table public.notifications enable row level security;

-- --- profiles --------------------------------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- No INSERT policy: rows come from the trigger above, which is SECURITY
-- DEFINER and bypasses RLS. No DELETE policy: deletion cascades from auth.users.

-- A row policy says which ROWS you may update, not which COLUMNS. Without this,
-- a client could rewrite the `email` mirror or the `created_at` audit value on
-- their own row.
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, company, avatar_url, preferences)
  on public.profiles to authenticated;

-- --- orders ----------------------------------------------------------------

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

-- Two clauses, and the second one is the point.
--
--   auth.uid() = user_id   you may only create orders for yourself
--   status = 'draft'       every order starts at the beginning
--
-- Without the second clause, locking down UPDATE below buys nothing: a client
-- would simply INSERT an order that is already marked 'completed'.
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id and status = 'draft');

-- DELIBERATELY NO UPDATE OR DELETE POLICY FOR CLIENTS.
--
-- The reflexive policy people write here is `for all using (auth.uid() =
-- user_id)`, which would let a client mark their own order 'completed' and walk
-- off with free work. Advancing an order is staff-only, done through the
-- Supabase dashboard on the service_role connection, which bypasses RLS.
--
-- Revoking the privileges as well means the request fails at the permission
-- layer rather than silently matching zero rows, which is a far clearer error.
revoke update, delete on public.orders from anon, authenticated;

-- Column-level INSERT grant. Stronger than the WITH CHECK above and independent
-- of it: a client cannot even name `status`, `priority`, `assignees`,
-- `deliverable` or `order_number` in an insert, let alone set them. Defaults
-- and the sequence fill those in.
revoke insert on public.orders from anon, authenticated;
grant  insert (user_id, title, brief, keywords, format, word_count, deadline)
  on public.orders to authenticated;
grant  usage on sequence public.order_number_seq to authenticated;

-- --- order_events ----------------------------------------------------------

-- Readable only through ownership of the parent order, so an id that is not
-- yours returns nothing rather than revealing that the order exists.
drop policy if exists "order_events_select_own" on public.order_events;
create policy "order_events_select_own" on public.order_events
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id and o.user_id = auth.uid()
    )
  );

-- History is append-only and staff-written. The one event a client indirectly
-- causes is written by the SECURITY DEFINER trigger above.
revoke insert, update, delete on public.order_events from anon, authenticated;

-- --- notifications ---------------------------------------------------------

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Marking something read is the only change a client may make. Without the
-- column grant they could rewrite the title of their own notification, which is
-- harmless but meaningless — and the same pattern elsewhere would not be.
revoke update on public.notifications from anon, authenticated;
grant  update (read_at) on public.notifications to authenticated;
revoke insert, delete on public.notifications from anon, authenticated;

-- ===========================================================================
-- Storage — finished pieces
-- ===========================================================================
-- Private bucket. The app mints a short-lived signed URL on the order detail
-- page, so a download link cannot be forwarded to someone not entitled to it.

insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- Files are laid out as deliverables/<user_id>/<order_id>/<filename>, so the
-- first path segment is the owner and the policy is a simple prefix check.
drop policy if exists "deliverables_read_own" on storage.objects;
create policy "deliverables_read_own" on storage.objects
  for select using (
    bucket_id = 'deliverables'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No client INSERT, UPDATE or DELETE policy: staff upload finished work through
-- the dashboard on the service_role connection.

-- ===========================================================================
-- Verifying the policies
-- ===========================================================================
-- Sign in as two different users in two browsers and confirm:
--   1. Each sees only their own orders, events and notifications.
--   2. Neither can open the other's order by pasting its id into the URL.
--   3. Neither can change an order's status, priority or assignees.
--   4. Neither can download the other's deliverable.
-- The end-to-end suite asserts these at the application level.
-- ===========================================================================
