-- ===========================================================================
-- Hosted demo cleanup -- removes everything seed_hosted.sql inserted
-- ===========================================================================
-- Paste this whole file into the Supabase SQL editor and change exactly one
-- thing: the email address a few lines down. It must be the same address you
-- seeded with.
--
-- This removes the demo orders, their timelines and their notifications for
-- one account. It does not touch the account itself, so you stay signed in and
-- can re-run seed_hosted.sql straight afterwards.
--
-- Like the seed, this is one statement, from a single `with` to a single
-- semicolon at the end, and its comments contain no apostrophes. Both rules
-- exist because the hosted SQL editor splits a script client-side before
-- sending it, and both of this projects earlier seed failures were that
-- splitter disagreeing with Postgres about where a statement ends. See the
-- header of seed_hosted.sql and tests/unit/seed-sql.spec.ts.
--
-- Deleting an order cascades to its order_events rows, so those need no
-- clause of their own. The notifications go first because they point at the
-- orders.
-- ===========================================================================

with

me as (
  select id from auth.users
--                        vvv  YOUR EMAIL HERE, and nowhere else  vvv
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
      then 'NO ACCOUNT -- nothing was deleted. No user has that email.'
    when not exists (select 1 from del_orders)
         and not exists (select 1 from del_notifications)
      then 'NOTHING TO DELETE -- that account had no demo data.'
    else 'CLEANED'
  end                                           as result,
  (select count(*) from del_orders)             as orders_deleted,
  (select count(*) from del_notifications)      as notifications_deleted;
