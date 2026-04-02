-- ── Sprint 28: Collector Referral System ─────────────────────────────────────

-- Add referral columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_bonus_earned_cents int DEFAULT 0;

-- Generate referral codes for existing profiles
UPDATE profiles SET referral_code = upper(substring(md5(id::text), 1, 8)) WHERE referral_code IS NULL;

-- Trigger to auto-generate referral code on new profile
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS trigger AS $$
BEGIN
  NEW.referral_code := upper(substring(md5(NEW.id::text), 1, 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_referral ON profiles;
CREATE TRIGGER on_profile_created_referral
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION generate_referral_code();

-- Referral events table
CREATE TABLE IF NOT EXISTS referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id),
  referee_id uuid REFERENCES profiles(id),
  event_type text CHECK (event_type IN ('signup', 'first_task', 'tenth_task')),
  bonus_cents int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Process referral bonus function
CREATE OR REPLACE FUNCTION process_referral_bonus(p_referee_id uuid, p_event_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id uuid;
  v_bonus_cents int;
BEGIN
  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = p_referee_id;
  IF v_referrer_id IS NULL THEN RETURN; END IF;

  -- Already processed this event?
  IF EXISTS (
    SELECT 1 FROM referral_events
    WHERE referrer_id = v_referrer_id AND referee_id = p_referee_id AND event_type = p_event_type
  ) THEN RETURN; END IF;

  v_bonus_cents := CASE p_event_type
    WHEN 'signup'     THEN 0     -- no bonus just for signing up
    WHEN 'first_task' THEN 500   -- £5 when referee completes first task
    WHEN 'tenth_task' THEN 1000  -- £10 when referee completes 10th task
    ELSE 0
  END;

  INSERT INTO referral_events (referrer_id, referee_id, event_type, bonus_cents)
  VALUES (v_referrer_id, p_referee_id, p_event_type, v_bonus_cents);

  UPDATE profiles
  SET referral_bonus_earned_cents = referral_bonus_earned_cents + v_bonus_cents
  WHERE id = v_referrer_id;
END;
$$;

-- Trigger to check referral milestones when task is scored
CREATE OR REPLACE FUNCTION check_referral_milestone()
RETURNS trigger AS $$
DECLARE
  v_task_count int;
BEGIN
  IF NEW.status = 'scored' AND OLD.status IS DISTINCT FROM 'scored' THEN
    SELECT COUNT(*) INTO v_task_count
    FROM tasks
    WHERE assigned_to = NEW.assigned_to AND status = 'scored';

    IF v_task_count = 1  THEN PERFORM process_referral_bonus(NEW.assigned_to, 'first_task'); END IF;
    IF v_task_count = 10 THEN PERFORM process_referral_bonus(NEW.assigned_to, 'tenth_task'); END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_scored_referral ON tasks;
CREATE TRIGGER on_task_scored_referral
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION check_referral_milestone();
