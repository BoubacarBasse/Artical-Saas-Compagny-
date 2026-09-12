-- ===========================================================================
-- Article-ordering SaaS — initial schema
-- ===========================================================================
-- Apply by pasting this whole file into the Supabase SQL editor and running it
-- (Supabase dashboard -> SQL Editor -> New query). It is idempotent enough to
-- run once on a fresh project; it is not written to be re-run over live data.
--
-- HOW STAFF WORK IN v1
-- There is no admin UI. To advance an order, staff open Table Editor ->
-- `orders` and change the `stage` cell. Nothing else needs touching: the
-- client's progress percentage is derived from `stage` in the application
-- (src/lib/orders/stages.ts), so there is no second column to keep in sync.
--
-- BEFORE YOU TEST SIGN-UP
-- Supabase enables "Confirm email" by default, which means a new account has no
-- session until the user clicks a link. v1 has no confirmation UI. Either
-- confirm the address from the inbox, or turn the setting off under
-- Authentication -> Providers -> Email while developing.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
-- `preferences` is jsonb rather than one column per toggle. This is a
-- design-led project: the screenshots will reveal switches nobody has thought
-- of yet, and shipping a migration for each one would slow the design loop to a
-- crawl. Shape is validated with Zod at the application boundary, on the way in
-- and on the way out (src/lib/data/schemas.ts). Anything we would ever filter
-- or sort on gets a real column instead.

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

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_stage') then
    create type public.order_stage as enum (
      'brief_received',
      'writing',
      'editing',
      'review',
      'delivered',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null check (char_length(title) between 3 and 120),
  brief       text        not null check (char_length(brief) between 10 and 5000),
  word_count  integer     not null check (word_count between 100 and 10000),
  deadline    date,
  stage       public.order_stage not null default 'brief_received',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indexes match the two access patterns the dashboard actually has: a user's
-- orders newest-first, and a user's orders filtered by stage.
create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);
create index if not exists orders_user_stage_idx
  on public.orders (user_id, stage);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
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
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
-- This is the real enforcement layer. The app also filters by user_id, but that
-- is belt-and-braces: if a policy below were wrong, the app filter would hide
-- the mistake rather than fix it.

alter table public.profiles enable row level security;
alter table public.orders   enable row level security;

-- --- profiles --------------------------------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT policy: rows are created by the trigger above, which is SECURITY
-- DEFINER and therefore bypasses RLS. No DELETE policy: account deletion
-- cascades from auth.users.

-- Column-level lockdown. A row policy says *which rows* you may update, not
-- *which columns*. Without this, a client could rewrite the `email` mirror or
-- the `created_at` audit value on their own row.
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, company, avatar_url, preferences)
  on public.profiles to authenticated;

-- --- orders ----------------------------------------------------------------

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select
  using (auth.uid() = user_id);

-- Two clauses, and the second one is the point.
--
--   auth.uid() = user_id      you may only create orders for yourself
--   stage = 'brief_received'  every order starts at the beginning
--
-- Without the second clause, locking down UPDATE below buys nothing: a client
-- would simply INSERT an order that is already marked 'delivered'.
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  with check (auth.uid() = user_id and stage = 'brief_received');

-- DELIBERATELY NO UPDATE OR DELETE POLICY FOR CLIENTS.
--
-- The reflexive policy people write here is:
--     for all using (auth.uid() = user_id)
-- which would let a client mark their own order 'delivered' and walk off with
-- free work. Advancing an order is staff-only. Staff do it through the Supabase
-- dashboard, which uses the service_role key and bypasses RLS entirely, so they
-- are unaffected by the absence of these policies.
--
-- Revoking the privileges as well means the request fails at the permission
-- layer rather than silently matching zero rows, which is a much clearer error.
revoke update, delete on public.orders from anon, authenticated;

-- ===========================================================================
-- Verifying the policies
-- ===========================================================================
-- Sign in as two different users in two browsers and confirm:
--   1. Each sees only their own orders.
--   2. Neither can open the other's order by pasting its id into the URL.
--   3. Neither can change an order's stage.
-- The end-to-end suite asserts all three at the application level.
-- ===========================================================================
