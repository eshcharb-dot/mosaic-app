-- invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('enterprise_admin','analyst','viewer')),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  invited_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '7 days'
);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Org admins can see and manage their org's invitations
CREATE POLICY "invitations_org_admin" ON public.invitations
  FOR ALL USING (
    org_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'enterprise_admin'
    )
  );

-- Anyone can read an invitation by token (for the accept flow)
CREATE POLICY "invitations_read_by_token" ON public.invitations
  FOR SELECT USING (true);
