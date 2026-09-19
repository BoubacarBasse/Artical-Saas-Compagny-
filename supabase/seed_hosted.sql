-- Hosted demo seed. Attaches 13 sample orders to an account that already
-- exists. Creates no users. Paste the whole file into the Supabase SQL editor
-- and change only the email below. The result row says SEEDED OK, NO ACCOUNT
-- or ALREADY SEEDED; the last two insert nothing. Undo with cleanup_hosted.sql.
--
-- One statement, and no apostrophes in these comments. Both rules are load
-- bearing and both are enforced by tests/unit/seed-sql.spec.ts. context.md
-- explains what went wrong twice to make them necessary.

with

me as (
  select id from auth.users
   where email = 'you@example.com'
),

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

ids as materialized (
  select slug, gen_random_uuid() as id from spec
),

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

ins_welcome as (
  insert into public.notifications (user_id, kind, title, order_id, created_at, read_at)
  select me.id, 'system', 'Welcome to Article Orders', null,
         now() - interval '186 days', now() - interval '186 days'
  from me
  where exists (select 1 from ins_orders)
  returning 1
)

select
  case
    when not exists (select 1 from me)
      then 'NO ACCOUNT. Nothing was inserted. No user has that email. Sign up through the app first, or fix the email line near the top.'
    when not exists (select 1 from ins_orders)
      then 'ALREADY SEEDED. Nothing was inserted. That account already has orders. Run cleanup_hosted.sql first if you want to reseed.'
    else 'SEEDED OK'
  end                                             as result,
  (select count(*) from ins_orders)               as orders,
  (select count(*) from ins_events)               as timeline_events,
  (select count(*) from ins_notifications)
    + (select count(*) from ins_welcome)          as notifications;
