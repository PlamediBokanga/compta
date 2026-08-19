/*
# Team members table for multi-user access and accountant roles

1. New Tables
- `team_members` — links users to the data owners they can access, with a role.
  - `id` (uuid, primary key)
  - `owner_id` (uuid, references auth.users) — the user whose data is shared
  - `member_id` (uuid, references auth.users) — the user who gets access
  - `role` (text: owner, accountant, viewer) — permission level
  - `invited_email` (text, nullable) — email used during invitation
  - `status` (text: pending, active, revoked) — invitation lifecycle
  - `created_at` (timestamptz, default now())

2. Security
- RLS enabled on `team_members`.
- Users can read rows where they are the owner OR the member.
- Only the owner can insert/update/delete (invite, revoke, change role).
- `owner_id` and `member_id` do NOT default to auth.uid() — they are explicit.

3. Important Notes
1. The `owner` role is assigned automatically when a user creates their account (via the frontend).
2. `accountant` role grants read access to the owner's transactions, invoices, documents, declarations.
3. `viewer` role grants read-only access.
4. This migration only creates the team_members table. The RLS policies on existing tables
   (transactions, invoices, etc.) are NOT modified here — they remain owner-scoped via auth.uid().
   Access for team members is handled in the frontend by querying as the owner's perspective.
   A production implementation would need RLS policies that check team_members for shared access.
*/

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'accountant', 'viewer')),
  invited_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_owner_email ON team_members(owner_id, invited_email);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_id, status);

DROP POLICY IF EXISTS "select_own_team_members" ON team_members;
CREATE POLICY "select_own_team_members" ON team_members FOR SELECT
  TO authenticated USING (auth.uid() = owner_id OR auth.uid() = member_id);

DROP POLICY IF EXISTS "insert_own_team_members" ON team_members;
CREATE POLICY "insert_own_team_members" ON team_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_team_members" ON team_members;
CREATE POLICY "update_own_team_members" ON team_members FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_team_members" ON team_members;
CREATE POLICY "delete_own_team_members" ON team_members FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);
