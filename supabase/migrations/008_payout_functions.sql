-- ============================================================
-- Migration 008: Payout functions
-- Schema adaptations vs spec:
--   - payouts.amount_cents  (not amount_pence)
--   - tasks.payout_cents    (not payout_amount)
--   - tasks.assigned_to     (not collector_id on tasks)
--   - tasks.completed_at    (used for this_week filter)
--   - profiles.id           (PK, same as auth.users.id)
-- ============================================================

-- Index first (safe to create early)
CREATE INDEX IF NOT EXISTS idx_payouts_collector ON payouts(collector_id);

-- ----------------------------------------------------------
-- Function: get_collector_earnings
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_collector_earnings(p_collector_id uuid)
RETURNS TABLE (
  total_earned       numeric,
  pending_payout     numeric,
  paid_out           numeric,
  completed_tasks    int,
  this_week_earned   numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_earned     numeric;
  v_paid_out         numeric;
  v_pending_payout   numeric;
  v_completed_tasks  int;
  v_this_week_earned numeric;
BEGIN
  -- Total earned: sum of payout_cents for scored tasks assigned to this collector
  SELECT
    COALESCE(SUM(t.payout_cents), 0) / 100.0,
    COUNT(*)
  INTO v_total_earned, v_completed_tasks
  FROM tasks t
  WHERE t.assigned_to = p_collector_id
    AND t.status = 'scored';

  -- Paid out: sum of amount_cents from payouts with status='paid'
  SELECT COALESCE(SUM(py.amount_cents), 0) / 100.0
  INTO v_paid_out
  FROM payouts py
  WHERE py.collector_id = p_collector_id
    AND py.status = 'paid';

  -- Pending = total earned minus already paid
  v_pending_payout := v_total_earned - v_paid_out;

  -- This week earned: scored tasks completed in last 7 days
  SELECT COALESCE(SUM(t.payout_cents), 0) / 100.0
  INTO v_this_week_earned
  FROM tasks t
  WHERE t.assigned_to = p_collector_id
    AND t.status = 'scored'
    AND t.completed_at >= now() - INTERVAL '7 days';

  RETURN QUERY SELECT
    v_total_earned,
    v_pending_payout,
    v_paid_out,
    v_completed_tasks::int,
    v_this_week_earned;
END;
$$;

-- ----------------------------------------------------------
-- Function: get_collector_task_history
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_collector_task_history(
  p_collector_id uuid,
  limit_n        int DEFAULT 20
)
RETURNS TABLE (
  task_id       uuid,
  store_name    text,
  campaign_name text,
  payout_amount numeric,
  status        text,
  submitted_at  timestamptz,
  score         numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id                                          AS task_id,
    st.name                                       AS store_name,
    c.name                                        AS campaign_name,
    (t.payout_cents / 100.0)                      AS payout_amount,
    t.status                                      AS status,
    sub.submitted_at                              AS submitted_at,
    cr.score                                      AS score
  FROM tasks t
  JOIN stores st       ON st.id = t.store_id
  JOIN campaigns c     ON c.id = t.campaign_id
  LEFT JOIN submissions sub
    ON sub.task_id = t.id
    AND sub.collector_id = p_collector_id
  LEFT JOIN LATERAL (
    SELECT cr2.score
    FROM compliance_results cr2
    WHERE cr2.submission_id = sub.id
    ORDER BY cr2.processed_at DESC NULLS LAST, cr2.scored_at DESC NULLS LAST
    LIMIT 1
  ) cr ON true
  WHERE t.assigned_to = p_collector_id
  ORDER BY sub.submitted_at DESC NULLS LAST
  LIMIT limit_n;
END;
$$;

-- ----------------------------------------------------------
-- Function: request_payout
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION request_payout(p_collector_id uuid)
RETURNS TABLE (id uuid, amount_cents int)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_earned  numeric;
  v_paid_out      numeric;
  v_pending       numeric;
  v_payout_cents  int;
  v_payout_id     uuid;
BEGIN
  -- Calculate total earned
  SELECT COALESCE(SUM(t.payout_cents), 0) / 100.0
  INTO v_total_earned
  FROM tasks t
  WHERE t.assigned_to = p_collector_id
    AND t.status = 'scored';

  -- Calculate already paid out
  SELECT COALESCE(SUM(py.amount_cents), 0) / 100.0
  INTO v_paid_out
  FROM payouts py
  WHERE py.collector_id = p_collector_id
    AND py.status = 'paid';

  v_pending := v_total_earned - v_paid_out;

  IF v_pending < 5.00 THEN
    RAISE EXCEPTION 'Minimum payout is £5.00';
  END IF;

  v_payout_cents := FLOOR(v_pending * 100)::int;

  INSERT INTO payouts (collector_id, amount_cents, currency, status, created_at)
  VALUES (p_collector_id, v_payout_cents, 'gbp', 'pending', now())
  RETURNING payouts.id INTO v_payout_id;

  RETURN QUERY SELECT v_payout_id, v_payout_cents;
END;
$$;
