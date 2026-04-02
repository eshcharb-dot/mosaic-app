-- ============================================================
-- Migration 006: Dashboard RPC functions + indexes
-- ============================================================

-- Index: compliance_results.scored_at
CREATE INDEX IF NOT EXISTS idx_compliance_results_scored_at
  ON compliance_results(scored_at);

-- Index: alert_events.triggered_at  (actual column name — not created_at)
CREATE INDEX IF NOT EXISTS idx_alert_events_triggered_at
  ON alert_events(triggered_at);

-- Index: stores.location (GIST for geography)
CREATE INDEX IF NOT EXISTS idx_stores_location
  ON stores USING GIST(location);

-- ============================================================
-- 1. get_compliance_trend
--    Returns daily compliance stats for charting.
--    campaign_id = NULL → org-wide across all campaigns for that org.
-- ============================================================
CREATE OR REPLACE FUNCTION get_compliance_trend(
  campaign_id uuid,
  days int DEFAULT 30
)
RETURNS TABLE(
  date        date,
  total       int,
  compliant   int,
  avg_score   numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date(cr.scored_at)          AS date,
    count(*)::int               AS total,
    count(*) FILTER (WHERE cr.is_compliant = true)::int AS compliant,
    round(avg(cr.score), 2)     AS avg_score
  FROM compliance_results cr
  WHERE
    (campaign_id IS NULL OR cr.campaign_id = get_compliance_trend.campaign_id)
    AND cr.scored_at >= now() - (days || ' days')::interval
  GROUP BY date(cr.scored_at)
  ORDER BY date ASC;
$$;

-- ============================================================
-- 2. get_store_map_data
--    Returns all stores for a campaign with latest compliance score.
--    Uses native lat/lng numeric columns (no PostGIS extraction needed).
-- ============================================================
CREATE OR REPLACE FUNCTION get_store_map_data(
  campaign_id uuid
)
RETURNS TABLE(
  store_id          uuid,
  store_name        text,
  lat               numeric,
  lng               numeric,
  latest_score      numeric,
  is_compliant      boolean,
  submission_count  int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_results AS (
    SELECT DISTINCT ON (cr.store_id)
      cr.store_id,
      cr.score,
      cr.is_compliant
    FROM compliance_results cr
    WHERE cr.campaign_id = get_store_map_data.campaign_id
    ORDER BY cr.store_id, cr.scored_at DESC
  ),
  sub_counts AS (
    SELECT
      s.store_id,
      count(*) AS submission_count
    FROM submissions s
    WHERE s.campaign_id = get_store_map_data.campaign_id
    GROUP BY s.store_id
  )
  SELECT
    st.id                             AS store_id,
    st.name                           AS store_name,
    st.lat,
    st.lng,
    lr.score                          AS latest_score,
    lr.is_compliant,
    coalesce(sc.submission_count, 0)::int AS submission_count
  FROM campaign_stores cs
  JOIN stores st ON st.id = cs.store_id
  LEFT JOIN latest_results lr ON lr.store_id = st.id
  LEFT JOIN sub_counts sc ON sc.store_id = st.id
  WHERE cs.campaign_id = get_store_map_data.campaign_id;
$$;

-- ============================================================
-- 3. get_dashboard_summary
--    Aggregate hero-card stats for an org.
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  org_id uuid
)
RETURNS TABLE(
  active_campaigns      int,
  total_stores          int,
  compliant_stores      int,
  pending_submissions   int,
  avg_compliance_score  numeric,
  submissions_today     int,
  submissions_this_week int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH org_campaigns AS (
    SELECT id FROM campaigns
    WHERE organization_id = get_dashboard_summary.org_id
  ),
  active_camps AS (
    SELECT count(*)::int AS cnt
    FROM campaigns
    WHERE organization_id = get_dashboard_summary.org_id
      AND status = 'active'
  ),
  store_stats AS (
    SELECT
      count(DISTINCT cs.store_id)::int AS total_stores,
      count(DISTINCT CASE WHEN cs.status = 'compliant' THEN cs.store_id END)::int AS compliant_stores
    FROM campaign_stores cs
    WHERE cs.campaign_id IN (SELECT id FROM org_campaigns)
  ),
  pending_subs AS (
    SELECT count(*)::int AS cnt
    FROM submissions s
    WHERE s.campaign_id IN (SELECT id FROM org_campaigns)
      AND s.status = 'pending'
  ),
  score_stats AS (
    SELECT round(avg(cr.score), 2) AS avg_score
    FROM compliance_results cr
    WHERE cr.campaign_id IN (SELECT id FROM org_campaigns)
  ),
  today_subs AS (
    SELECT count(*)::int AS cnt
    FROM submissions s
    WHERE s.campaign_id IN (SELECT id FROM org_campaigns)
      AND s.submitted_at >= current_date
  ),
  week_subs AS (
    SELECT count(*)::int AS cnt
    FROM submissions s
    WHERE s.campaign_id IN (SELECT id FROM org_campaigns)
      AND s.submitted_at >= date_trunc('week', now())
  )
  SELECT
    ac.cnt,
    ss.total_stores,
    ss.compliant_stores,
    ps.cnt,
    sc.avg_score,
    ts.cnt,
    ws.cnt
  FROM active_camps ac, store_stats ss, pending_subs ps,
       score_stats sc, today_subs ts, week_subs ws;
$$;

-- ============================================================
-- 4. get_recent_alerts
--    Joins alert_events → alerts → campaigns.
--    Adapts for actual schema:
--      alert_events.triggered_at (not created_at)
--      alerts has trigger_type but no severity — surfaced as severity
-- ============================================================
CREATE OR REPLACE FUNCTION get_recent_alerts(
  org_id   uuid,
  limit_n  int DEFAULT 20
)
RETURNS TABLE(
  alert_id      uuid,
  alert_name    text,
  severity      text,
  payload       jsonb,
  created_at    timestamptz,
  campaign_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ae.alert_id,
    a.name                   AS alert_name,
    a.trigger_type           AS severity,   -- no severity column; trigger_type is the closest
    ae.payload,
    ae.triggered_at          AS created_at, -- actual column name in alert_events
    c.name                   AS campaign_name
  FROM alert_events ae
  JOIN alerts a ON a.id = ae.alert_id
  JOIN campaigns c ON c.id = a.campaign_id
  WHERE c.organization_id = get_recent_alerts.org_id
  ORDER BY ae.triggered_at DESC
  LIMIT limit_n;
$$;
