-- ============================================================
-- Migration 017: SLA tracking tables
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_slas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  min_compliance_score int DEFAULT 70 CHECK (min_compliance_score BETWEEN 0 AND 100),
  audit_frequency_days int DEFAULT 30,    -- how often each store must be audited
  response_time_hours int DEFAULT 24,     -- hours to fix a compliance failure
  target_compliant_pct numeric DEFAULT 90, -- % of stores that must be compliant
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sla_breaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  breach_type text CHECK (breach_type IN ('overdue_audit', 'below_score', 'slow_response', 'compliance_pct')),
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  details jsonb
);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_campaign ON sla_breaches(campaign_id);

-- ============================================================
-- Function: get_sla_status
-- ============================================================
CREATE OR REPLACE FUNCTION get_sla_status(p_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sla campaign_slas%ROWTYPE;
  result jsonb;
BEGIN
  SELECT * INTO v_sla FROM campaign_slas WHERE campaign_id = p_campaign_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'sla', row_to_json(v_sla),
    'overdue_stores', (
      SELECT COUNT(DISTINCT cs.store_id)
      FROM campaign_stores cs
      LEFT JOIN (
        SELECT store_id, MAX(submitted_at) as last_audit
        FROM submissions WHERE campaign_id = p_campaign_id GROUP BY store_id
      ) la ON la.store_id = cs.store_id
      WHERE cs.campaign_id = p_campaign_id
      AND (la.last_audit IS NULL OR la.last_audit < now() - (v_sla.audit_frequency_days || ' days')::interval)
    ),
    'current_compliant_pct', (
      SELECT ROUND(100.0 * SUM(CASE WHEN cr.is_compliant THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT cs.store_id), 0), 1)
      FROM campaign_stores cs
      LEFT JOIN submissions s ON s.store_id = cs.store_id AND s.campaign_id = p_campaign_id
      LEFT JOIN compliance_results cr ON cr.submission_id = s.id
      WHERE cs.campaign_id = p_campaign_id
    ),
    'total_stores', (SELECT COUNT(*) FROM campaign_stores WHERE campaign_id = p_campaign_id),
    'open_breaches', (SELECT COUNT(*) FROM sla_breaches WHERE campaign_id = p_campaign_id AND resolved_at IS NULL),
    'is_meeting_sla', (
      SELECT ROUND(100.0 * SUM(CASE WHEN cr.is_compliant THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT cs.store_id), 0), 1) >= v_sla.target_compliant_pct
      FROM campaign_stores cs
      LEFT JOIN submissions s ON s.store_id = cs.store_id AND s.campaign_id = p_campaign_id
      LEFT JOIN compliance_results cr ON cr.submission_id = s.id
      WHERE cs.campaign_id = p_campaign_id
    )
  ) INTO result;
  RETURN result;
END;
$$;
