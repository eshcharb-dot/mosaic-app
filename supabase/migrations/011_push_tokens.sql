-- Migration: 011_push_tokens
-- Adds push notification token storage to collector profiles.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_push_token
  ON profiles(push_token)
  WHERE push_token IS NOT NULL;
