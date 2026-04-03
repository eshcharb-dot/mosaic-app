-- Email notification preferences per profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_digest_frequency text DEFAULT 'weekly' CHECK (email_digest_frequency IN ('daily', 'weekly', 'never'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_alert_threshold integer DEFAULT 70;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_instant_alerts boolean DEFAULT true;

-- Email log table
CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  email_type text NOT NULL, -- 'digest', 'alert', 'invite', 'welcome'
  org_id uuid REFERENCES organizations(id),
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log(recipient_email, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_org ON email_log(org_id, sent_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view their email log" ON email_log
  FOR SELECT USING (
    org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
