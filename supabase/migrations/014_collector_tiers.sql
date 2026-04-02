-- ============================================================
-- Migration 014: Collector tier system
-- Tiers: bronze / silver / gold / elite
-- Unlocked by task count + avg score thresholds.
-- Triggers auto-promotion when a task is set to 'scored'.
-- ============================================================

-- Tier definitions (static lookup)
CREATE TABLE IF NOT EXISTS collector_tiers (
  id text PRIMARY KEY,  -- 'bronze', 'silver', 'gold', 'elite'
  name text NOT NULL,
  min_tasks int NOT NULL,
  min_avg_score numeric NOT NULL,
  payout_multiplier numeric NOT NULL DEFAULT 1.0,
  badge_color text NOT NULL,
  description text
);

INSERT INTO collector_tiers (id, name, min_tasks, min_avg_score, payout_multiplier, badge_color, description) VALUES
  ('bronze', 'Bronze', 0,   0,  1.0,  '#cd7f32', 'Just getting started'),
  ('silver', 'Silver', 10,  70, 1.1,  '#c0c0c0', 'Proven reliability — 10% bonus'),
  ('gold',   'Gold',   50,  80, 1.25, '#ffd700', 'Top performer — 25% bonus'),
  ('elite',  'Elite',  200, 90, 1.5,  '#7c6df5', 'Best in class — 50% bonus')
ON CONFLICT DO NOTHING;

-- Add tier columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS collector_tier text DEFAULT 'bronze' REFERENCES collector_tiers(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_updated_at timestamptz DEFAULT now();

-- ----------------------------------------------------------
-- Function: update_collector_tier
-- Recalculates and persists the correct tier for a collector.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_collector_tier(p_collector_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tasks int;
  v_avg_score numeric;
  v_new_tier text;
BEGIN
  SELECT COUNT(*), ROUND(AVG(cr.score), 1)
  INTO v_tasks, v_avg_score
  FROM tasks t
  LEFT JOIN submissions s ON s.task_id = t.id
  LEFT JOIN compliance_results cr ON cr.submission_id = s.id
  WHERE t.assigned_to = p_collector_id AND t.status = 'scored';

  SELECT id INTO v_new_tier
  FROM collector_tiers
  WHERE min_tasks <= v_tasks AND min_avg_score <= COALESCE(v_avg_score, 0)
  ORDER BY min_tasks DESC, min_avg_score DESC
  LIMIT 1;

  UPDATE profiles SET collector_tier = v_new_tier, tier_updated_at = now()
  WHERE id = p_collector_id;

  RETURN v_new_tier;
END;
$$;

-- ----------------------------------------------------------
-- Trigger: fire update_collector_tier on task scored
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_update_tier()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'scored' AND (OLD.status IS DISTINCT FROM 'scored') THEN
    PERFORM update_collector_tier(NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_scored ON tasks;
CREATE TRIGGER on_task_scored AFTER UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION trigger_update_tier();

-- ----------------------------------------------------------
-- Function: get_tier_distribution
-- Returns collector counts per tier for a given org.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_tier_distribution(p_org_id uuid)
RETURNS TABLE(tier text, tier_name text, count bigint, badge_color text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.collector_tier, ct.name, COUNT(DISTINCT p.id), ct.badge_color
  FROM profiles p
  JOIN collector_tiers ct ON ct.id = p.collector_tier
  JOIN tasks t ON t.assigned_to = p.id
  JOIN campaigns c ON c.id = t.campaign_id
  WHERE c.organization_id = p_org_id
  GROUP BY p.collector_tier, ct.name, ct.badge_color
  ORDER BY ct.min_tasks DESC;
END;
$$;
