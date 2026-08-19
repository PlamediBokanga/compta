/*
# RDC compliance fields for profile and normalized invoices

Adds the minimum metadata needed to align the product with RDC normalized invoicing,
DGI device tracking and SYSCOHADA-oriented company identification.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS rccm text,
  ADD COLUMN IF NOT EXISTS tax_center text,
  ADD COLUMN IF NOT EXISTS def_device_id text,
  ADD COLUMN IF NOT EXISTS accounting_standard text DEFAULT 'SYSCOHADA',
  ADD COLUMN IF NOT EXISTS invoice_series text DEFAULT 'FN',
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'RDC';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS normalization_status text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS normalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS other_taxes_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS non_taxable_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS normalized_qr_payload text;
