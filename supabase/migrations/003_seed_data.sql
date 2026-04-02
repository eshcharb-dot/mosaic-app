-- ============================================================
-- MOSAIC v1.0 — Development / Demo Seed Data
-- ============================================================
-- Safe to run multiple times: uses DO blocks with existence
-- checks so it won't duplicate on re-run.
-- ============================================================

do $$
declare
  v_org_id      uuid;
  v_campaign_id uuid;

  -- Store IDs
  v_store_ids   uuid[] := array[]::uuid[];
  v_store_id    uuid;
  v_cs_id       uuid;

  -- Per-store seed data (parallel arrays — same index = same store)
  v_names       text[] := array[
    'Tesco Express — Canary Wharf',
    'Tesco Express — London Bridge',
    'Tesco Metro — Victoria',
    'Tesco Express — Shoreditch',
    'Tesco Metro — Marylebone',
    'Tesco Express — Islington Angel',
    'Tesco Metro — Clapham Junction',
    'Tesco Express — Hackney Central',
    'Tesco Metro — Hammersmith',
    'Tesco Express — Brixton'
  ];

  v_addresses   text[] := array[
    '20 Churchill Place, Canary Wharf',
    '2 London Bridge Walk, London Bridge',
    '125 Victoria Street, Westminster',
    '91 Great Eastern Street, Shoreditch',
    '36 Marylebone High Street, Marylebone',
    '198 Upper Street, Islington',
    '39 St John''s Road, Clapham Junction',
    '197 Mare Street, Hackney',
    '207 King Street, Hammersmith',
    '27 Atlantic Road, Brixton'
  ];

  v_postcodes   text[] := array[
    'E14 5LB', 'SE1 9AD', 'SW1E 5JH', 'EC2A 3JL', 'W1U 4QS',
    'N1 2XH', 'SW11 1TH', 'E8 1HQ', 'W6 9JT', 'SW9 8JH'
  ];

  v_lats        numeric[] := array[
    51.5050, 51.5045, 51.4966, 51.5255, 51.5199,
    51.5342, 51.4618, 51.5459, 51.4929, 51.4619
  ];

  v_lngs        numeric[] := array[
    -0.0196, -0.0865, -0.1428, -0.0795, -0.1536,
    -0.1027, -0.1689, -0.0563, -0.2226, -0.1133
  ];

  i integer;
begin

  -- --------------------------------------------------------
  -- 1. Organization
  -- --------------------------------------------------------
  select id into v_org_id
  from   public.organizations
  where  slug = 'meridian-foods';

  if v_org_id is null then
    insert into public.organizations (name, slug, industry, plan)
    values ('Meridian Foods Ltd.', 'meridian-foods', 'cpg', 'enterprise')
    returning id into v_org_id;
  end if;

  -- --------------------------------------------------------
  -- 2. Campaign
  -- --------------------------------------------------------
  select id into v_campaign_id
  from   public.campaigns
  where  product_sku = 'OAT-001-1L'
    and  organization_id = v_org_id;

  if v_campaign_id is null then
    insert into public.campaigns (
      organization_id,
      name,
      product_sku,
      product_name,
      status,
      sla_minutes,
      price_per_task_cents,
      collector_payout_cents,
      starts_at
    ) values (
      v_org_id,
      'Oat+ 1L — Summer 2026',
      'OAT-001-1L',
      'Oat+ Oat Milk 1L',
      'active',
      30,
      2500,
      1200,
      now()
    )
    returning id into v_campaign_id;
  end if;

  -- --------------------------------------------------------
  -- 3. Stores + campaign_stores + tasks
  -- --------------------------------------------------------
  for i in 1..array_length(v_names, 1) loop

    -- Check whether this store already exists for the org
    select id into v_store_id
    from   public.stores
    where  organization_id = v_org_id
      and  name = v_names[i]
    limit 1;

    if v_store_id is null then
      insert into public.stores (
        organization_id,
        name,
        address,
        city,
        country,
        postcode,
        lat,
        lng,
        location,
        retailer
      ) values (
        v_org_id,
        v_names[i],
        v_addresses[i],
        'London',
        'GB',
        v_postcodes[i],
        v_lats[i],
        v_lngs[i],
        st_point(v_lngs[i], v_lats[i])::geography,
        'Tesco'
      )
      returning id into v_store_id;
    end if;

    v_store_ids := array_append(v_store_ids, v_store_id);

    -- campaign_stores
    select id into v_cs_id
    from   public.campaign_stores
    where  campaign_id = v_campaign_id
      and  store_id    = v_store_id;

    if v_cs_id is null then
      insert into public.campaign_stores (campaign_id, store_id, status)
      values (v_campaign_id, v_store_id, 'pending')
      returning id into v_cs_id;
    end if;

    -- task (one open task per store)
    if not exists (
      select 1 from public.tasks
      where  campaign_store_id = v_cs_id
        and  status = 'open'
    ) then
      insert into public.tasks (
        campaign_id,
        campaign_store_id,
        store_id,
        status,
        payout_cents,
        expires_at
      ) values (
        v_campaign_id,
        v_cs_id,
        v_store_id,
        'open',
        1200,
        now() + interval '7 days'
      );
    end if;

  end loop;

end;
$$;
