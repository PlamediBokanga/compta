/*
# Add customers and catalog items for invoicing

1. New tables
- `customers` stores reusable client records per owner.
- `catalog_items` stores reusable products/services per owner.

2. Invoice linkage
- `invoices.customer_id` references `customers(id)`.
- `invoice_items.catalog_item_id` references `catalog_items(id)`.

3. Currency normalization
- Default invoice currency switches from EUR to CDF.
- Existing invoices still marked as EUR are converted to CDF as a local default alignment.

4. Security
- Owner keeps full CRUD on customers and catalog items.
- Team accountants get read access; viewers stay excluded from these referentials.
*/

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  tax_id text,
  rccm text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_customers_user_name ON public.customers(user_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_user_active ON public.customers(user_id, active);

DROP POLICY IF EXISTS "select_own_customers" ON public.customers;
CREATE POLICY "select_own_customers" ON public.customers FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant'])
  );

DROP POLICY IF EXISTS "insert_own_customers" ON public.customers;
CREATE POLICY "insert_own_customers" ON public.customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_customers" ON public.customers;
CREATE POLICY "update_own_customers" ON public.customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_customers" ON public.customers;
CREATE POLICY "delete_own_customers" ON public.customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sku text,
  item_type text NOT NULL DEFAULT 'service' CHECK (item_type IN ('product', 'service')),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) NOT NULL DEFAULT 16,
  currency text NOT NULL DEFAULT 'CDF' CHECK (currency IN ('CDF', 'USD')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_catalog_items_user_name ON public.catalog_items(user_id, name);
CREATE INDEX IF NOT EXISTS idx_catalog_items_user_active ON public.catalog_items(user_id, active);
CREATE INDEX IF NOT EXISTS idx_catalog_items_user_type ON public.catalog_items(user_id, item_type);

DROP POLICY IF EXISTS "select_own_catalog_items" ON public.catalog_items;
CREATE POLICY "select_own_catalog_items" ON public.catalog_items FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant'])
  );

DROP POLICY IF EXISTS "insert_own_catalog_items" ON public.catalog_items;
CREATE POLICY "insert_own_catalog_items" ON public.catalog_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_catalog_items" ON public.catalog_items;
CREATE POLICY "update_own_catalog_items" ON public.catalog_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_catalog_items" ON public.catalog_items;
CREATE POLICY "delete_own_catalog_items" ON public.catalog_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_catalog_item_id ON public.invoice_items(catalog_item_id);

ALTER TABLE public.invoices
  ALTER COLUMN currency SET DEFAULT 'CDF';

UPDATE public.invoices
SET currency = 'CDF'
WHERE currency IS NULL OR currency = 'EUR';

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_currency_allowed;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_currency_allowed CHECK (currency IN ('CDF', 'USD'));

DROP TRIGGER IF EXISTS customers_touch ON public.customers;
CREATE TRIGGER customers_touch BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS catalog_items_touch ON public.catalog_items;
CREATE TRIGGER catalog_items_touch BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
