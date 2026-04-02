-- ============================================================
-- MOSAIC — Sprint 2: Gallery & Scoring Schema Additions
-- ============================================================
-- Safe to run multiple times: all changes use IF NOT EXISTS
-- or column existence checks.
-- ============================================================

-- ------------------------------------------------------------
-- campaigns.brief — compliance criteria description
-- ------------------------------------------------------------
alter table public.campaigns
  add column if not exists brief text;

-- ------------------------------------------------------------
-- submissions.thumbnail_url — resized version (filled later)
-- ------------------------------------------------------------
alter table public.submissions
  add column if not exists thumbnail_url text;

-- ------------------------------------------------------------
-- submissions.status — add 'scored' to the check constraint
-- The original check constraint must be dropped and recreated.
-- ------------------------------------------------------------
do $$
begin
  -- Drop old check constraint if it exists (name from 001_initial_schema)
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'submissions'
      and constraint_type = 'CHECK'
      and constraint_name like '%status%'
  ) then
    execute (
      select 'alter table public.submissions drop constraint ' || quote_ident(constraint_name)
      from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'submissions'
        and constraint_type = 'CHECK'
        and constraint_name like '%status%'
      limit 1
    );
  end if;
end;
$$;

alter table public.submissions
  add constraint submissions_status_check
  check (status in ('pending_review','processing','approved','rejected','flagged','scored'));

-- ------------------------------------------------------------
-- tasks.status — add 'scored' to the check constraint
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'tasks'
      and constraint_type = 'CHECK'
      and constraint_name like '%status%'
  ) then
    execute (
      select 'alter table public.tasks drop constraint ' || quote_ident(constraint_name)
      from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'tasks'
        and constraint_type = 'CHECK'
        and constraint_name like '%status%'
      limit 1
    );
  end if;
end;
$$;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open','assigned','in_progress','submitted','completed','expired','cancelled','scored'));

-- ------------------------------------------------------------
-- compliance_results — add Sprint 2 columns
-- The original table had: id, submission_id, campaign_store_id,
-- score, is_compliant, findings, ai_model, ai_cost_cents,
-- raw_response, processed_at
-- We add: campaign_id, store_id, scorer, scored_at, summary
-- ------------------------------------------------------------
alter table public.compliance_results
  add column if not exists campaign_id uuid references public.campaigns(id);

alter table public.compliance_results
  add column if not exists store_id uuid references public.stores(id);

alter table public.compliance_results
  add column if not exists scorer text default 'gpt-4o';

alter table public.compliance_results
  add column if not exists scored_at timestamptz default now();

alter table public.compliance_results
  add column if not exists summary text;

-- ------------------------------------------------------------
-- alert_events — add payload fields for compliance alerts
-- The edge function writes structured compliance data into
-- alert_events.payload (jsonb). No schema change needed there.
-- But we expose a convenience view for compliance alert events.
-- ------------------------------------------------------------

-- Convenience view: compliance failure alerts
create or replace view public.compliance_alerts as
  select
    ae.id,
    ae.triggered_at,
    ae.store_id,
    (ae.payload->>'campaign_id')::uuid   as campaign_id,
    (ae.payload->>'submission_id')::uuid as submission_id,
    ae.payload->>'type'                  as type,
    ae.payload->>'severity'              as severity,
    ae.payload->>'message'               as message,
    (ae.payload->>'score')::int          as score
  from public.alert_events ae
  where ae.payload->>'type' = 'compliance_fail';

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
create index if not exists idx_compliance_results_campaign
  on public.compliance_results(campaign_id);

create index if not exists idx_submissions_campaign
  on public.submissions(campaign_id);
