-- Add the RDC national identification number used on supplier invoices.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS idnat text;