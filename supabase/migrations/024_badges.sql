-- Badge definitions
CREATE TABLE IF NOT EXISTS badge_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL, -- emoji
  category text NOT NULL, -- 'milestone', 'streak', 'quality', 'speed'
  requirement_type text NOT NULL, -- 'task_count', 'streak_days', 'avg_score', 'earnings'
  requirement_value integer NOT NULL,
  tier text NOT NULL DEFAULT 'bronze' -- bronze, silver, gold, platinum
);

-- Collector earned badges
CREATE TABLE IF NOT EXISTS collector_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES badge_definitions(id),
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(collector_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_collector_badges_collector ON collector_badges(collector_id);

ALTER TABLE collector_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collectors can view their own badges" ON collector_badges
  FOR SELECT USING (collector_id = auth.uid());
CREATE POLICY "Service role can insert badges" ON collector_badges
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read badge definitions" ON badge_definitions FOR SELECT USING (true);

-- Seed badge definitions
INSERT INTO badge_definitions (id, name, description, icon, category, requirement_type, requirement_value, tier) VALUES
  ('first_task', 'First Step', 'Complete your first task', '👣', 'milestone', 'task_count', 1, 'bronze'),
  ('tasks_10', 'Getting Started', 'Complete 10 tasks', '🌱', 'milestone', 'task_count', 10, 'bronze'),
  ('tasks_50', 'Field Agent', 'Complete 50 tasks', '🎖️', 'milestone', 'task_count', 50, 'silver'),
  ('tasks_100', 'Century Club', 'Complete 100 tasks', '💯', 'milestone', 'task_count', 100, 'silver'),
  ('tasks_500', 'Elite Collector', 'Complete 500 tasks', '⭐', 'milestone', 'task_count', 500, 'gold'),
  ('tasks_1000', 'Legend', 'Complete 1000 tasks', '👑', 'milestone', 'task_count', 1000, 'platinum'),
  ('quality_80', 'Quality Eye', 'Maintain 80%+ average compliance score', '👁️', 'quality', 'avg_score', 80, 'bronze'),
  ('quality_90', 'Precision Pro', 'Maintain 90%+ average compliance score', '🎯', 'quality', 'avg_score', 90, 'silver'),
  ('quality_95', 'Perfection', 'Maintain 95%+ average compliance score', '💎', 'quality', 'avg_score', 95, 'gold'),
  ('earnings_100', 'First Payout', 'Earn £100 total', '💰', 'milestone', 'earnings', 10000, 'bronze'),
  ('earnings_500', 'Money Maker', 'Earn £500 total', '🤑', 'milestone', 'earnings', 50000, 'silver'),
  ('earnings_1000', 'Grand', 'Earn £1000 total', '🏆', 'milestone', 'earnings', 100000, 'gold')
ON CONFLICT (id) DO NOTHING;

-- Function to get collector badges with definitions
CREATE OR REPLACE FUNCTION get_collector_badges(p_collector_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'badge_id', bd.id,
        'name', bd.name,
        'description', bd.description,
        'icon', bd.icon,
        'category', bd.category,
        'tier', bd.tier,
        'earned', (cb.id IS NOT NULL),
        'earned_at', cb.earned_at
      )
      ORDER BY bd.tier DESC, bd.requirement_value ASC
    )
    FROM badge_definitions bd
    LEFT JOIN collector_badges cb ON cb.badge_id = bd.id AND cb.collector_id = p_collector_id
  );
END;
$$;
