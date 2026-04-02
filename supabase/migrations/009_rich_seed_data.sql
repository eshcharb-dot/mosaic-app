-- ============================================================
-- 009_rich_seed_data.sql  — Sprint 5 rich demo seed data
-- ============================================================

-- ── 1. Second organisation ───────────────────────────────────
INSERT INTO organizations (id, name, slug, plan, created_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'BeverageCo International',
  'beverageco',
  'enterprise',
  now()
)
ON CONFLICT DO NOTHING;

-- ── 2. Second campaign for Meridian Foods Ltd. ───────────────
-- org id: 98b31c04-bf59-421e-b332-14c6cc41484c
INSERT INTO campaigns (
  id, organization_id, name, product_sku, product_name,
  instructions, brief, status,
  price_per_task_cents, collector_payout_cents,
  sla_minutes, starts_at, ends_at, created_at, updated_at
)
VALUES (
  'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4',
  '98b31c04-bf59-421e-b332-14c6cc41484c',
  'Premium Crisps Range — Autumn 2026',
  'CRISPS-PREM-MIX',
  'Premium Crisps 4-Variant Range',
  'Visit the crisps aisle and photograph the full shelf bay. Ensure all 4 variants are present: Sea Salt, Mature Cheddar, Smoky Paprika, and Balsamic Vinegar. Check price tags and flag any out-of-stock gaps.',
  'Verify shelf placement: all 4 crisp variants present, price tags correct, no gaps in display',
  'active',
  1500, 1200,
  120,
  '2026-09-01 00:00:00+00',
  '2026-11-30 23:59:59+00',
  now(), now()
)
ON CONFLICT DO NOTHING;

