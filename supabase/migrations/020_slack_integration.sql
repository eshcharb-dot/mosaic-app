-- Slack integration settings per org
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slack_webhook_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slack_enabled boolean DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slack_alert_threshold integer DEFAULT 70;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slack_channel text DEFAULT '#compliance-alerts';

-- Function to check if we should send a slack alert
CREATE OR REPLACE FUNCTION should_send_slack_alert(p_org_id uuid, p_score integer)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_enabled boolean;
  v_threshold integer;
  v_webhook text;
BEGIN
  SELECT slack_enabled, slack_alert_threshold, slack_webhook_url
  INTO v_enabled, v_threshold, v_webhook
  FROM organizations WHERE id = p_org_id;

  RETURN v_enabled AND v_webhook IS NOT NULL AND p_score < v_threshold;
END;
$$;
