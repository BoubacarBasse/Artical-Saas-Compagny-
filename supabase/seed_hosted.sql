-- ===========================================================================
-- Hosted demo seed — attach sample orders to a real account
-- ===========================================================================
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor) against a
-- hosted project, once, for an account that already exists.
--
-- HOW THIS DIFFERS FROM seed.sql, AND WHY BOTH EXIST
--
-- `seed.sql` is local-only and unsafe anywhere else: it writes a user into
-- auth.users with a known password. This file creates no users at all. It
-- looks up an account you already signed up for through the app and hangs
-- thirteen sample orders off it, so the dashboard chart, the pagination and
-- the status filters all have something real to work on.
--
-- It is a testing convenience, not product data. Delete it whenever you like —
-- the cleanup statement is at the bottom of this file.
--
-- SET YOUR EMAIL ON THE NEXT LINE.
-- ===========================================================================

\set target_email 'you@example.com'

-- Resolve the account, and fail loudly rather than silently seeding nothing.
create temporary table seed_user as
select id from auth.users where email = :'target_email';

do $$
begin
  if not exists (select 1 from seed_user) then
    raise exception
      'No account found for that email. Sign up through the app first, then re-run this.';
  end if;
  if exists (select 1 from public.orders where user_id = (select id from seed_user)) then
    raise exception
      'That account already has orders. Run the cleanup at the bottom of this file first, or seed a different account.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Order specs
-- ---------------------------------------------------------------------------
-- Copied from supabase/seed.sql so hosted looks like `npm run dev` does. The
-- orders and their timelines are both derived from this table, which is what
-- stops an order showing a timeline that contradicts its own badge.

create temporary table seed_spec (
  slug            text primary key,
  title           text,
  brief           text,
  keywords        text[],
  format          public.order_format,
  word_count      integer,
  priority        public.order_priority,
  status          public.order_status,
  assignees       jsonb,
  created_days_ago    integer,
  deadline_in_days     integer,
  completed_days_ago   integer,
  deliverable_filename text
);

insert into seed_spec values
  ('1012', 'Why your onboarding email sequence is too long',
   'Opinionated take with a clear argument. Growth and lifecycle marketers. Include one worked example of a five-email sequence cut to three.',
   array['onboarding','lifecycle email'], 'blog_post', 900, 'medium', 'completed',
   '[{"name":"Mara Lindqvist","avatarUrl":null}]', 186, -172, 174, 'Onboarding_Sequence_Final.docx'),

  ('1013', 'A buyer''s guide to headless CMS platforms',
   'Comparison piece covering four platforms. Neutral tone, no vendor favouritism. Table of trade-offs at the end.',
   array['headless cms','buyers guide'], 'whitepaper', 2600, 'high', 'completed',
   '[{"name":"Theo Abara","avatarUrl":null},{"name":"Inés Cabrera","avatarUrl":null}]', 158, -140, 143, 'Headless_CMS_Buyers_Guide.docx'),

  ('1014', '10 ways small teams can cut cloud spend',
   'Practical, tactics-first listicle aimed at engineering leads at companies under 50 people. Cite real pricing where possible. Friendly but not jokey.',
   array['cloud cost','finops'], 'blog_post', 1200, 'medium', 'completed',
   '[{"name":"Mara Lindqvist","avatarUrl":null}]', 149, -136, 138, 'Cloud_Spend_Listicle.docx'),

  ('1015', 'Migrating a twelve-year-old Rails monolith',
   'Long-form narrative piece. Interview notes supplied separately. Technical audience, so do not over-explain the basics.',
   array['rails','migration','legacy code'], 'case_study', 2400, 'high', 'completed',
   '[{"name":"Theo Abara","avatarUrl":null}]', 121, -104, 107, 'Rails_Monolith_Case_Study.docx'),

  ('1016', 'Q2 customer newsletter',
   'Quarterly roundup for the existing customer list. Three product notes, one customer story, one short essay.',
   array['newsletter'], 'newsletter', 800, 'low', 'completed',
   '[{"name":"Ruth Mbeki","avatarUrl":null}]', 112, -98, 101, 'Q2_Newsletter.docx'),

  ('1017', 'What developer-first actually means',
   'Category-defining essay. Willing to be contrarian. Should read like a point of view, not a feature list.',
   array['developer experience'], 'blog_post', 1500, 'medium', 'cancelled',
   '[]', 96, -78, null, null),

  ('1018', 'Pricing page copy rewrite',
   'Rewrite of the three-tier pricing page. Needs to survive a legal review, so no unqualified superlatives.',
   array['pricing','conversion'], 'landing_page', 600, 'high', 'completed',
   '[{"name":"Inés Cabrera","avatarUrl":null}]', 74, -62, 64, 'Pricing_Page_Copy_v2.docx'),

  ('1019', 'Customer success story: Acme Corp',
   'Case study on Acme Corp''s rollout. Quotes approved by their comms team, attached separately.',
   array['case study','roi'], 'case_study', 1500, 'low', 'completed',
   '[{"name":"Ruth Mbeki","avatarUrl":null},{"name":"Mara Lindqvist","avatarUrl":null}]', 62, -48, 51, 'Customer_Success_Story_Final.docx'),

  ('1020', 'What actually changed in the 2026 accessibility rules',
   'Explainer for product managers who are not lawyers. Lead with what they have to do differently, not with the history of the legislation.',
   array['accessibility','compliance'], 'whitepaper', 1600, 'high', 'completed',
   '[{"name":"Theo Abara","avatarUrl":null}]', 44, -30, 33, 'Accessibility_Rules_2026.docx'),

  ('1021', 'Integrations launch announcement',
   'Launch post for six new integrations. Short, concrete, one paragraph per integration.',
   array['product launch','integrations'], 'blog_post', 1100, 'medium', 'completed',
   '[{"name":"Mara Lindqvist","avatarUrl":null}]', 29, -16, 18, 'Integrations_Launch_Post.docx'),

  ('1022', 'Q3 newsletter',
   'Quarterly roundup. Same shape as Q2. Lead with the integrations launch.',
   array['newsletter'], 'newsletter', 850, 'medium', 'pending_review',
   '[{"name":"Ruth Mbeki","avatarUrl":null}]', 16, 7, null, null),

  ('1023', 'Landing page copy for the developer plan',
   'New landing page for the self-serve developer tier. Draft only so far — still waiting on final pricing.',
   array['landing page','developer plan'], 'landing_page', 700, 'low', 'draft',
   '[]', 6, 22, null, null),

  ('1024', 'SaaS Growth Guide',
   'Comprehensive guide on increasing SaaS retention.',
   array['saas retention','churn rate'], 'whitepaper', 5000, 'high', 'in_progress',
   '[{"name":"Theo Abara","avatarUrl":null},{"name":"Inés Cabrera","avatarUrl":null},{"name":"Mara Lindqvist","avatarUrl":null}]', 4, 19, null, null);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
