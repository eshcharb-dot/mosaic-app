CREATE TABLE IF NOT EXISTS digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  subject text,
  html_body text,
  text_body text,
  period_start timestamptz,
  period_end timestamptz,
  stats jsonb,
  generated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  recipient_emails text[]
);

CREATE INDEX IF NOT EXISTS digests_org_id_idx ON digests(org_id);
CREATE INDEX IF NOT EXISTS digests_generated_at_idx ON digests(generated_at DESC);

ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read own digests"
  ON digests FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org members can insert digests"
  ON digests FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
