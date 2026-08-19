/*
# Add audit logs table

1. New Tables
- `audit_logs` — security audit trail of user actions (sign-in, invoice sent, declaration submitted, settings changed, etc.).
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
  - `action` (text, not null) — e.g. 'signin', 'signout', 'invoice.create', 'invoice.send', 'declaration.submit', 'settings.update', 'document.upload', 'document.match'
  - `entity_type` (text) — optional entity kind (invoice, declaration, document, transaction, profile)
  - `entity_id` (uuid) — optional entity id
  - `metadata` (jsonb) — optional context (ip, user agent, amount, etc.)
  - `created_at` (timestamptz)

2. Security
- RLS enabled on `audit_logs`.
- Owner-scoped SELECT only (users read their own logs).
- INSERT is owner-scoped (user_id defaults to auth.uid()).
- No UPDATE or DELETE policies — audit logs are immutable once written.

3. Important Notes
1. Audit logs are append-only: users cannot modify or delete their own audit trail.
2. The `action` field is a free-form string but the frontend uses a fixed vocabulary for filtering.
3. `metadata` stores arbitrary JSON context (e.g. invoice number, declaration type) without PII beyond what the action already implies.
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(user_id, action);

DROP POLICY IF EXISTS "select_own_audit_logs" ON audit_logs;
CREATE POLICY "select_own_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_audit_logs" ON audit_logs;
CREATE POLICY "insert_own_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
