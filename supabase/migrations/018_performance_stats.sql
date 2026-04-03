-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'ms',
  tags jsonb DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_name_time ON performance_metrics(metric_name, recorded_at DESC);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON performance_metrics FOR ALL USING (auth.role() = 'service_role');

-- Function to get performance summary
CREATE OR REPLACE FUNCTION get_performance_summary()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'submission_count_24h', (
      SELECT COUNT(*) FROM submissions WHERE created_at > now() - interval '24 hours'
    ),
    'submission_count_7d', (
      SELECT COUNT(*) FROM submissions WHERE created_at > now() - interval '7 days'
    ),
    'avg_score_24h', (
      SELECT ROUND(AVG(overall_score)::numeric, 1)
      FROM compliance_results cr
      JOIN submissions s ON s.id = cr.submission_id
      WHERE s.created_at > now() - interval '24 hours'
    ),
    'scored_rate_24h', (
      SELECT ROUND(
        100.0 * COUNT(cr.id) / NULLIF(COUNT(s.id), 0), 1
      )
      FROM submissions s
      LEFT JOIN compliance_results cr ON cr.submission_id = s.id
      WHERE s.created_at > now() - interval '24 hours'
    ),
    'active_collectors', (
      SELECT COUNT(DISTINCT assigned_to) FROM tasks
      WHERE status IN ('assigned', 'submitted', 'scored')
      AND updated_at > now() - interval '24 hours'
    ),
    'pending_tasks', (
      SELECT COUNT(*) FROM tasks WHERE status = 'pending'
    ),
    'webhook_deliveries_24h', (
      SELECT COUNT(*) FROM webhook_deliveries
      WHERE created_at > now() - interval '24 hours'
    ),
    'webhook_success_rate', (
      SELECT ROUND(
        100.0 * SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1
      )
      FROM webhook_deliveries
      WHERE created_at > now() - interval '24 hours'
    ),
    'hourly_submissions', (
      SELECT jsonb_agg(
        jsonb_build_object('hour', hour_bucket, 'count', cnt)
        ORDER BY hour_bucket
      )
      FROM (
        SELECT
          date_trunc('hour', created_at) AS hour_bucket,
          COUNT(*) AS cnt
        FROM submissions
        WHERE created_at > now() - interval '24 hours'
        GROUP BY 1
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;
