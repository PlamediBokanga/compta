ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS advance_applied_amount numeric(12,2) NOT NULL DEFAULT 0;

UPDATE public.invoices
SET advance_applied_amount = 0
WHERE advance_applied_amount IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_advance_applied_amount ON public.invoices(user_id, advance_applied_amount);
