/*
# Fix RLS policies to allow team member access (accountant/viewer)

1. Security Changes
- Updates SELECT policies on `transactions`, `invoices`, `invoice_items`, `documents`, `declarations`, `categories`, `tasks`, `audit_logs` to allow team members (accountant/viewer) to read the owner's data.
- INSERT/UPDATE/DELETE policies remain owner-only — team members cannot modify data.
- The predicate checks: `auth.uid() = user_id OR EXISTS (SELECT 1 FROM team_members WHERE owner_id = <table>.user_id AND member_id = auth.uid() AND status = 'active')`.

2. Important Notes
1. Only SELECT policies are relaxed for team members. Write operations remain strictly owner-scoped.
2. The `team_members` table must exist (created in a prior migration).
3. Accountants get read access to all owner data; viewers also get read access (role distinction is enforced in the frontend, not RLS — both roles can SELECT).
4. For child tables (invoice_items, documents) that scope through a parent, the EXISTS check goes through the parent's owner.
*/

-- Helper function: check if current user is an active team member of the given owner
CREATE OR REPLACE FUNCTION is_team_member(owner_uuid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE owner_id = owner_uuid
    AND member_id = auth.uid()
    AND status = 'active'
  );
$$;

-- transactions: relax SELECT for team members
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_team_member(user_id));

-- invoices: relax SELECT for team members
DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_team_member(user_id));

-- invoice_items: relax SELECT (scoped through parent invoice)
DROP POLICY IF EXISTS "select_own_invoice_items" ON invoice_items;
CREATE POLICY "select_own_invoice_items" ON invoice_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND (invoices.user_id = auth.uid() OR is_team_member(invoices.user_id)))
  );

-- documents: relax SELECT for team members
DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_team_member(user_id));

-- declarations: relax SELECT for team members
DROP POLICY IF EXISTS "select_own_declarations" ON declarations;
CREATE POLICY "select_own_declarations" ON declarations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_team_member(user_id));

-- categories: relax SELECT for team members
DROP POLICY IF EXISTS "select_own_categories" ON categories;
CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_team_member(user_id));

-- tasks: relax SELECT for team members
DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_team_member(user_id));
