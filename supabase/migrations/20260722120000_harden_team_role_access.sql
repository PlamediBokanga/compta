/*
# Harden role-based access for shared team members

1. Security changes
- Replaces the broad shared-access helper with a role-aware helper.
- Limits sensitive accounting data to the owner and invited accountants.
- Keeps viewers on a narrower read-only perimeter for invoices and declarations.
- Keeps API keys, webhooks and write operations owner-scoped.
*/

CREATE OR REPLACE FUNCTION public.has_team_role(owner_uuid uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE owner_id = owner_uuid
      AND member_id = auth.uid()
      AND status = 'active'
      AND role = ANY(allowed_roles)
  );
$$;

DROP POLICY IF EXISTS "select_own_transactions" ON public.transactions;
CREATE POLICY "select_own_transactions" ON public.transactions FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant'])
  );

DROP POLICY IF EXISTS "select_own_categories" ON public.categories;
CREATE POLICY "select_own_categories" ON public.categories FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant'])
  );

DROP POLICY IF EXISTS "select_own_documents" ON public.documents;
CREATE POLICY "select_own_documents" ON public.documents FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant'])
  );

DROP POLICY IF EXISTS "select_own_tasks" ON public.tasks;
CREATE POLICY "select_own_tasks" ON public.tasks FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant'])
  );

DROP POLICY IF EXISTS "select_own_audit_logs" ON public.audit_logs;
CREATE POLICY "select_own_audit_logs" ON public.audit_logs FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant'])
  );

DROP POLICY IF EXISTS "select_own_invoices" ON public.invoices;
CREATE POLICY "select_own_invoices" ON public.invoices FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant', 'viewer'])
  );

DROP POLICY IF EXISTS "select_own_invoice_items" ON public.invoice_items;
CREATE POLICY "select_own_invoice_items" ON public.invoice_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND (
          invoices.user_id = auth.uid()
          OR public.has_team_role(invoices.user_id, ARRAY['accountant', 'viewer'])
        )
    )
  );

DROP POLICY IF EXISTS "select_own_declarations" ON public.declarations;
CREATE POLICY "select_own_declarations" ON public.declarations FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.has_team_role(user_id, ARRAY['accountant', 'viewer'])
  );
