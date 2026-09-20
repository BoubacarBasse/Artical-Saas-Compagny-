-- ===========================================================================
-- Does Row Level Security actually hold?
-- ===========================================================================
-- Paste this whole file into the Supabase SQL editor and run it.
--
-- IT ALWAYS ENDS IN AN ERROR, AND THAT IS THE PASS.
-- The editor will show `ERROR: P0001` followed by the report. Read the report,
-- not the word ERROR. `P0001` carrying RLS CHECK PASSED is the success case.
-- The block ends in `raise exception` on purpose: the abort is what rolls back
-- every statement inside it, and is therefore what guarantees this file cannot
-- change your data even if a check goes wrong halfway through.
--
-- First run: hosted project, 20 Sep 2026, 12 of 12 checks passed.
--
-- WHY IMPERSONATION RATHER THAN TWO REAL BROWSERS
-- RLS reads auth.uid() out of request.jwt.claims and applies to the
-- `authenticated` role. Setting both is exactly what the Data API does for a
-- signed-in user, so a policy that holds here holds for a real second account.
--
-- WHY EVERY CHECK SWITCHES ROLE FIRST
-- The SQL editor connects as `postgres`, which owns these tables and is exempt
-- from RLS. Run any of these queries without the switch and it returns every
-- row in the project and proves nothing at all.
-- ===========================================================================

do $$
declare
  owner_id    uuid;
  stranger_id uuid := '00000000-0000-0000-0000-000000000000';
  owner_jwt   text;
  stranger_jwt text;
  expected    bigint;
  seen        bigint;
  failures    int  := 0;
  report      text := '';
  r           record;
begin
  -- The account with the most orders is the one worth trying to steal from.
  select user_id into owner_id
  from public.orders
  group by user_id
  order by count(*) desc
  limit 1;

  if owner_id is null then
    raise exception 'No orders in this project, so there is nothing to protect. Seed first.';
  end if;

  select count(*) into expected from public.orders where user_id = owner_id;

  owner_jwt    := json_build_object('sub', owner_id,    'role', 'authenticated')::text;
  stranger_jwt := json_build_object('sub', stranger_id, 'role', 'authenticated')::text;

  -- -------------------------------------------------------------------------
  -- Positive control.
  -- -------------------------------------------------------------------------
  -- Without this every check below could pass by RLS denying absolutely
  -- everything, which would be a broken app rather than a secure one.
  perform set_config('request.jwt.claims', owner_jwt, true);
  set local role authenticated;
  select count(*) into seen from public.orders;
  reset role;

  if seen = expected then
    report := report || format(E'  ok       the owner still sees their own %s orders\n', expected);
  else
    failures := failures + 1;
    report := report || format(E'  BROKEN   the owner sees %s of their own %s orders\n', seen, expected);
  end if;

  -- -------------------------------------------------------------------------
  -- Can a different signed-in identity read any of it?
  -- -------------------------------------------------------------------------
  for r in
    select * from (values
      ('orders',        'select count(*) from public.orders'),
      ('order history', 'select count(*) from public.order_events'),
      ('notifications', 'select count(*) from public.notifications'),
      ('profiles',      'select count(*) from public.profiles')
    ) as t(what, q)
  loop
    perform set_config('request.jwt.claims', stranger_jwt, true);
    set local role authenticated;
    execute r.q into seen;
    reset role;

    if seen = 0 then
      report := report || format(E'  ok       a stranger sees no %s\n', r.what);
    else
      failures := failures + 1;
      report := report || format(E'  LEAK     a stranger sees %s row(s) of %s\n', seen, r.what);
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- Can the owner write the fields that are supposed to be staff-only?
  -- -------------------------------------------------------------------------
  -- Only `insufficient_privilege` is caught. Any other error propagates, so a
  -- mistake in a check below fails loudly instead of counting as a pass.
  for r in
    select * from (values
      ('mark their own order completed',
       'update public.orders set status = ''completed'''),
      ('raise their own priority',
       'update public.orders set priority = ''high'''),
      ('delete an order',
       'delete from public.orders'),
      ('open an order that is already completed',
       'insert into public.orders (user_id, title, brief, format, word_count, status)
        values (auth.uid(), ''Injected'', ''Ten chars.'', ''blog_post'', 500, ''completed'')'),
      ('write their own history',
       'insert into public.order_events (order_id, kind, label)
        select id, ''delivered'', ''Injected'' from public.orders limit 1'),
      ('invent a notification',
       'insert into public.notifications (user_id, kind, title)
        values (auth.uid(), ''system'', ''Injected'')'),
      ('rewrite the email on their profile',
       'update public.profiles set email = ''attacker@example.com''')
    ) as t(what, q)
  loop
    begin
      perform set_config('request.jwt.claims', owner_jwt, true);
      set local role authenticated;
      execute r.q;
      reset role;

      failures := failures + 1;
      report := report || format(E'  ALLOWED  a client CAN %s\n', r.what);
    exception
      when insufficient_privilege then
        reset role;
        report := report || format(E'  ok       refused: %s\n', r.what);
    end;
  end loop;

  -- -------------------------------------------------------------------------
  if failures = 0 then
    raise exception E'\nRLS CHECK PASSED. Nothing was written.\n\n%', report;
  else
    raise exception E'\nRLS CHECK FAILED -- % problem(s). Nothing was written.\n\n%',
      failures, report;
  end if;
end
$$;
