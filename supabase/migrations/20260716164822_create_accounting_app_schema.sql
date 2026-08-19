/*
# Comptabilité & Facturation — full schema

This migration creates the complete data model for a French accounting/invoicing
SaaS platform (inspired by Indy) for indépendants and SMEs.

1. New Tables
- `profiles` — extends auth.users with company/legal info (siren, legal status, VAT regime, address).
- `categories` — chart of accounts categories (income/expense) scoped per user for transaction categorization.
- `transactions` — bank transactions imported via PSD2 aggregators, with auto-categorization + reconciliation state.
- `documents` — uploaded receipts/invoices (OCR pipeline), linked to transactions when matched.
- `invoices` — customer invoices with status (draft/sent/paid/overdue), due dates, totals, VAT.
- `invoice_items` — line items for each invoice (description, qty, unit price, VAT rate).
- `declarations` — tax declarations (TVA, liasse fiscale 2035/2033/2065, URSSAF) with period + status + generated file URL.
- `tasks` — actionable accounting tasks (categorize, attach receipt, declare, pay) with due date + done flag.

2. Relationships
- profiles.user_id → auth.users(id) ON DELETE CASCADE
- categories.user_id → auth.users(id)
- transactions.user_id → auth.users(id); transactions.category_id → categories(id)
- documents.user_id → auth.users(id); documents.transaction_id → transactions(id) ON DELETE SET NULL
- invoices.user_id → auth.users(id)
- invoice_items.invoice_id → invoices(id) ON DELETE CASCADE
- declarations.user_id → auth.users(id)
- tasks.user_id → auth.users(id)

3. Security
- RLS enabled on every table.
- Owner-scoped CRUD (4 policies per table) scoped to `auth.uid() = user_id`.
- `user_id` columns default to `auth.uid()` so client inserts that omit the owner still succeed.
- Child tables (invoice_items, documents) scope through their parent's owner.

4. Important Notes
1. This is a multi-tenant app with sign-in. All policies are `TO authenticated` with ownership predicates.
2. `profiles.user_id` defaults to `auth.uid()` and is the primary key — one profile per user.
3. `categories` are seeded per-user on first sign-in via the frontend (not via a trigger, to keep the migration simple).
4. `transactions.categorization_state` is one of: `auto` (ML-matched), `suggested` (needs confirmation), `manual` (user-set), `uncategorized`.
5. `invoices.status` is one of: `draft`, `sent`, `paid`, `overdue`. The frontend computes `overdue` from `due_date` when unpaid.
6. `declarations.type` is one of: `tva`, `liasse_2035`, `liasse_2033`, `liasse_2065`, `urssaf`, `das2`, `cfe`, `2042_c_pro`.
7. `tasks.kind` is one of: `categorize`, `attach_receipt`, `declare`, `remind`, `review`.
*/

-- profiles ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  legal_status text CHECK (legal_status IN ('micro', 'eirl', 'eurl', 'sasu', 'sas', 'sarl', 'auto_entrepreneur', 'profession_liberale')),
  siren text,
  vat_regime text CHECK (vat_regime IN ('franchise', 'reel_simplifie', 'reel_normal')) DEFAULT 'franchise',
  vat_number text,
  address text,
  postal_code text,
  city text,
  phone text,
  logo_url text,
  iban text,
  bic text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- categories -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  vat_rate numeric DEFAULT 0,
  color text DEFAULT 'slate',
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- transactions -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  label text NOT NULL,
  amount numeric(12,2) NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  categorization_state text NOT NULL DEFAULT 'uncategorized' CHECK (categorization_state IN ('auto', 'suggested', 'manual', 'uncategorized')),
  vat_amount numeric(12,2) DEFAULT 0,
  vat_rate numeric DEFAULT 0,
  bank_account_label text,
  reconciliated boolean DEFAULT false,
  document_id uuid,
  raw jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- documents --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'receipt' CHECK (kind IN ('receipt', 'invoice_in', 'invoice_out', 'bank_statement', 'other')),
  file_name text NOT NULL,
  file_url text,
  mime_type text,
  size_bytes integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ocr_done', 'matched', 'rejected')),
  ocr_data jsonb,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  amount numeric(12,2),
  date date,
  supplier text,
  vat_amount numeric(12,2),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- invoices ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  number text,
  customer_name text NOT NULL,
  customer_email text,
  customer_address text,
  customer_siren text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + 30),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  vat_total numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'EUR',
  notes text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(user_id, status);

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- invoice_items ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);

DROP POLICY IF EXISTS "select_own_invoice_items" ON invoice_items;
CREATE POLICY "select_own_invoice_items" ON invoice_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_invoice_items" ON invoice_items;
CREATE POLICY "insert_own_invoice_items" ON invoice_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_invoice_items" ON invoice_items;
CREATE POLICY "update_own_invoice_items" ON invoice_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_invoice_items" ON invoice_items;
CREATE POLICY "delete_own_invoice_items" ON invoice_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
  );

-- declarations ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('tva', 'liasse_2035', 'liasse_2033', 'liasse_2065', 'urssaf', 'das2', 'cfe', '2042_c_pro')),
  period_label text NOT NULL,
  period_start date,
  period_end date,
  amount numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'submitted', 'paid', 'archived')),
  due_date date,
  submitted_at timestamptz,
  file_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_declarations_user ON declarations(user_id, due_date);

DROP POLICY IF EXISTS "select_own_declarations" ON declarations;
CREATE POLICY "select_own_declarations" ON declarations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_declarations" ON declarations;
CREATE POLICY "insert_own_declarations" ON declarations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_declarations" ON declarations;
CREATE POLICY "update_own_declarations" ON declarations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_declarations" ON declarations;
CREATE POLICY "delete_own_declarations" ON declarations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- tasks ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('categorize', 'attach_receipt', 'declare', 'remind', 'review')),
  title text NOT NULL,
  description text,
  due_date date,
  done boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, done, due_date);

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- updated_at triggers ----------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_touch ON profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS invoices_touch ON invoices;
CREATE TRIGGER invoices_touch BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
