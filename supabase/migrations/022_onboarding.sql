-- Track onboarding completion
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed boolean DEFAULT false;
