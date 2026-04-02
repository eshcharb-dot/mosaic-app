-- ============================================================
-- MOSAIC v1.0 — Initial Schema
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- ============================================================
-- ORGANIZATIONS (enterprise customers)
-- ============================================================
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  industry text default 'cpg',
  plan text default 'starter' check (plan in ('starter','growth','enterprise')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PROFILES (extends auth.users for both collectors + enterprise)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('collector','enterprise_admin','enterprise_member','superadmin')),
  full_name text,
  avatar_url text,
  organization_id uuid references public.organizations(id),
  -- Collector-specific
  phone text,
  location_city text,
  stripe_account_id text,
  total_earnings_cents integer default 0,
  tasks_completed integer default 0,
  rating numeric(3,2) default 5.0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- STORES
-- ============================================================
create table public.stores (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  external_id text,                        -- enterprise's own store ID
  name text not null,
  address text not null,
  city text not null,
  country text not null default 'GB',
  postcode text,
  lat numeric(10,7),
  lng numeric(10,7),
  location geography(point, 4326),        -- PostGIS point
  retailer text,                           -- 'Tesco', 'Sainsbury's', etc.
  created_at timestamptz default now()
);

-- Index for geo queries
create index stores_location_idx on public.stores using gist(location);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id),
  name text not null,
  product_sku text not null,
  product_name text not null,
  planogram_url text,                      -- uploaded planogram image
  instructions text,
  sla_minutes integer default 30,
  price_per_task_cents integer default 1450, -- £14.50
  collector_payout_cents integer default 1200, -- £12.00
  status text default 'draft' check (status in ('draft','active','paused','completed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CAMPAIGN STORES (which stores are in each campaign)
-- ============================================================
create table public.campaign_stores (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  status text default 'pending' check (status in ('pending','assigned','submitted','compliant','non_compliant','flagged')),
  compliance_score numeric(5,2),          -- 0-100
  last_checked_at timestamptz,
  unique(campaign_id, store_id)
);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  campaign_store_id uuid references public.campaign_stores(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  status text default 'open' check (status in ('open','assigned','in_progress','submitted','completed','expired','cancelled')),
  payout_cents integer not null,
  assigned_at timestamptz,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Index for geo-matching collectors to nearby open tasks
create index tasks_store_id_idx on public.tasks(store_id);
create index tasks_status_idx on public.tasks(status);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
create table public.submissions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.tasks(id) on delete cascade,
  collector_id uuid references public.profiles(id),
  campaign_id uuid references public.campaigns(id),
  store_id uuid references public.stores(id),
  photo_urls text[] not null default '{}',
  notes text,
  lat numeric(10,7),
  lng numeric(10,7),
  device_info jsonb,
  status text default 'pending_review' check (status in ('pending_review','processing','approved','rejected','flagged')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz
);

-- ============================================================
-- COMPLIANCE RESULTS (AI analysis output)
-- ============================================================
create table public.compliance_results (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid references public.submissions(id) on delete cascade,
  campaign_store_id uuid references public.campaign_stores(id),
  score numeric(5,2) not null,            -- 0-100
  is_compliant boolean not null,
  findings jsonb not null default '{}',   -- {sku_present, eye_level, facing_count, oos, ...}
  ai_model text default 'gpt-4o',
  ai_cost_cents integer,
  raw_response jsonb,
  processed_at timestamptz default now()
);

-- ============================================================
-- PAYOUTS
-- ============================================================
create table public.payouts (
  id uuid primary key default uuid_generate_v4(),
  collector_id uuid references public.profiles(id),
  task_id uuid references public.tasks(id),
  amount_cents integer not null,
  currency text default 'gbp',
  status text default 'pending' check (status in ('pending','processing','paid','failed')),
  stripe_transfer_id text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ALERTS
-- ============================================================
create table public.alerts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in ('oos_threshold','compliance_drop','coverage_low')),
  threshold numeric(5,2),
  webhook_url text,
  slack_webhook text,
  email text,
  is_active boolean default true,
  last_triggered_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- ALERT EVENTS
-- ============================================================
create table public.alert_events (
  id uuid primary key default uuid_generate_v4(),
  alert_id uuid references public.alerts(id) on delete cascade,
  store_id uuid references public.stores(id),
  campaign_store_id uuid references public.campaign_stores(id),
  payload jsonb,
  triggered_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_stores enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.compliance_results enable row level security;
alter table public.payouts enable row level security;
alter table public.alerts enable row level security;

-- Profiles: users see their own
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id);

-- Organizations: members see their org
create policy "orgs_members" on public.organizations
  for select using (
    id in (select organization_id from public.profiles where id = auth.uid())
  );

-- Campaigns: org members see their org's campaigns
create policy "campaigns_org" on public.campaigns
  for all using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

-- Stores: org members see their stores
create policy "stores_org" on public.stores
  for all using (
    organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

-- Tasks: collectors see open tasks + their assigned tasks
create policy "tasks_collector" on public.tasks
  for select using (
    status = 'open' or assigned_to = auth.uid()
  );

-- Submissions: collectors see their own
create policy "submissions_collector" on public.submissions
  for all using (collector_id = auth.uid());

-- Payouts: collectors see their own
create policy "payouts_collector" on public.payouts
  for select using (collector_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'collector'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_organizations before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger set_updated_at_campaigns before update on public.campaigns
  for each row execute function public.set_updated_at();
create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.set_updated_at();
