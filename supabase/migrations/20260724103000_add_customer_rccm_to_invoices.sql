/*
# Add customer RCCM to invoices

Stores the customer's RCCM directly on each invoice so printed and archived
documents keep the legal client identification used at issuance time.
*/

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS customer_rccm text;
