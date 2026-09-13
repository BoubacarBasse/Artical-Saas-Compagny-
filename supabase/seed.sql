-- ===========================================================================
-- Local development seed
-- ===========================================================================
-- Runs automatically on `supabase start` and `supabase db reset`. It exists so
-- a fresh local database is not an empty shell: without it you sign in and
-- every screen is an empty state, which tells you nothing about whether the
-- Supabase provider actually works.
--
-- This mirrors src/lib/data/mock/seed.ts exactly — same thirteen orders, same
-- titles, same statuses, same relative dates. That is the point: flipping
-- DATA_SOURCE between `mock` and `supabase` should change where the data comes
-- from and nothing a user can see. If the two ever drift, one of them is lying.
--
-- LOCAL ONLY. This file creates a user with a known password and writes rows as
-- the superuser, bypassing RLS. Never run it against a hosted project.
--
--   Email     demo@example.com
--   Password  demo-password-123
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Demo user
-- ---------------------------------------------------------------------------
-- Written straight into auth.users because there is no HTTP call available
-- from SQL. `email_confirmed_at` is set so the account can sign in immediately;
-- the matching auth.identities row is what GoTrue actually looks up when
-- resolving an email/password login, so an account without one exists but
-- cannot sign in.
--
-- The profiles row is created by the handle_new_user trigger, so it is not
-- inserted here.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-a000-000000000001',
  'authenticated', 'authenticated', 'demo@example.com',
  extensions.crypt('demo-password-123', extensions.gen_salt('bf')),
  now(), now() - interval '186 days', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at,
  created_at, updated_at
)
values (
  gen_random_uuid(),
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000001',
  '{"sub":"00000000-0000-4000-a000-000000000001","email":"demo@example.com","email_verified":true,"phone_verified":false}'::jsonb,
  'email', now(), now() - interval '186 days', now()
)
on conflict (provider_id, provider) do nothing;

update public.profiles
   set full_name = 'Alex Morgan', company = 'Northwind Studio'
 where id = '00000000-0000-4000-a000-000000000001';

-- ---------------------------------------------------------------------------
-- Order specs
-- ---------------------------------------------------------------------------
-- The orders are described once, here, and both the order rows and their
-- timeline events are derived from this table. Generating events from the spec
-- rather than listing them by hand is what stops an order from showing a
-- timeline that contradicts its own badge.

-- Not `on commit drop`: psql runs each statement in its own transaction, which
-- would drop the table the moment it was created. It is dropped explicitly at
-- the end of this file instead.
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
-- Ids are derived from the slug so they are stable across resets and the
-- events below can reference them without a round trip.
--
-- `order_number` is set explicitly here to match the mock, then the sequence is
-- advanced past it so the next real insert does not collide.
--
-- The deliverable `path` points at a file that does not exist in local storage.
-- The row shape is what matters: the detail page asks storage for a signed URL
-- and handles the miss by showing no download link, which is exactly what it
-- should do for an order whose file has not been uploaded yet.

insert into public.orders (
  id, order_number, user_id, title, brief, keywords, format, word_count,
  deadline, status, priority, assignees, deliverable, created_at, updated_at
)
select
  ('00000000-0000-4000-b000-' || lpad(s.slug, 12, '0'))::uuid,
  s.slug::bigint,
  '00000000-0000-4000-a000-000000000001',
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
      'path', '00000000-0000-4000-a000-000000000001/'
              || ('00000000-0000-4000-b000-' || lpad(s.slug, 12, '0'))
              || '/' || s.deliverable_filename,
      'uploadedAt', (now() - (s.completed_days_ago || ' days')::interval)::text
    )
  else null end,
  now() - (s.created_days_ago || ' days')::interval,
  now() - (coalesce(s.completed_days_ago, greatest(0, s.created_days_ago - 2)) || ' days')::interval
from seed_spec s
on conflict (id) do nothing;

select setval('public.order_number_seq', (select max(order_number) from public.orders));

-- ---------------------------------------------------------------------------
-- Timeline events
-- ---------------------------------------------------------------------------
-- The `submitted` event for each order is written by the orders_record_submitted
-- trigger on insert above, so it is deliberately absent here — adding it would
-- give every order two opening events.
--
-- The rules below are the SQL twin of seedEvents() in the mock: cancelled and
-- draft orders stop early, everything else walks in progress -> pending review
-- -> completed, stopping at whatever the order's actual status is.

insert into public.order_events (order_id, kind, label, created_at)
select
  ('00000000-0000-4000-b000-' || lpad(s.slug, 12, '0'))::uuid,
  e.kind,
  e.label,
  now() - (e.days_ago || ' days')::interval
from seed_spec s
cross join lateral (
  -- cancelled: one closing event and nothing else
  select 'cancelled'::public.order_event_kind as kind,
         'Order cancelled' as label,
         greatest(0, s.created_days_ago - 8) as days_ago
  where s.status = 'cancelled'

  union all
  -- everything that ever started being written
  select 'status_changed', 'Status changed to in progress',
         greatest(0, s.created_days_ago - 1)
  where s.status in ('in_progress', 'pending_review', 'completed')

  union all
  -- reached review
  select 'status_changed', 'Status changed to pending review',
         greatest(0, coalesce(s.completed_days_ago, s.created_days_ago) + 3)
  where s.status in ('pending_review', 'completed')

  union all
  -- finished
  select 'status_changed', 'Status changed to completed', s.completed_days_ago
  where s.status = 'completed'

  union all
  -- the file landing is its own event: this is what the dashboard chart counts
  select 'delivered', 'Delivered ' || s.deliverable_filename, s.completed_days_ago
  where s.status = 'completed' and s.deliverable_filename is not null
) e;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
-- Two unread at the top, matching the mock so the inbox badge reads the same in
-- both modes.

insert into public.notifications (user_id, kind, title, order_id, created_at, read_at)
values
  ('00000000-0000-4000-a000-000000000001', 'order_update',
   'Your order ''SaaS Growth Guide'' is now in progress',
   '00000000-0000-4000-b000-000000001024', now() - interval '3 days', null),

  ('00000000-0000-4000-a000-000000000001', 'order_update',
   'Order ''Q3 newsletter'' is ready for your review',
   '00000000-0000-4000-b000-000000001022', now() - interval '9 days', null),

  ('00000000-0000-4000-a000-000000000001', 'order_complete',
   'Order ''Integrations launch announcement'' marked as complete',
   '00000000-0000-4000-b000-000000001021', now() - interval '18 days', now() - interval '17 days'),

  ('00000000-0000-4000-a000-000000000001', 'order_complete',
   'Order ''What actually changed in the 2026 accessibility rules'' marked as complete',
   '00000000-0000-4000-b000-000000001020', now() - interval '33 days', now() - interval '32 days'),

  ('00000000-0000-4000-a000-000000000001', 'system',
   'Welcome to Article Orders', null,
   now() - interval '186 days', now() - interval '186 days');

drop table seed_spec;
