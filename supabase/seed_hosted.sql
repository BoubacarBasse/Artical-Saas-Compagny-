-- ===========================================================================
-- Hosted demo seed — attach sample orders to a real account
-- ===========================================================================
-- Paste this whole file into the Supabase SQL editor (Dashboard -> SQL Editor)
-- and change exactly one thing: the email address a few lines down.
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
-- WHY THIS IS ONE ENORMOUS STATEMENT
--
-- The first version was ordinary readable SQL: a temporary table for the
-- account, another for the spec rows, a DO block to fail loudly on a bad
-- email, then three inserts. It worked perfectly against Postgres 16 and
-- failed against the hosted SQL editor with `relation "seed_user" does not
-- exist`.
--
-- What makes that failure worth reading about: every individual piece of it
-- was proven to work on hosted. A temporary table created and then selected
-- from — fine. A DO block reading a temporary table — fine. The entire first
-- half of this file, up to and including the thirteen spec rows — fine, and
-- it reported the right counts. Only the whole thing together failed, and it
-- failed identically when the temporary tables were made permanent, which
-- rules out temp-table scope as the cause. The editor rolls the batch back,
-- so the post-mortem shows nothing.
--
-- Rather than keep guessing at how the editor chunks a script, this version
-- removes the thing it can chunk. Everything below is a single statement:
-- one `with`, one semicolon, at the very end. The account lookup, the spec
-- rows, and all three inserts are CTEs of that one statement. There is no
-- state to carry between statements, because there is only one statement, so
-- it cannot matter how the editor splits things.
--
-- The cost is that a `do` block cannot live inside a statement, so the loud
-- guards are gone. In their place the final line reports what happened —
-- read it. `NO ACCOUNT` and `ALREADY SEEDED` both insert nothing.
-- ===========================================================================

with

-- ---------------------------------------------------------------------------
-- The account
-- ---------------------------------------------------------------------------
me as (
  select id from auth.users
--                        vvv  YOUR EMAIL HERE, and nowhere else  vvv
   where email = 'you@example.com'
),

-- ---------------------------------------------------------------------------
-- Order specs
-- ---------------------------------------------------------------------------
-- Copied from supabase/seed.sql so hosted looks like `npm run dev` does. The
-- orders and their timelines are both derived from these rows, which is what
-- stops an order showing a timeline that contradicts its own badge.
spec (slug, title, brief, keywords, format, word_count, priority, status,
      assignees, created_days_ago, deadline_in_days, completed_days_ago,
      deliverable_filename) as (
  values
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
     '[{"name":"Theo Abara","avatarUrl":null},{"name":"Inés Cabrera","avatarUrl":null},{"name":"Mara Lindqvist","avatarUrl":null}]', 4, 19, null, null)
  
),

-- Ids are generated up front because `deliverable.path` embeds the order id,
-- so it has to be known before the insert rather than read back from it.
-- `materialized` stops the planner inlining the CTE and re-rolling the uuids.
ids as materialized (
  select slug, gen_random_uuid() as id from spec
),

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
-- `order_number` is deliberately NOT set. On a hosted project the sequence is
-- live and may already have issued numbers for orders created through the app,
-- so the default is left to assign them and stay consistent.
--
-- The `not exists` is the re-run guard that used to be a DO block: the
-- statement's snapshot is taken before any of it runs, so this sees orders
-- that were already there and not the ones being inserted right now.
ins_orders as (
  insert into public.orders (
    id, user_id, title, brief, keywords, format, word_count,
    deadline, status, priority, assignees, deliverable, created_at, updated_at
  )
  select
    i.id,
    me.id,
    s.title,
    s.brief,
    s.keywords,
    s.format::public.order_format,
    s.word_count,
    case when s.deadline_in_days is null then null
         else (now() + (s.deadline_in_days || ' days')::interval)::date end,
    s.status::public.order_status,
    s.priority::public.order_priority,
    s.assignees::jsonb,
    case when s.status = 'completed' and s.deliverable_filename is not null then
      jsonb_build_object(
        'filename', s.deliverable_filename,
        'path', me.id || '/' || i.id || '/' || s.deliverable_filename,
        'uploadedAt', (now() - (s.completed_days_ago || ' days')::interval)::text
      )
    else null end,
    now() - (s.created_days_ago || ' days')::interval,
    now() - (coalesce(s.completed_days_ago, greatest(0, s.created_days_ago - 2)) || ' days')::interval
  from spec s
  join ids i using (slug)
  cross join me
  where not exists (select 1 from public.orders o where o.user_id = me.id)
  returning id, title
),