-- ── 3. Ten new stores across different London areas ──────────
-- Using Meridian Foods org for these stores (they will be linked to the Crisps campaign)
INSERT INTO stores (id, organization_id, external_id, name, address, city, country, postcode, lat, lng, retailer, created_at)
VALUES
  ('11111111-aaaa-bbbb-cccc-100000000001', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-CW-001',  'Tesco Metro — Canary Wharf',   '20 Churchill Place, Canary Wharf',  'London', 'GB', 'E14 5HJ', 51.5055, -0.0235, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000002', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-GW-001',  'Tesco Express — Greenwich',     '11 Greenwich High Rd',              'London', 'GB', 'SE10 8LF', 51.4769, -0.0005, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000003', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-BX-001',  'Tesco Metro — Brixton',         '23 Brixton Rd',                     'London', 'GB', 'SW9 6BJ', 51.4613, -0.1156, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000004', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-HM-001',  'Tesco Express — Hammersmith',   '84 King Street, Hammersmith',       'London', 'GB', 'W6 0QW', 51.4927, -0.2242, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000005', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-IS-001',  'Tesco Metro — Islington',       '3 Liverpool Rd, Islington',         'London', 'GB', 'N1 0RW', 51.5362, -0.1027, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000006', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-HK-001',  'Tesco Express — Hackney',       '55 Mare Street, Hackney',           'London', 'GB', 'E8 4RG', 51.5450, -0.0553, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000007', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-PE-001',  'Tesco Metro — Peckham',         '1 Peckham Rye, Peckham',            'London', 'GB', 'SE15 4JR', 51.4740, -0.0690, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000008', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-EA-001',  'Tesco Express — Ealing',        '32 The Broadway, Ealing',           'London', 'GB', 'W5 2ND', 51.5133, -0.3047, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000009', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-ST-001',  'Tesco Metro — Stratford',       '2 Stratford Place, Stratford',      'London', 'GB', 'E20 1EJ', 51.5416,  0.0040, 'Tesco', now()),
  ('11111111-aaaa-bbbb-cccc-100000000010', '98b31c04-bf59-421e-b332-14c6cc41484c', 'TES-CP-001',  'Tesco Express — Crystal Palace','45 Westow St, Crystal Palace',      'London', 'GB', 'SE19 3RW', 51.4155, -0.0733, 'Tesco', now())
ON CONFLICT DO NOTHING;

-- ── 4. Campaign_stores: link 10 new stores → Premium Crisps ──
INSERT INTO campaign_stores (id, campaign_id, store_id, status)
VALUES
  ('22222222-aaaa-bbbb-cccc-200000000001', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000001', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000002', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000002', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000003', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000003', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000004', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000004', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000005', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000005', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000006', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000006', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000007', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000007', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000008', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000008', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000009', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000009', 'pending'),
  ('22222222-aaaa-bbbb-cccc-200000000010', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '11111111-aaaa-bbbb-cccc-100000000010', 'pending')
ON CONFLICT DO NOTHING;

-- ── 5. Tasks for Premium Crisps campaign (£15 = 1500 cents) ──
INSERT INTO tasks (id, campaign_id, campaign_store_id, store_id, status, payout_cents, expires_at, created_at)
VALUES
  ('33333333-aaaa-bbbb-cccc-300000000001', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000001', '11111111-aaaa-bbbb-cccc-100000000001', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000002', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000002', '11111111-aaaa-bbbb-cccc-100000000002', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000003', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000003', '11111111-aaaa-bbbb-cccc-100000000003', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000004', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000004', '11111111-aaaa-bbbb-cccc-100000000004', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000005', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000005', '11111111-aaaa-bbbb-cccc-100000000005', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000006', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000006', '11111111-aaaa-bbbb-cccc-100000000006', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000007', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000007', '11111111-aaaa-bbbb-cccc-100000000007', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000008', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000008', '11111111-aaaa-bbbb-cccc-100000000008', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000009', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000009', '11111111-aaaa-bbbb-cccc-100000000009', 'open', 1500, '2026-11-30 23:59:59+00', now()),
  ('33333333-aaaa-bbbb-cccc-300000000010', 'c9d8e7f6-a5b4-c3d2-e1f0-a9b8c7d6e5f4', '22222222-aaaa-bbbb-cccc-200000000010', '11111111-aaaa-bbbb-cccc-100000000010', 'open', 1500, '2026-11-30 23:59:59+00', now())
ON CONFLICT DO NOTHING;

-- ── 6. Synthetic submissions for 8 of the original Oat+ tasks ─
-- Task IDs (Oat+ campaign, original 10 stores), taking first 8:
--   task 1: 8e3acf7f  store: 7decb62a  cs: b9441842  score: 92
--   task 2: 41760e8d  store: 0bae2132  cs: bb491231  score: 88
--   task 3: 466ea571  store: c162faad  cs: e0f1a154  score: 76
--   task 4: e4008216  store: 2693ad87  cs: ca7c32e3  score: 71
--   task 5: aaafe9b1  store: e2746745  cs: 20da80c2  score: 65
--   task 6: 06294a62  store: 7ac525de  cs: 786377a0  score: 58
--   task 7: b54a37f0  store: 31b5a579  cs: 81c3a3ac  score: 89
--   task 8: 1f23a7ea  store: 6c2f8e7c  cs: 1381f0c7  score: 94

INSERT INTO submissions (id, task_id, campaign_id, store_id, photo_urls, thumbnail_url, notes, lat, lng, status, submitted_at, reviewed_at)
VALUES
  (
    '44444444-aaaa-bbbb-cccc-400000000001',
    '8e3acf7f-0b98-4f92-a64a-0739b47f38bb',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '7decb62a-1a74-425a-b627-52d097ce4666',
    ARRAY['https://picsum.photos/seed/8e3acf7f/800/600'],
    'https://picsum.photos/seed/8e3acf7f/400/300',
    'All 6 facings present, price labels correct, shelf fully stocked.',
    51.5050, -0.0192,
    'approved',
    now() - interval '5 days',
    now() - interval '4 days'
  ),
  (
    '44444444-aaaa-bbbb-cccc-400000000002',
    '41760e8d-1656-4bfe-bb96-2cb32cae1ece',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '0bae2132-7c97-4002-b06f-36095972e5de',
    ARRAY['https://picsum.photos/seed/41760e8d/800/600'],
    'https://picsum.photos/seed/41760e8d/400/300',
    'Shelf fully stocked, minor label misalignment on 1L SKU.',
    51.5074, -0.0878,
    'approved',
    now() - interval '6 days',
    now() - interval '5 days'
  ),
  (
    '44444444-aaaa-bbbb-cccc-400000000003',
    '466ea571-283c-42d4-b895-0a307d45ed88',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    'c162faad-cc97-4208-8fee-9283e94b6794',
    ARRAY['https://picsum.photos/seed/466ea571/800/600'],
    'https://picsum.photos/seed/466ea571/400/300',
    'Secondary display found but primary shelf has one gap on right side.',
    51.4952, -0.1441,
    'approved',
    now() - interval '4 days',
    now() - interval '3 days'
  ),
  (
    '44444444-aaaa-bbbb-cccc-400000000004',
    'e4008216-4ad1-4d00-8217-b7abc3bad29b',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '2693ad87-064e-4dcf-9530-056b999a7b03',
    ARRAY['https://picsum.photos/seed/e4008216/800/600'],
    'https://picsum.photos/seed/e4008216/400/300',
    'Product present but positioned below eye level. Two facings missing.',
    51.5227, -0.0769,
    'approved',
    now() - interval '3 days',
    now() - interval '2 days'
  ),
  (
    '44444444-aaaa-bbbb-cccc-400000000005',
    'aaafe9b1-34f9-4815-bb0e-dcfcad912ce5',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    'e2746745-b4f8-4c83-b644-fca3b38cd613',
    ARRAY['https://picsum.photos/seed/aaafe9b1/800/600'],
    'https://picsum.photos/seed/aaafe9b1/400/300',
    'Shelf partially restocked, competitor product encroaching on allocated bay.',
    51.5224, -0.1570,
    'approved',
    now() - interval '7 days',
    now() - interval '6 days'
  ),
  (
    '44444444-aaaa-bbbb-cccc-400000000006',
    '06294a62-3598-478d-98fd-2cef0debae90',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '7ac525de-15bc-40b1-b790-be2ba18b7f80',
    ARRAY['https://picsum.photos/seed/06294a62/800/600'],
    'https://picsum.photos/seed/06294a62/400/300',
    'Out of stock on 1L SKU, no price label visible, stock in back warehouse.',
    51.5362, -0.1027,
    'approved',
    now() - interval '2 days',
    now() - interval '1 day'
  ),
  (
    '44444444-aaaa-bbbb-cccc-400000000007',
    'b54a37f0-602c-466a-b193-bb3de41fe396',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '31b5a579-e9fa-46e0-ba40-1f745950b66a',
    ARRAY['https://picsum.photos/seed/b54a37f0/800/600'],
    'https://picsum.photos/seed/b54a37f0/400/300',
    'Excellent display, end-cap present, planogram fully complied with.',
    51.4627, -0.1680,
    'approved',
    now() - interval '8 days',
    now() - interval '7 days'
  ),
  (
    '44444444-aaaa-bbbb-cccc-400000000008',
    '1f23a7ea-bb10-4a94-8f54-832faac3edec',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '6c2f8e7c-7ba4-44e3-8033-d6bc6e89971a',
    ARRAY['https://picsum.photos/seed/1f23a7ea/800/600'],
    'https://picsum.photos/seed/1f23a7ea/400/300',
    'Perfect shelf execution, extra facing added vs planogram, great visibility.',
    51.5450, -0.0553,
    'approved',
    now() - interval '9 days',
    now() - interval '8 days'
  )
ON CONFLICT DO NOTHING;

-- ── 7. Compliance results for the 8 submissions ──────────────
INSERT INTO compliance_results (
  id, submission_id, campaign_store_id, campaign_id, store_id,
  score, is_compliant, findings, summary,
  ai_model, ai_cost_cents, scorer, scored_at, processed_at
)
VALUES
  (
    '55555555-aaaa-bbbb-cccc-500000000001',
    '44444444-aaaa-bbbb-cccc-400000000001',
    'b9441842-4e4d-430d-87ed-bf6f262e98cd',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '7decb62a-1a74-425a-b627-52d097ce4666',
    92, true,
    '["All 6 facings fully stocked", "Price label accurate and correctly positioned", "Shelf clean with no gaps detected"]',
    'Shelf is fully compliant with excellent stock levels and accurate pricing.',
    'gpt-4o', 3, 'ai', now() - interval '4 days', now() - interval '4 days'
  ),
  (
    '55555555-aaaa-bbbb-cccc-500000000002',
    '44444444-aaaa-bbbb-cccc-400000000002',
    'bb491231-b4dc-4d02-9441-2df109a17126',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '0bae2132-7c97-4002-b06f-36095972e5de',
    88, true,
    '["Product fully stocked across all facings", "Minor label misalignment on 1L variant", "No competitor encroachment detected"]',
    'Shelf mostly compliant with minor labelling issue on the 1L SKU.',
    'gpt-4o', 3, 'ai', now() - interval '5 days', now() - interval '5 days'
  ),
  (
    '55555555-aaaa-bbbb-cccc-500000000003',
    '44444444-aaaa-bbbb-cccc-400000000003',
    'e0f1a154-83ff-4e9a-aaaf-b2cdbde45701',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    'c162faad-cc97-4208-8fee-9283e94b6794',
    76, true,
    '["Secondary display present and well-stocked", "One facing gap on right end of primary shelf", "Price labels visible and correct"]',
    'Shelf is broadly compliant but has a single facing gap requiring attention.',
    'gpt-4o', 3, 'ai', now() - interval '3 days', now() - interval '3 days'
  ),
  (
    '55555555-aaaa-bbbb-cccc-500000000004',
    '44444444-aaaa-bbbb-cccc-400000000004',
    'ca7c32e3-1ca2-4fa0-9533-05cad8dfdca4',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '2693ad87-064e-4dcf-9530-056b999a7b03',
    71, true,
    '["Product present but positioned below eye-level", "Two facings missing from planogram allocation", "Correct pricing displayed"]',
    'Shelf is marginally compliant — position and missing facings need correction.',
    'gpt-4o', 3, 'ai', now() - interval '2 days', now() - interval '2 days'
  ),
  (
    '55555555-aaaa-bbbb-cccc-500000000005',
    '44444444-aaaa-bbbb-cccc-400000000005',
    '20da80c2-25ff-4fe8-9ace-8bbaa77c4b44',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    'e2746745-b4f8-4c83-b644-fca3b38cd613',
    65, false,
    '["Competitor product occupying allocated shelf space", "Only partial restock completed", "One price label missing entirely"]',
    'Shelf is non-compliant due to competitor encroachment and incomplete restocking.',
    'gpt-4o', 3, 'ai', now() - interval '6 days', now() - interval '6 days'
  ),
  (
    '55555555-aaaa-bbbb-cccc-500000000006',
    '44444444-aaaa-bbbb-cccc-400000000006',
    '786377a0-c47e-4817-afb3-56e6ee3132d3',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '7ac525de-15bc-40b1-b790-be2ba18b7f80',
    58, false,
    '["1L SKU completely out of stock", "No price label visible on shelf edge", "Planogram compliance severely impacted"]',
    'Shelf fails compliance check — key SKU out of stock and labelling absent.',
    'gpt-4o', 3, 'ai', now() - interval '1 day', now() - interval '1 day'
  ),
  (
    '55555555-aaaa-bbbb-cccc-500000000007',
    '44444444-aaaa-bbbb-cccc-400000000007',
    '81c3a3ac-4a00-48e4-bc4d-fc18df3e1dcc',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '31b5a579-e9fa-46e0-ba40-1f745950b66a',
    89, true,
    '["End-cap display fully stocked and correctly branded", "All planogram facings present", "Price labels accurate across all SKUs"]',
    'Excellent shelf execution with end-cap display fully meeting planogram requirements.',
    'gpt-4o', 3, 'ai', now() - interval '7 days', now() - interval '7 days'
  ),
  (
    '55555555-aaaa-bbbb-cccc-500000000008',
    '44444444-aaaa-bbbb-cccc-400000000008',
    '1381f0c7-86a6-4d62-be06-14ae22bc85b6',
    '6154f4f6-d157-41fc-9d6f-e9a39c4fac2c',
    '6c2f8e7c-7ba4-44e3-8033-d6bc6e89971a',
    94, true,
    '["Extra facing added beyond planogram spec", "Perfect product visibility at eye level", "Zero gaps and all labels correct"]',
    'Outstanding compliance — shelf exceeds planogram standards with superior visibility.',
    'gpt-4o', 3, 'ai', now() - interval '8 days', now() - interval '8 days'
  )
ON CONFLICT DO NOTHING;

-- ── 8. Update the 8 scored tasks to status = 'scored' ────────
UPDATE tasks SET status = 'scored', completed_at = now() - interval '4 days'
WHERE id IN (
  '8e3acf7f-0b98-4f92-a64a-0739b47f38bb',
  '41760e8d-1656-4bfe-bb96-2cb32cae1ece',
  '466ea571-283c-42d4-b895-0a307d45ed88',
  'e4008216-4ad1-4d00-8217-b7abc3bad29b',
  'aaafe9b1-34f9-4815-bb0e-dcfcad912ce5',
  '06294a62-3598-478d-98fd-2cef0debae90',
  'b54a37f0-602c-466a-b193-bb3de41fe396',
  '1f23a7ea-bb10-4a94-8f54-832faac3edec'
);
