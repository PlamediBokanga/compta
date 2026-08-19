import type { Invoice, Transaction } from './types';

export interface DashboardStats {
  cashIn: number;
  cashOut: number;
  net: number;
  vatCollected: number;
  vatDeductible: number;
  vatDue: number;
  outstanding: number;
  overdueCount: number;
  uncategorizedCount: number;
  monthSeries: { month: string; in: number; out: number }[];
  topExpenseCategories: { label: string; amount: number; color: string }[];
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function computeStats(transactions: Transaction[], invoices: Invoice[]): DashboardStats {
  const now = new Date();

  let cashIn = 0;
  let cashOut = 0;
  let vatCollected = 0;
  let vatDeductible = 0;
  let uncategorizedCount = 0;

  const seriesMap = new Map<string, { in: number; out: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    seriesMap.set(monthKey(d), { in: 0, out: 0 });
  }

  const expenseByCategory = new Map<string, { amount: number; color: string }>();

  for (const t of transactions) {
    const tDate = new Date(t.date);
    const mk = monthKey(tDate);
    if (t.direction === 'in') {
      cashIn += Number(t.amount);
      vatCollected += Number(t.vat_amount || 0);
      if (seriesMap.has(mk)) seriesMap.get(mk)!.in += Number(t.amount);
    } else {
      cashOut += Number(t.amount);
      vatDeductible += Number(t.vat_amount || 0);
      if (seriesMap.has(mk)) seriesMap.get(mk)!.out += Number(t.amount);
      const catLabel = t.category?.label || 'Non catégorisé';
      const existing = expenseByCategory.get(catLabel) || { amount: 0, color: t.category?.color || 'slate' };
      existing.amount += Number(t.amount);
      expenseByCategory.set(catLabel, existing);
    }
    if (!t.category_id) uncategorizedCount++;
  }

  const monthSeries = Array.from(seriesMap.entries()).map(([k, v]) => {
    const d = new Date(k + '-01');
    return {
      month: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d).replace('.', ''),
      in: v.in,
      out: v.out,
    };
  });

  const topExpenseCategories = Array.from(expenseByCategory.entries())
    .map(([label, v]) => ({ label, amount: v.amount, color: v.color }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const todayStr = new Date().toISOString().slice(0, 10);
  let outstanding = 0;
  let overdueCount = 0;
  for (const inv of invoices) {
    if (inv.status === 'sent' && inv.due_date >= todayStr) outstanding += Number(inv.total);
    if (inv.status === 'sent' && inv.due_date < todayStr) {
      outstanding += Number(inv.total);
      overdueCount++;
    }
    if (inv.status === 'overdue') {
      outstanding += Number(inv.total);
      overdueCount++;
    }
  }

  return {
    cashIn,
    cashOut,
    net: cashIn - cashOut,
    vatCollected,
    vatDeductible,
    vatDue: vatCollected - vatDeductible,
    outstanding,
    overdueCount,
    uncategorizedCount,
    monthSeries,
    topExpenseCategories,
  };
}

export function effectiveInvoiceStatus(inv: Invoice): Invoice['status'] {
  if (inv.status === 'paid' || inv.status === 'draft' || inv.status === 'cancelled') return inv.status;
  const today = new Date().toISOString().slice(0, 10);
  if (inv.due_date < today) return 'overdue';
  return inv.status;
}