-- ---------------------------------------------------------------------------
-- Timeline events
-- ---------------------------------------------------------------------------
-- The `submitted` event is written by the orders_record_submitted trigger on
-- the insert above, so it is deliberately absent here — adding it would give
-- every order two opening events. That trigger is an AFTER ROW trigger, so it
-- fires once the whole statement completes, which is why these rows can be
-- written in the same statement without colliding with it.
--
-- These are inserted directly rather than produced by the 0002 status
-- triggers, because those fire on UPDATE and these orders are created already
-- at their final status. Same labels either way.
ins_events as (
  insert into public.order_events (order_id, kind, label, created_at)
  select o.id, e.kind, e.label, now() - (e.days_ago || ' days')::interval
  from spec s
  join ins_orders o on o.title = s.title
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
  ) e
  returning 1
),

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
-- Two unread at the top, so the inbox badge has something to show. These join
-- back to the orders by title rather than by a shared scratch table, which is
-- what lets the whole thing be one statement.
ins_notifications as (
  insert into public.notifications (user_id, kind, title, order_id, created_at, read_at)
  select me.id, n.kind::public.notification_kind, n.title, o.id, n.created_at, n.read_at
  from (
    values
      ('SaaS Growth Guide', 'order_update',
       'Your order ''SaaS Growth Guide'' is now in progress',
       now() - interval '3 days', null::timestamptz),
      ('Q3 newsletter', 'order_update',
       'Order ''Q3 newsletter'' is ready for your review',
       now() - interval '9 days', null),
      ('Integrations launch announcement', 'order_complete',
       'Order ''Integrations launch announcement'' marked as complete',
       now() - interval '18 days', now() - interval '17 days'),
      ('What actually changed in the 2026 accessibility rules', 'order_complete',
       'Order ''What actually changed in the 2026 accessibility rules'' marked as complete',
       now() - interval '33 days', now() - interval '32 days')
  ) as n(order_title, kind, title, created_at, read_at)
  join ins_orders o on o.title = n.order_title
  cross join me
  returning 1
),

-- Account-level, so it hangs off no order. Only written if the seed actually
-- ran, so a re-run or a bad email does not leave a stray welcome message.
ins_welcome as (
  insert into public.notifications (user_id, kind, title, order_id, created_at, read_at)
  select me.id, 'system', 'Welcome to Article Orders', null,
         now() - interval '186 days', now() - interval '186 days'
  from me
  where exists (select 1 from ins_orders)
  returning 1
)

-- ---------------------------------------------------------------------------
-- What happened. Read this line.
-- ---------------------------------------------------------------------------
select
  case
    when not exists (select 1 from me)
      then 'NO ACCOUNT — nothing was inserted. No user has that email. Sign up through the app first, or fix the email line above.'
    when not exists (select 1 from ins_orders)
      then 'ALREADY SEEDED — nothing was inserted. That account already has orders. Run the cleanup at the bottom of this file first.'
    else 'SEEDED OK'
  end                                             as result,
  (select count(*) from ins_orders)               as orders,
  (select count(*) from ins_events)               as timeline_events,
  (select count(*) from ins_notifications)
    + (select count(*) from ins_welcome)          as notifications;

-- ===========================================================================
-- Cleanup — removes everything this file inserted, for one account
-- ===========================================================================
-- Deleting the orders cascades to their events, so the notifications are
-- removed explicitly first. Run both, in this order.
--
--   delete from public.notifications
--    where user_id = (select id from auth.users where email = 'you@example.com');
--
--   delete from public.orders
--    where user_id = (select id from auth.users where email = 'you@example.com');
-- ===========================================================================
