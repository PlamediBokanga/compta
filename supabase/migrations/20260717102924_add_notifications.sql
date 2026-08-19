/*
# Notifications table for in-app notification center

1. New Tables
- `notifications` — stores in-app notifications for each user.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, defaults to auth.uid())
  - `type` (text: info, success, warning, danger) — visual tone
  - `title` (text, not null)
  - `message` (text, nullable)
  - `link` (text, nullable) — optional internal route to navigate to
  - `read` (boolean, default false)
  - `created_at` (timestamptz, default now())

2. Security
- RLS enabled on `notifications`.
- Owner-scoped CRUD: users can only see/manage their own notifications.
- `user_id` defaults to `auth.uid()` so client inserts that omit the owner still succeed.

3. Important Notes
1. Notifications are created by the frontend (e.g. when invoices become overdue, declarations are due).
2. The bell icon in the dashboard header shows unread count and opens a dropdown.
3. Notifications can link to internal routes (e.g. /app/invoices) for quick navigation.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'danger')),
  title text NOT NULL,
  message text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
