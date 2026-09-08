-- Store the supplier email displayed on invoice headers.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text;