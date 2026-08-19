/*
# API keys and webhooks tables

1. New Tables
- `api_keys` — stores user-generated API keys for programmatic access.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, defaults to auth.uid())
  - `name` (text, not null) — label for the key
  - `key_prefix` (text, not null) — first 8 chars of the key for identification
  - `key_hash` (text, not null) — SHA-256 hash of the full key
  - `last_used_at` (timestamptz, nullable)
  - `created_at` (timestamptz, default now())
  - `revoked` (boolean, default false)

- `webhooks` — stores webhook endpoint configurations.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, defaults to auth.uid())
  - `url` (text, not null) — endpoint URL
  - `events` (text[], not null) — list of event types to subscribe to
  - `secret` (text, nullable) — signing secret for payload verification
  - `active` (boolean, default true)
  - `created_at` (timestamptz, default now())

2. Security
- RLS enabled on both tables.
- Owner-scoped CRUD: users can only see/manage their own API keys and webhooks.
- `user_id` defaults to `auth.uid()`.
- API keys are stored as SHA-256 hashes — the full key is only shown once at creation time.

3. Important Notes
1. API keys are generated client-side and stored as hashes. The full key is never persisted.
2. Webhook events include: invoice.created, invoice.paid, declaration.ready, transaction.imported.
3. This is a PME-tier feature — the frontend gates access based on the user's plan.
*/

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id, revoked);

DROP POLICY IF EXISTS "select_own_api_keys" ON api_keys;
CREATE POLICY "select_own_api_keys" ON api_keys FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_api_keys" ON api_keys;
CREATE POLICY "insert_own_api_keys" ON api_keys FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_api_keys" ON api_keys;
CREATE POLICY "update_own_api_keys" ON api_keys FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_api_keys" ON api_keys;
CREATE POLICY "delete_own_api_keys" ON api_keys FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id, active);

DROP POLICY IF EXISTS "select_own_webhooks" ON webhooks;
CREATE POLICY "select_own_webhooks" ON webhooks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_webhooks" ON webhooks;
CREATE POLICY "insert_own_webhooks" ON webhooks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_webhooks" ON webhooks;
CREATE POLICY "update_own_webhooks" ON webhooks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_webhooks" ON webhooks;
CREATE POLICY "delete_own_webhooks" ON webhooks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
