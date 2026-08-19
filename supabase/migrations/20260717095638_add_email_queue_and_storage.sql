/*
# Email queue table and storage bucket for documents

1. New Tables
- `email_queue` — stores outgoing emails (invoices, reminders, notifications) before sending.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, defaults to auth.uid())
  - `to_email` (text, not null) — recipient email address
  - `subject` (text, not null)
  - `html_body` (text, not null)
  - `from_name` (text, default 'Tenzo')
  - `status` (text: pending/sent/failed, default 'pending')
  - `sent_at` (timestamptz, nullable)
  - `error_message` (text, nullable)
  - `created_at` (timestamptz, default now())

2. Storage
- Creates a storage bucket `documents` for uploading receipt/invoice files.
- Storage policies are managed via Supabase Storage API (not SQL migrations).

3. Security
- RLS enabled on `email_queue`.
- Owner-scoped CRUD: users can only see/manage their own queued emails.
- `user_id` defaults to `auth.uid()` so client inserts that omit the owner still succeed.

4. Important Notes
1. The `email_queue` table is used by the `send-email` edge function to persist emails before sending.
2. If RESEND_API_KEY is not configured, emails are queued but not sent — the function returns success with `queued: true`.
3. The storage bucket `documents` is created via the Supabase Storage API, not in this SQL migration — this migration only adds the email_queue table.
*/

CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  from_name text NOT NULL DEFAULT 'Tenzo',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_queue(user_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_emails" ON email_queue;
CREATE POLICY "select_own_emails" ON email_queue FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_emails" ON email_queue;
CREATE POLICY "insert_own_emails" ON email_queue FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_emails" ON email_queue;
CREATE POLICY "update_own_emails" ON email_queue FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_emails" ON email_queue;
CREATE POLICY "delete_own_emails" ON email_queue FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
