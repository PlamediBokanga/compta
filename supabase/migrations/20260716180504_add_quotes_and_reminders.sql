/*
# Add quotes + reminders support

1. Modified Tables
- `invoices` — add `is_quote` (boolean, default false) to support quotes (devis), and `reminder_count` (int, default 0), `last_reminder_at` (timestamptz) to track automatic payment reminders.

2. Security
- No new tables. RLS already enabled on `invoices`. Existing owner-scoped policies cover the new columns automatically (no policy changes needed).

3. Important Notes
1. `is_quote = true` marks a row as a quote (devis) rather than an invoice. Quotes can be converted to invoices by flipping `is_quote` to false and setting `status = 'draft'`.
2. `reminder_count` tracks how many automatic reminders have been sent for overdue invoices.
3. `last_reminder_at` records the timestamp of the most recent reminder.
4. The frontend computes overdue status from `due_date`; reminders are triggered client-side when the user visits the invoices page (simulating a scheduled job).
*/

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS is_quote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- Backfill defaults for existing rows
UPDATE invoices SET is_quote = false WHERE is_quote IS NULL;
UPDATE invoices SET reminder_count = 0 WHERE reminder_count IS NULL;