-- Ids are generated rather than derived from the slug, so this can be run for
-- more than one account without the second run colliding with the first.
--
-- `order_number` is deliberately NOT set here. On a hosted project the sequence
-- is live and may already have issued numbers for orders you created through
-- the app, so the default is left to assign them and stay consistent.

create temporary table seed_ids as
select slug, gen_random_uuid() as id from seed_spec;

insert into public.orders (
  id, user_id, title, brief, keywords, format, word_count,
  deadline, status, priority, assignees, deliverable, created_at, updated_at
)
select
  i.id,
  (select id from seed_user),
  s.title,
  s.brief,
  s.keywords,
  s.format,
  s.word_count,
  case when s.deadline_in_days is null then null
       else (now() + (s.deadline_in_days || ' days')::interval)::date end,
  s.status,
  s.priority,
  s.assignees,
  case when s.status = 'completed' and s.deliverable_filename is not null then
    jsonb_build_object(
      'filename', s.deliverable_filename,
      'path', (select id from seed_user) || '/' || i.id || '/' || s.deliverable_filename,
      'uploadedAt', (now() - (s.completed_days_ago || ' days')::interval)::text
    )
  else null end,
  now() - (s.created_days_ago || ' days')::interval,
  now() - (coalesce(s.completed_days_ago, greatest(0, s.created_days_ago - 2)) || ' days')::interval
from seed_spec s
join seed_ids i using (slug);

-- ---------------------------------------------------------------------------
-- Timeline events
-- ---------------------------------------------------------------------------
-- The `submitted` event is written by the orders_record_submitted trigger on
-- insert above, so it is deliberately absent here — adding it would give every
-- order two opening events.
--
-- These rows are inserted directly rather than produced by the 0002 status
-- triggers, because those fire on UPDATE and these orders are created already
-- at their final status. Same labels either way.

insert into public.order_events (order_id, kind, label, created_at)
select i.id, e.kind, e.label, now() - (e.days_ago || ' days')::interval
from seed_spec s
join seed_ids i using (slug)
cross join lateral (
  select 'cancelled'::public.order_event_kind as kind,
         'Order cancelled' as label,
         greatest(0, s.created_days_ago - 8) as days_ago
  where s.status = 'cancelled'

  union all
  select 'status_changed', 'Status changed to in progress',
         greatest(0, s.created_days_ago - 1)
  where s.status in ('in_progress', 'pending_review', 'completed')

  union all
  select 'status_changed', 'Status changed to pending review',
         greatest(0, coalesce(s.completed_days_ago, s.created_days_ago) + 3)
  where s.status in ('pending_review', 'completed')

  union all
  select 'status_changed', 'Status changed to completed', s.completed_days_ago
  where s.status = 'completed'

  union all
  select 'delivered', 'Delivered ' || s.deliverable_filename, s.completed_days_ago
  where s.status = 'completed' and s.deliverable_filename is not null
) e;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
-- Two unread at the top, so the inbox badge has something to show.

insert into public.notifications (user_id, kind, title, order_id, created_at, read_at)
select (select id from seed_user), n.kind, n.title, i.id, n.created_at, n.read_at
from (
  values
    ('1024', 'order_update'::public.notification_kind,
     'Your order ''SaaS Growth Guide'' is now in progress',
     now() - interval '3 days', null::timestamptz),
    ('1022', 'order_update',
     'Order ''Q3 newsletter'' is ready for your review',
     now() - interval '9 days', null),
    ('1021', 'order_complete',
     'Order ''Integrations launch announcement'' marked as complete',
     now() - interval '18 days', now() - interval '17 days'),
    ('1020', 'order_complete',
     'Order ''What actually changed in the 2026 accessibility rules'' marked as complete',
     now() - interval '33 days', now() - interval '32 days')
) as n(slug, kind, title, created_at, read_at)
join seed_ids i using (slug);

insert into public.notifications (user_id, kind, title, order_id, created_at, read_at)
values (
  (select id from seed_user), 'system', 'Welcome to Article Orders', null,
  now() - interval '186 days', now() - interval '186 days'
);

drop table seed_spec;
drop table seed_ids;
drop table seed_user;

-- ===========================================================================
-- Cleanup — removes everything this file inserted, for one account
-- ===========================================================================
-- Deleting the orders cascades to their events and nulls the notification
-- links, so the notifications are removed explicitly first.
--
--   delete from public.notifications
--    where user_id = (select id from auth.users where email = 'you@example.com');
--
--   delete from public.orders
--    where user_id = (select id from auth.users where email = 'you@example.com');
-- ===========================================================================
