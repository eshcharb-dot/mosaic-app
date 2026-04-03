CREATE TABLE IF NOT EXISTS campaign_templates (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL UNIQUE,
  description          text,
  default_brief        text,
  default_price_cents  integer NOT NULL DEFAULT 1000,
  compliance_rules     jsonb NOT NULL DEFAULT '[]'::jsonb,
  category             text,
  icon                 text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates
CREATE POLICY "templates_select" ON campaign_templates
  FOR SELECT TO authenticated USING (true);
