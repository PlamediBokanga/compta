import { supabase } from './supabase';
import type {
  AccountingTask,
  AppNotification,
  CatalogItem,
  Category,
  Customer,
  Declaration,
  Invoice,
  InvoiceItem,
  Transaction,
} from './types';

// Transactions -----------------------------------------------------------
export async function updateTransaction(id: string, patch: Partial<Transaction>) {
  const { data, error } = await supabase.from('transactions').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as Transaction;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function insertTransactions(rows: Partial<Transaction>[]) {
  const { data, error } = await supabase.from('transactions').insert(rows).select();
  if (error) throw new Error(error.message);
  return data as Transaction[];
}

// Categories --------------------------------------------------------------
export async function insertCategory(row: Partial<Category>) {
  const { data, error } = await supabase.from('categories').insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as Category;
}

export async function updateCategory(id: string, patch: Partial<Category>) {
  const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as Category;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Customers ---------------------------------------------------------------
export async function insertCustomer(row: Partial<Customer>) {
  const { data, error } = await supabase.from('customers').insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as Customer;
}

export async function updateCustomer(id: string, patch: Partial<Customer>) {
  const { data, error } = await supabase.from('customers').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as Customer;
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Catalog items -----------------------------------------------------------
export async function insertCatalogItem(row: Partial<CatalogItem>) {
  const { data, error } = await supabase.from('catalog_items').insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as CatalogItem;
}

export async function updateCatalogItem(id: string, patch: Partial<CatalogItem>) {
  const { data, error } = await supabase.from('catalog_items').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as CatalogItem;
}

export async function deleteCatalogItem(id: string) {
  const { error } = await supabase.from('catalog_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Invoices ---------------------------------------------------------------
export async function createInvoice(
  invoice: Partial<Invoice>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[],
) {
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert(invoice)
    .select()
    .maybeSingle();
  if (invErr) throw new Error(invErr.message);
  const invData = inv as Invoice;

  if (items.length) {
    const rows = items.map((it) => ({ ...it, invoice_id: invData.id, item_type: it.item_type || 'service' }));
    const { error: itemsErr } = await supabase.from('invoice_items').insert(rows);
    if (itemsErr) throw new Error(itemsErr.message);
  }
  return invData;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>) {
  const { data, error } = await supabase.from('invoices').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as Invoice;
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function replaceInvoiceItems(invoiceId: string, items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at'>[]) {
  const { error: delErr } = await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
  if (delErr) throw new Error(delErr.message);
  if (items.length) {
    const rows = items.map((it) => ({ ...it, invoice_id: invoiceId, item_type: it.item_type || 'service' }));
    const { error: insErr } = await supabase.from('invoice_items').insert(rows);
    if (insErr) throw new Error(insErr.message);
  }
}

// Declarations -----------------------------------------------------------
export async function insertDeclaration(row: Partial<Declaration>) {
  const { data, error } = await supabase.from('declarations').insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as Declaration;
}

export async function updateDeclaration(id: string, patch: Partial<Declaration>) {
  const { data, error } = await supabase.from('declarations').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as Declaration;
}

export async function deleteDeclaration(id: string) {
  const { error } = await supabase.from('declarations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Tasks ------------------------------------------------------------------
export async function insertTask(row: Partial<AccountingTask>) {
  const { data, error } = await supabase.from('tasks').insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as AccountingTask;
}

export async function updateTask(id: string, patch: Partial<AccountingTask>) {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data as AccountingTask;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Documents --------------------------------------------------------------
export async function insertDocument(row: Record<string, unknown>) {
  const { data, error } = await supabase.from('documents').insert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDocument(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from('documents').update(patch).eq('id', id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDocument(id: string) {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Profile ----------------------------------------------------------------
export async function upsertProfile(row: Record<string, unknown>) {
  const { data, error } = await supabase.from('profiles').upsert(row).select().maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Notifications ----------------------------------------------------------
export async function insertNotification(row: Partial<AppNotification>) {
  const { error } = await supabase.from('notifications').insert(row);
  if (error) throw new Error(error.message);
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw new Error(error.message);
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
