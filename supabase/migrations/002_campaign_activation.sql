-- ============================================================
-- MOSAIC v1.0 — Campaign Activation & Stats Functions
-- ============================================================

-- ============================================================
-- activate_campaign(campaign_id uuid)
-- Transitions a campaign to 'active' and creates open tasks
-- for every campaign_store linked to it.
-- Returns: count of tasks created.
-- ============================================================
create or replace function public.activate_campaign(p_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout_cents     integer;
  v_tasks_created    integer := 0;
  v_campaign_store   record;
begin
  -- Lock & fetch the campaign row
  select collector_payout_cents
  into   v_payout_cents
  from   public.campaigns
  where  id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign % not found', p_campaign_id;
  end if;

  -- Transition status
  update public.campaigns
  set    status = 'active',
         updated_at = now()
  where  id = p_campaign_id;

  -- Create one open task per campaign_store
  for v_campaign_store in
    select id as cs_id, store_id
    from   public.campaign_stores
    where  campaign_id = p_campaign_id
  loop
    insert into public.tasks (
      campaign_id,
      campaign_store_id,
      store_id,
      status,
      payout_cents,
      expires_at
    ) values (
      p_campaign_id,
      v_campaign_store.cs_id,
      v_campaign_store.store_id,
      'open',
      v_payout_cents,
      now() + interval '7 days'
    );

    v_tasks_created := v_tasks_created + 1;
  end loop;

  return v_tasks_created;
end;
$$;

-- ============================================================
-- get_campaign_stats(campaign_id uuid)
-- Returns aggregate compliance stats for a campaign.
-- ============================================================
-- Guard against duplicate type on re-run
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'campaign_stats' and n.nspname = 'public'
  ) then
    create type public.campaign_stats as (
      total_stores         integer,
      compliant_stores     integer,
      non_compliant_stores integer,
      pending_stores       integer,
      compliance_score     numeric
    );
  end if;
end;
$$;

create or replace function public.get_campaign_stats(p_campaign_id uuid)
returns public.campaign_stats
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_stats public.campaign_stats;
begin
  select
    count(*)                                                              as total_stores,
    count(*) filter (where status = 'compliant')                         as compliant_stores,
    count(*) filter (where status = 'non_compliant')                     as non_compliant_stores,
    count(*) filter (where status in ('pending', 'assigned', 'submitted', 'flagged')) as pending_stores,
    coalesce(
      round(
        (count(*) filter (where status = 'compliant'))::numeric /
        nullif(count(*) filter (where status in ('compliant', 'non_compliant')), 0) * 100,
        2
      ),
      0
    )                                                                     as compliance_score
  into v_stats
  from public.campaign_stores
  where campaign_id = p_campaign_id;

  return v_stats;
end;
$$;

-- Grant execute to authenticated users (RLS on underlying tables
-- already controls data visibility)
grant execute on function public.activate_campaign(uuid)    to authenticated;
grant execute on function public.get_campaign_stats(uuid)   to authenticated;
