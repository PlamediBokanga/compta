/*
  Add invoice business kind and invoice item type for RDC/SYSCOHADA sales flows.
*/

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_kind text NOT NULL DEFAULT 'services';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS advance_source_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_invoice_kind_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_invoice_kind_check CHECK (invoice_kind IN ('goods', 'services', 'advance', 'mixed', 'credit_note'));

UPDATE public.invoices
SET invoice_kind = CASE
  WHEN notes ILIKE '%[[finexa:credit_note_for=%' OR number ILIKE 'AV-%' THEN 'credit_note'
  ELSE 'services'
END
WHERE invoice_kind IS NULL OR invoice_kind = '';

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'service';

ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_item_type_check;

ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_item_type_check CHECK (item_type IN ('product', 'service'));

UPDATE public.invoice_items AS ii
SET item_type = COALESCE(ci.item_type, 'service')
FROM public.catalog_items AS ci
WHERE ii.catalog_item_id = ci.id;

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_kind ON public.invoices(user_id, invoice_kind);
CREATE INDEX IF NOT EXISTS idx_invoices_advance_source_invoice_id ON public.invoices(advance_source_invoice_id);