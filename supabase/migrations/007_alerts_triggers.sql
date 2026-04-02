-- ============================================================
-- Migration 007: Auto-insert alert_events on non-compliant result
-- Adapted for actual schema:
--   alert_events: has triggered_at (not created_at)
--   alert_events: has store_id column
--   compliance_results: has campaign_id, store_id, summary directly
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_compliance_alert()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_compliant = false THEN
    INSERT INTO alert_events (alert_id, store_id, payload, triggered_at)
    SELECT
      a.id,
      NEW.store_id,
      jsonb_build_object(
        'submission_id', NEW.submission_id,
        'score',         NEW.score,
        'summary',       NEW.summary,
        'campaign_id',   NEW.campaign_id,
        'store_id',      NEW.store_id
      ),
      now()
    FROM alerts a
    WHERE a.campaign_id = NEW.campaign_id
      AND a.is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_compliance_result_inserted ON compliance_results;
CREATE TRIGGER on_compliance_result_inserted
  AFTER INSERT ON compliance_results
  FOR EACH ROW EXECUTE FUNCTION trigger_compliance_alert();
