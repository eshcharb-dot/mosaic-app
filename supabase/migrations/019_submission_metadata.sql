-- Add metadata column to submissions if it doesn't exist
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS location_verified boolean DEFAULT false;

-- Index for location-verified filter
CREATE INDEX IF NOT EXISTS idx_submissions_location_verified ON submissions(location_verified);

-- Update the metadata from location_verified column helper
CREATE OR REPLACE FUNCTION get_submission_quality_stats(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'location_verified', SUM(CASE WHEN location_verified THEN 1 ELSE 0 END),
      'location_verified_pct', ROUND(100.0 * SUM(CASE WHEN location_verified THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1),
      'avg_score', ROUND(AVG(cr.overall_score)::numeric, 1)
    )
    FROM submissions s
    JOIN tasks t ON t.id = s.task_id
    LEFT JOIN compliance_results cr ON cr.submission_id = s.id
    WHERE t.campaign_id = p_campaign_id
  );
END;
$$;
