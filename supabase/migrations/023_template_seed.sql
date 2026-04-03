-- Add missing columns to campaign_templates
ALTER TABLE campaign_templates
  ADD COLUMN IF NOT EXISTS compliance_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS icon text;

-- Add unique constraint on name so upserts work
ALTER TABLE campaign_templates
  ADD CONSTRAINT campaign_templates_name_key UNIQUE (name);

-- Seed pre-built system templates (org_id NULL = system-wide)
INSERT INTO campaign_templates (name, description, brief, price_per_task_cents, compliance_rules, category, icon)
VALUES
  (
    'Shelf Share Audit',
    'Measure your brand''s share of shelf space vs competitors',
    'Please photograph the full shelf section containing our products. Include both ends of the shelf to show context. Ensure all brand logos and price tags are clearly visible.',
    1200,
    '["Product must occupy ≥25% of shelf space", "Brand logo must be clearly visible", "Price label must be present and readable", "Products must be properly faced forward", "No empty gaps in brand section"]'::jsonb,
    'Retail',
    '📊'
  ),
  (
    'New Product Launch Check',
    'Verify new SKUs are stocked and correctly placed post-launch',
    'Look for our new [PRODUCT NAME] product. Photograph: 1) The shelf where it should be stocked, 2) A close-up of the product label, 3) The full shelf section. If the product is not on shelf, photograph the area where it should be.',
    1500,
    '["New SKU must be on shelf", "Correct shelf position as per planogram", "Price label must match RRP", "Facing must be forward", "Minimum 2 facings required"]'::jsonb,
    'Launch',
    '🚀'
  ),
  (
    'Promotional Display Audit',
    'Verify in-store promotional displays and POS materials',
    'Find and photograph all promotional displays for our brand. Include: floor stands, shelf barkers, window displays, and end caps. Photograph each type separately with a clear view of branding.',
    1800,
    '["Display must match approved artwork", "Brand logo must be clearly visible", "Promotional price must be displayed", "Display must be undamaged and clean", "POS materials must be current (check date code)"]'::jsonb,
    'Promotions',
    '🎯'
  ),
  (
    'Planogram Compliance',
    'Check that products are positioned according to your planogram',
    'Using the planogram provided, verify that all products are in the correct position. Photograph each section of the planogram separately. Note any deviations from the plan.',
    2000,
    '["Products must match planogram positions", "Correct number of facings per SKU", "Shelf heights must match specification", "Blocked or hidden products flagged", "Out-of-stock positions must be photographed"]'::jsonb,
    'Retail',
    '📋'
  ),
  (
    'Refrigeration Audit',
    'For chilled/frozen products — verify placement in refrigerated units',
    'Photograph all refrigerated sections containing our products. Include: full door shot, close-up of our products, temperature display if visible. Check for proper product rotation (FIFO).',
    1600,
    '["Products must be within use-by date", "Refrigerator temperature display must read ≤4°C", "Products must be properly faced and rotated", "No damaged or leaking packaging", "Clear visibility through refrigerator door"]'::jsonb,
    'Chilled',
    '❄️'
  ),
  (
    'Competitor Intelligence',
    'Capture competitor product placement and pricing',
    'Photograph the full category shelf including competitor products. Capture: shelf layout, all visible price tags, any promotional materials from competitors. Be thorough — we need the complete competitive landscape.',
    2200,
    '["Full shelf section must be visible", "All brand logos must be identifiable", "Price tags must be readable", "Promotional materials captured", "Photo must be taken from 1-2m distance for context"]'::jsonb,
    'Research',
    '🔍'
  )
ON CONFLICT (name) DO NOTHING;
