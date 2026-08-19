import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, Clock, Download, Eye, FileSignature, FileText, Plus, Search, Send, Trash2, X, type LucideIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../lib/auth';
import { createInvoice, deleteInvoice, insertCatalogItem, insertCustomer, insertTransactions, updateInvoice } from '../../lib/api';
import { effectiveInvoiceStatus } from '../../lib/analytics';
import { logAction } from '../../lib/audit';
import { sendInvoiceEmail, sendReminderEmail } from '../../lib/email';
import { fmtDate, fmtMoney, fmtMoneyWords, initials } from '../../lib/format';
import { useCatalogItems, useCategories, useCustomers, useInvoices, useTransactions } from '../../lib/hooks';
import { buildInvoiceQrPayload, buildVerificationCode, canNormalizeInvoice, getInvoiceComplianceChecks, getInvoiceNormalizationLabel, getInvoiceNormalizationStatus, RDC_STANDARD_VAT_RATE } from '../../lib/rdc';
import type { CatalogItem, Category, Customer, Invoice, InvoiceItem, InvoiceStatus, Profile, Transaction } from '../../lib/types';

const statusMeta: Record<InvoiceStatus, { label: string; tone: 'success' | 'danger' | 'brand' | 'neutral'; icon: LucideIcon }> = {
  paid: { label: 'Payee', tone: 'success', icon: CheckCircle2 },
  sent: { label: 'Envoyee', tone: 'brand', icon: Send },
  overdue: { label: 'En retard', tone: 'danger', icon: AlertCircle },
  draft: { label: 'Brouillon', tone: 'neutral', icon: Clock },
  cancelled: { label: 'Annulee', tone: 'neutral', icon: X },
};

type Tab = 'invoices' | 'quotes';
type InvoiceCurrency = 'CDF' | 'USD';
type CurrencyTotals = Record<InvoiceCurrency, number>;

const EXCHANGE_RATE_META_REGEX = /\[\[finexa:exchange_rate=([0-9.,]+)\]\]/i;
const CREDIT_NOTE_FOR_META_REGEX = /\[\[finexa:credit_note_for=([^\]]+)\]\]/i;
const CREDIT_NOTE_SOURCE_NUMBER_META_REGEX = /\[\[finexa:credit_note_source_number=([^\]]+)\]\]/i;

const parseExchangeRateValue = (value: string | number | null | undefined) => {
  const normalized = String(value ?? '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const readInvoiceExchangeRate = (notes: string | null | undefined) => {
  if (!notes) return null;
  const match = notes.match(EXCHANGE_RATE_META_REGEX);
  return match ? parseExchangeRateValue(match[1]) : null;
};

const computeUsdAmount = (amount: number, currency: InvoiceCurrency, exchangeRate: number | null) => {
  if (currency === 'USD') return Number(amount || 0);
  if (!exchangeRate || exchangeRate <= 0) return 0;
  return Number(amount || 0) / exchangeRate;
};

const stripInvoiceMetaNotes = (notes: string | null | undefined) => {
  if (!notes) return '';
  return notes
    .replace(EXCHANGE_RATE_META_REGEX, '')
    .replace(CREDIT_NOTE_FOR_META_REGEX, '')
    .replace(CREDIT_NOTE_SOURCE_NUMBER_META_REGEX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const buildInvoiceNotes = (headerNote: string, notes: string, exchangeRate: number | null) => {
  const visibleNotes = [headerNote.trim(), notes.trim()].filter(Boolean).join('\n\n');
  const metaNotes = exchangeRate ? `[[finexa:exchange_rate=${exchangeRate}]]` : '';
  return [visibleNotes, metaNotes].filter(Boolean).join('\n\n') || null;
};

const readInvoiceCreditNoteSourceId = (notes: string | null | undefined) => {
  if (!notes) return null;
  const match = notes.match(CREDIT_NOTE_FOR_META_REGEX);
  return match?.[1]?.trim() || null;
};

const readInvoiceCreditNoteSourceNumber = (notes: string | null | undefined) => {
  if (!notes) return null;
  const match = notes.match(CREDIT_NOTE_SOURCE_NUMBER_META_REGEX);
  return match?.[1]?.trim() || null;
};

const isCreditNoteInvoice = (invoice: Invoice | null | undefined) => Boolean(readInvoiceCreditNoteSourceId(invoice?.notes));

const buildCreditNoteNotes = (reason: string, sourceInvoice: Invoice) => {
  const visibleNotes = [`Avoir client lie a la facture ${sourceInvoice.number}.`, reason.trim()].filter(Boolean).join('\n\n');
  return [visibleNotes, `[[finexa:credit_note_for=${sourceInvoice.id}]]`, `[[finexa:credit_note_source_number=${sourceInvoice.number}]]`].join('\n\n');
};

interface DraftItem {
  id: string;
  catalog_item_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

const emptyTotals = (): CurrencyTotals => ({ CDF: 0, USD: 0 });

const getInvoiceCurrency = (invoice: Invoice | null | undefined): InvoiceCurrency =>
  ((invoice?.currency || 'CDF') as InvoiceCurrency);

const addToTotals = (totals: CurrencyTotals, currency: InvoiceCurrency, amount: number) => {
  totals[currency] += Number(amount || 0);
};

const formatTotals = (totals: CurrencyTotals) => {
  const parts = (['CDF', 'USD'] as InvoiceCurrency[])
    .filter((currency) => totals[currency] > 0)
    .map((currency) => fmtMoney(totals[currency], currency));
  return parts.length ? parts.join(' / ') : fmtMoney(0, 'CDF');
};

const PAYMENT_METHODS = ['Virement bancaire', 'Especes', 'Mobile Money', 'Carte', 'Cheque', 'A convenir'] as const;
const TREASURY_ACCOUNT_OPTIONS = ['Banque locale (CDF)', 'Banque en devises (USD)', 'Caisse', 'Mobile Money'] as const;

type TreasuryAccountLabel = (typeof TREASURY_ACCOUNT_OPTIONS)[number];

interface InvoicePaymentDraft {
  invoice: Invoice;
  amount: number;
  paymentDate: string;
  treasuryLabel: TreasuryAccountLabel;
}

interface CreditNoteDraft {
  invoice: Invoice;
  amount: number;
  issueDate: string;
  reason: string;
}

interface CreditNoteRefundDraft {
  creditNote: Invoice;
  amount: number;
  refundDate: string;
  treasuryLabel: TreasuryAccountLabel;
}

const getTransactionRawString = (transaction: Transaction, key: string) => {
  const raw = transaction.raw && typeof transaction.raw === 'object' ? transaction.raw as Record<string, unknown> : null;
  const value = raw?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const isInvoiceIssueTransaction = (transaction: Transaction) => getTransactionRawString(transaction, 'accounting_event') === 'invoice_issue';
const isInvoicePaymentTransaction = (transaction: Transaction) => getTransactionRawString(transaction, 'accounting_event') === 'invoice_payment';
const isCreditNoteTransaction = (transaction: Transaction) => getTransactionRawString(transaction, 'accounting_event') === 'credit_note_issue';
const isCreditNoteRefundTransaction = (transaction: Transaction) => getTransactionRawString(transaction, 'accounting_event') === 'credit_note_refund';
const getTransactionInvoiceId = (transaction: Transaction) => getTransactionRawString(transaction, 'invoice_id');
const getTransactionSourceInvoiceId = (transaction: Transaction) => getTransactionRawString(transaction, 'source_invoice_id');

const getDefaultTreasuryLabel = (paymentMethod?: string | null): TreasuryAccountLabel => {
  const normalized = String(paymentMethod || '').toLowerCase();
  if (normalized.includes('espe')) return 'Caisse';
  if (normalized.includes('mobile')) return 'Mobile Money';
  if (normalized.includes('usd') || normalized.includes('dollar') || normalized.includes('devise')) return 'Banque en devises (USD)';
  return 'Banque locale (CDF)';
};

const getInvoicePrimaryDescription = (descriptions: string[]) => descriptions.find((item) => item.trim())?.trim() || 'Vente';

const inferInvoiceIncomeCategoryId = (categories: Category[], descriptions: string[]) => {
  const incomeCategories = categories.filter((category) => category.kind === 'income');
  if (incomeCategories.length === 0) return null;
  const haystack = descriptions.join(' ').toLowerCase();
  const matched = incomeCategories.find((category) => {
    const label = category.label.toLowerCase();
    return (label && haystack.includes(label)) || (haystack && label.includes(haystack.split(' ')[0] || ''));
  });
  return matched?.id || incomeCategories[0].id;
};

const buildInvoiceIssueTransaction = (userId: string, invoice: Invoice, categories: Category[], descriptions: string[]): Partial<Transaction> => {
  const primaryDescription = getInvoicePrimaryDescription(descriptions);
  const categoryId = inferInvoiceIncomeCategoryId(categories, descriptions);
  return {
    user_id: userId,
    date: invoice.issue_date,
    label: `Facture ${invoice.number} - ${invoice.customer_name} - ${primaryDescription}`,
    amount: Number(invoice.total || 0),
    direction: 'in',
    category_id: categoryId,
    categorization_state: categoryId ? 'manual' : 'uncategorized',
    vat_amount: Number(invoice.vat_total || 0),
    vat_rate: Number(invoice.subtotal || 0) > 0 ? Number((((invoice.vat_total || 0) / Math.max(invoice.subtotal || 1, 1)) * 100).toFixed(2)) : 0,
    bank_account_label: null,
    reconciliated: false,
    document_id: invoice.id,
    raw: {
      accounting_event: 'invoice_issue',
      invoice_id: invoice.id,
      invoice_number: invoice.number,
      customer_name: invoice.customer_name,
      source: 'invoices_module',
    },
  };
};

const buildInvoicePaymentTransaction = (userId: string, invoice: Invoice, categories: Category[], descriptions: string[], amount: number, paymentDate: string, treasuryLabel: TreasuryAccountLabel): Partial<Transaction> => {
  const categoryId = inferInvoiceIncomeCategoryId(categories, descriptions);
  return {
    user_id: userId,
    date: paymentDate,
    label: `Reglement facture ${invoice.number} - ${invoice.customer_name}`,
    amount: Number(amount || 0),
    direction: 'in',
    category_id: categoryId,
    categorization_state: categoryId ? 'manual' : 'uncategorized',
    vat_amount: 0,
    vat_rate: 0,
    bank_account_label: treasuryLabel,
    reconciliated: true,
    document_id: invoice.id,
    raw: {
      accounting_event: 'invoice_payment',
      invoice_id: invoice.id,
      invoice_number: invoice.number,
      customer_name: invoice.customer_name,
      treasury_label: treasuryLabel,
      source: 'invoices_module',
    },
  };
};

const buildCreditNoteTransaction = (userId: string, creditNote: Invoice, sourceInvoice: Invoice, categories: Category[], descriptions: string[]): Partial<Transaction> => {
  const primaryDescription = getInvoicePrimaryDescription(descriptions);
  const categoryId = inferInvoiceIncomeCategoryId(categories, descriptions);
  return {
    user_id: userId,
    date: creditNote.issue_date,
    label: `Avoir ${creditNote.number} - ${sourceInvoice.number} - ${sourceInvoice.customer_name} - ${primaryDescription}`,
    amount: Number(creditNote.total || 0),
    direction: 'out',
    category_id: categoryId,
    categorization_state: categoryId ? 'manual' : 'uncategorized',
    vat_amount: Number(creditNote.vat_total || 0),
    vat_rate: Number(creditNote.subtotal || 0) > 0 ? Number((((creditNote.vat_total || 0) / Math.max(creditNote.subtotal || 1, 1)) * 100).toFixed(2)) : 0,
    bank_account_label: null,
    reconciliated: false,
    document_id: creditNote.id,
    raw: {
      accounting_event: 'credit_note_issue',
      invoice_id: creditNote.id,
      invoice_number: creditNote.number,
      source_invoice_id: sourceInvoice.id,
      source_invoice_number: sourceInvoice.number,
      customer_name: sourceInvoice.customer_name,
      source: 'invoices_module',
    },
  };
};

const buildCreditNoteRefundTransaction = (userId: string, creditNote: Invoice, amount: number, refundDate: string, treasuryLabel: TreasuryAccountLabel): Partial<Transaction> => ({
  user_id: userId,
  date: refundDate,
  label: `Remboursement avoir ${creditNote.number} - ${creditNote.customer_name}`,
  amount: Number(amount || 0),
  direction: 'out',
  category_id: null,
  categorization_state: 'manual',
  vat_amount: 0,
  vat_rate: 0,
  bank_account_label: treasuryLabel,
  reconciliated: true,
  document_id: creditNote.id,
  raw: {
    accounting_event: 'credit_note_refund',
    invoice_id: creditNote.id,
    invoice_number: creditNote.number,
    source_invoice_id: readInvoiceCreditNoteSourceId(creditNote.notes),
    source_invoice_number: readInvoiceCreditNoteSourceNumber(creditNote.notes),
    customer_name: creditNote.customer_name,
    treasury_label: treasuryLabel,
    source: 'invoices_module',
  },
});

export function InvoicesPage() {
  const { profile, user } = useAuth();
  const { items: invoices, loading, reload } = useInvoices();
  const { items: customers, reload: reloadCustomers } = useCustomers();
  const { items: catalogItems, reload: reloadCatalogItems } = useCatalogItems();
  const { items: categories } = useCategories();
  const { items: transactions, reload: reloadTransactions } = useTransactions();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<InvoicePaymentDraft | null>(null);
  const [creditNoteDraft, setCreditNoteDraft] = useState<CreditNoteDraft | null>(null);
  const [creditNoteRefundDraft, setCreditNoteRefundDraft] = useState<CreditNoteRefundDraft | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const isInvoicesTab = tab === 'invoices';

  const list = useMemo(() => invoices.filter((invoice) => invoice.is_quote !== isInvoicesTab), [invoices, isInvoicesTab]);
  const filtered = useMemo(() => list.filter((invoice) => {
    const effectiveStatus = effectiveInvoiceStatus(invoice);
    if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
    if (!search) return true;
    const needle = search.toLowerCase();
    return invoice.customer_name.toLowerCase().includes(needle) || (invoice.number || '').toLowerCase().includes(needle);
  }), [list, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);
  useEffect(() => setPage(1), [tab, search, statusFilter]);

  const issuedInvoiceIds = useMemo(() => new Set(
    transactions
      .filter((transaction) => isInvoiceIssueTransaction(transaction))
      .map((transaction) => getTransactionInvoiceId(transaction))
      .filter((value): value is string => Boolean(value)),
  ), [transactions]);

  const settledByInvoice = useMemo(() => {
    const map = new Map<string, number>();
    for (const transaction of transactions) {
      const invoiceId = getTransactionInvoiceId(transaction);
      if (!invoiceId || !isInvoicePaymentTransaction(transaction)) continue;
      map.set(invoiceId, (map.get(invoiceId) || 0) + Number(transaction.amount || 0));
    }
    return map;
  }, [transactions]);

  const creditedByInvoice = useMemo(() => {
    const map = new Map<string, number>();
    for (const transaction of transactions) {
      const sourceInvoiceId = getTransactionSourceInvoiceId(transaction);
      if (!sourceInvoiceId || !isCreditNoteTransaction(transaction)) continue;
      map.set(sourceInvoiceId, (map.get(sourceInvoiceId) || 0) + Number(transaction.amount || 0));
    }
    return map;
  }, [transactions]);

  const refundedByCreditNote = useMemo(() => {
    const map = new Map<string, number>();
    for (const transaction of transactions) {
      const invoiceId = getTransactionInvoiceId(transaction);
      if (!invoiceId || !isCreditNoteRefundTransaction(transaction)) continue;
      map.set(invoiceId, (map.get(invoiceId) || 0) + Number(transaction.amount || 0));
    }
    return map;
  }, [transactions]);

  const stats = useMemo(() => {
    const paid = emptyTotals();
    const pending = emptyTotals();
    const overdue = emptyTotals();
    for (const invoice of list) {
      if (invoice.is_quote || isCreditNoteInvoice(invoice)) continue;
      const effectiveStatus = effectiveInvoiceStatus(invoice);
      const currency = getInvoiceCurrency(invoice);
      const settledAmount = settledByInvoice.get(invoice.id) || 0;
      const creditedAmount = creditedByInvoice.get(invoice.id) || 0;
      const residualAmount = Math.max(0, Number(invoice.total || 0) - settledAmount - creditedAmount);
      if (settledAmount > 0) addToTotals(paid, currency, Math.min(settledAmount, Number(invoice.total || 0)));
      if (residualAmount <= 0.01) continue;
      if (effectiveStatus === 'overdue') addToTotals(overdue, currency, residualAmount);
      else if (effectiveStatus === 'sent' || effectiveStatus === 'paid') addToTotals(pending, currency, residualAmount);
    }
    return { paid, pending, overdue };
  }, [creditedByInvoice, list, settledByInvoice]);

  const normalizationWorkflow = useMemo(() => {
    const standard = list.filter((invoice) => !invoice.is_quote && getInvoiceNormalizationStatus(invoice, profile) === 'standard').length;
    const ready = list.filter((invoice) => !invoice.is_quote && getInvoiceNormalizationStatus(invoice, profile) === 'ready').length;
    const normalized = list.filter((invoice) => !invoice.is_quote && getInvoiceNormalizationStatus(invoice, profile) === 'normalized').length;
    const priority = list
      .filter((invoice) => !invoice.is_quote && getInvoiceNormalizationStatus(invoice, profile) === 'ready')
      .slice(0, 4);
    return {
      standard,
      ready,
      normalized,
      priority,
      profileReady: Boolean(profile?.tax_id) && Boolean(profile?.rccm) && Boolean(profile?.def_device_id),
    };
  }, [list, profile]);

  const normalizationMissingFields = useMemo(() => {
    return [
      !profile?.tax_id ? 'NIF' : null,
      !profile?.rccm ? 'RCCM' : null,
      !profile?.def_device_id ? 'DEF' : null,
    ].filter((value): value is string => Boolean(value));
  }, [profile]);


  const nextNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const invoicePrefix = (profile?.invoice_series || 'FN').trim() || 'FN';
    const prefix = isInvoicesTab ? invoicePrefix : 'DEV';
    const count = invoices.filter((invoice) => (invoice.number || '').startsWith(`${prefix}-${year}`)).length;
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }, [invoices, isInvoicesTab, profile?.invoice_series]);

  useEffect(() => {
    if (!isInvoicesTab) return;
    const overdueInvoices = list.filter((invoice) => effectiveInvoiceStatus(invoice) === 'overdue' && invoice.reminder_count < 3);
    if (overdueInvoices.length === 0) return;
    const run = async () => {
      let sentCount = 0;
      for (const invoice of overdueInvoices) {
        const daysLate = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000);
        const lastReminder = invoice.last_reminder_at ? new Date(invoice.last_reminder_at).getTime() : 0;
        const daysSinceLastReminder = Math.floor((Date.now() - lastReminder) / 86400000);
        const shouldRemind = (invoice.reminder_count === 0 && daysLate >= 1) || (invoice.reminder_count === 1 && daysSinceLastReminder >= 3) || (invoice.reminder_count === 2 && daysSinceLastReminder >= 7);
        if (!shouldRemind) continue;
        const reminderCount = invoice.reminder_count + 1;
        await updateInvoice(invoice.id, { reminder_count: reminderCount, last_reminder_at: new Date().toISOString() });
        if (invoice.customer_email) await sendReminderEmail({ ...invoice, reminder_count: reminderCount }, profile, reminderCount);
        sentCount += 1;
      }
      if (sentCount > 0) {
        reload();
        toast({ kind: 'info', message: `${sentCount} relance(s) automatique(s) envoyÃ©e(s).` });
      }
    };
    void run();
  }, [isInvoicesTab, list, profile, reload, toast]);

  const ensureInvoiceIssueTransaction = async (invoice: Invoice) => {
    if (!user || invoice.is_quote || issuedInvoiceIds.has(invoice.id)) return;
    const descriptions = (invoice.items || []).map((item) => item.description || '').filter(Boolean);
    await insertTransactions([
      buildInvoiceIssueTransaction(user.id, invoice, categories, descriptions),
    ]);
  };

  const openPaymentModal = (invoice: Invoice) => {
    const residualAmount = Math.max(0, Number(invoice.total || 0) - (settledByInvoice.get(invoice.id) || 0) - (creditedByInvoice.get(invoice.id) || 0));
    if (residualAmount <= 0.01) {
      toast({ kind: 'info', message: 'Cette facture est deja totalement reglee.' });
      return;
    }
    setPaymentDraft({
      invoice,
      amount: Number(residualAmount.toFixed(2)),
      paymentDate: new Date().toISOString().slice(0, 10),
      treasuryLabel: getDefaultTreasuryLabel(invoice.payment_method),
    });
  };

  const recordInvoicePayment = async () => {
    if (!user || !paymentDraft) return;

    const invoice = paymentDraft.invoice;
    const settledAmount = settledByInvoice.get(invoice.id) || 0;
    const creditedAmount = creditedByInvoice.get(invoice.id) || 0;
    const residualAmount = Math.max(0, Number(invoice.total || 0) - settledAmount - creditedAmount);
    const paymentAmount = Number(paymentDraft.amount || 0);

    if (paymentAmount <= 0) {
      toast({ kind: 'error', message: 'Le montant du reglement doit etre superieur a zero.' });
      return;
    }
    if (paymentAmount - residualAmount > 0.01) {
      toast({ kind: 'error', message: 'Le montant du reglement depasse le solde restant de la facture.' });
      return;
    }

    try {
      await ensureInvoiceIssueTransaction(invoice);
      await insertTransactions([
        buildInvoicePaymentTransaction(
          user.id,
          invoice,
          categories,
          (invoice.items || []).map((item) => item.description || '').filter(Boolean),
          paymentAmount,
          paymentDraft.paymentDate,
          paymentDraft.treasuryLabel,
        ),
      ]);

      const newSettledAmount = settledAmount + paymentAmount;
      const isFullyPaid = Math.max(0, Number(invoice.total || 0) - newSettledAmount - creditedAmount) <= 0.01;
      await updateInvoice(invoice.id, {
        status: isFullyPaid ? 'paid' : 'sent',
        paid_at: isFullyPaid ? new Date().toISOString() : null,
      });
      await logAction('invoice.pay', 'invoice', invoice.id, {
        number: invoice.number,
        total: invoice.total,
        amount_paid: paymentAmount,
        settlement_account: paymentDraft.treasuryLabel,
      });
      await Promise.all([reload(), reloadTransactions()]);
      setPaymentDraft(null);
      toast({
        kind: 'success',
        message: isFullyPaid ? 'Paiement comptabilise, facture totalement reglee.' : 'Paiement partiel comptabilise et lettrage mis a jour.',
      });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const sendInvoice = async (invoice: Invoice) => {
    try {
      await updateInvoice(invoice.id, { status: 'sent' });
      await ensureInvoiceIssueTransaction({ ...invoice, status: 'sent' });
      await logAction('invoice.send', 'invoice', invoice.id, { number: invoice.number, total: invoice.total });
      if (invoice.customer_email) {
        const result = await sendInvoiceEmail(invoice, profile);
        toast(result.success ? { kind: 'success', message: `${isInvoicesTab ? 'Facture' : 'Devis'} envoyee a ${invoice.customer_email}.` } : { kind: 'error', message: `${isInvoicesTab ? 'Facture' : 'Devis'} marquee envoyee mais e-mail non delivre : ${result.error}` });
      } else {
        toast({ kind: 'success', message: `${isInvoicesTab ? 'Facture' : 'Devis'} marquee envoyee.` });
      }
      await Promise.all([reload(), reloadTransactions()]);
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const convertQuote = async (invoice: Invoice) => {
    if (!user) return;
    try {
      const year = new Date().getFullYear();
      const invoicePrefix = (profile?.invoice_series || 'FN').trim() || 'FN';
      const count = invoices.filter((item) => !item.is_quote && (item.number || '').startsWith(`${invoicePrefix}-${year}`)).length;
      const number = `${invoicePrefix}-${year}-${String(count + 1).padStart(4, '0')}`;
      const today = new Date().toISOString().slice(0, 10);
      const dueDate = invoice.due_date && invoice.due_date >= today ? invoice.due_date : today;
      const convertedInvoice = await updateInvoice(invoice.id, {
        is_quote: false,
        number,
        status: 'sent',
        issue_date: today,
        due_date: dueDate,
        paid_at: null,
        reminder_count: 0,
        last_reminder_at: null,
        normalization_status: 'standard',
        normalized_at: null,
        verification_code: null,
        normalized_qr_payload: null,
      });
      await insertTransactions([
        buildInvoiceIssueTransaction(
          user.id,
          { ...convertedInvoice, items: invoice.items || [] },
          categories,
          (invoice.items || []).map((item) => item.description || '').filter(Boolean),
        ),
      ]);
      await logAction('quote.convert', 'invoice', invoice.id, { from: invoice.number, to: number });
      if (invoice.customer_email) {
        const result = await sendInvoiceEmail({ ...convertedInvoice, items: invoice.items || [] }, profile);
        toast(result.success
          ? { kind: 'success', message: `Devis converti en facture ${number} et envoye a ${invoice.customer_email}.` }
          : { kind: 'info', message: `Facture ${number} creee, mais l e-mail n a pas ete delivre : ${result.error}` });
      } else {
        toast({ kind: 'success', message: `Devis converti en facture ${number}.` });
      }
      await Promise.all([reload(), reloadTransactions()]);
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const openCreditNoteModal = (invoice: Invoice) => {
    if (!user) return;
    if (invoice.is_quote || isCreditNoteInvoice(invoice)) {
      toast({ kind: 'info', message: 'Un avoir se cree uniquement a partir d une facture standard.' });
      return;
    }
    const alreadyCredited = creditedByInvoice.get(invoice.id) || 0;
    const remainingCreditCapacity = Math.max(0, Number(invoice.total || 0) - alreadyCredited);
    if (remainingCreditCapacity <= 0.01) {
      toast({ kind: 'info', message: 'Cette facture est deja totalement couverte par des avoirs.' });
      return;
    }
    setCreditNoteDraft({
      invoice,
      amount: Number(remainingCreditCapacity.toFixed(2)),
      issueDate: new Date().toISOString().slice(0, 10),
      reason: '',
    });
  };

  const createCreditNote = async () => {
    if (!user || !creditNoteDraft) return;
    const sourceInvoice = creditNoteDraft.invoice;
    const alreadyCredited = creditedByInvoice.get(sourceInvoice.id) || 0;
    const maxAllowed = Math.max(0, Number(sourceInvoice.total || 0) - alreadyCredited);
    const amount = Number(creditNoteDraft.amount || 0);

    if (amount <= 0) {
      toast({ kind: 'error', message: 'Le montant de l avoir doit etre superieur a zero.' });
      return;
    }
    if (amount - maxAllowed > 0.01) {
      toast({ kind: 'error', message: 'Le montant de l avoir depasse le solde encore creditable de cette facture.' });
      return;
    }

    try {
      const year = new Date(creditNoteDraft.issueDate).getFullYear();
      const count = invoices.filter((item) => isCreditNoteInvoice(item) && (item.number || '').startsWith(`AV-${year}`)).length;
      const creditNoteNumber = `AV-${year}-${String(count + 1).padStart(4, '0')}`;
      const baseTotal = Number(sourceInvoice.total || 0);
      const baseVat = Number(sourceInvoice.vat_total || 0);
      const baseSubtotal = Number(sourceInvoice.subtotal || 0);
      const vatTotal = baseTotal > 0 ? Number(((baseVat / baseTotal) * amount).toFixed(2)) : 0;
      const subtotal = Math.max(0, Number((amount - vatTotal).toFixed(2)));
      const preparedItems = [{
        catalog_item_id: null,
        description: `Avoir sur facture ${sourceInvoice.number} - ${creditNoteDraft.reason.trim() || 'Regularisation commerciale'}`,
        quantity: 1,
        unit_price: amount,
        vat_rate: baseSubtotal > 0 ? Number(((baseVat / Math.max(baseSubtotal, 1)) * 100).toFixed(2)) : 0,
        line_total: amount,
      }];
      const creditNoteInvoice = await createInvoice({
        user_id: user.id,
        customer_id: sourceInvoice.customer_id || null,
        number: creditNoteNumber,
        customer_name: sourceInvoice.customer_name,
        customer_email: sourceInvoice.customer_email || null,
        customer_address: sourceInvoice.customer_address || null,
        customer_siren: sourceInvoice.customer_siren || null,
        customer_tax_id: sourceInvoice.customer_tax_id || null,
        customer_rccm: sourceInvoice.customer_rccm || null,
        issue_date: creditNoteDraft.issueDate,
        due_date: creditNoteDraft.issueDate,
        status: 'sent',
        subtotal,
        vat_total: vatTotal,
        total: amount,
        currency: sourceInvoice.currency || 'CDF',
        payment_method: sourceInvoice.payment_method || null,
        other_taxes_amount: 0,
        non_taxable_amount: 0,
        notes: buildCreditNoteNotes(creditNoteDraft.reason, sourceInvoice),
        is_quote: false,
        normalization_status: 'standard',
      }, preparedItems);
      await insertTransactions([
        buildCreditNoteTransaction(
          user.id,
          { ...creditNoteInvoice, items: preparedItems.map((item, index) => ({
            id: `${creditNoteInvoice.id}-${index}`,
            invoice_id: creditNoteInvoice.id,
            catalog_item_id: item.catalog_item_id || null,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            vat_rate: item.vat_rate,
            line_total: item.line_total,
            created_at: creditNoteInvoice.created_at,
          })) },
          sourceInvoice,
          categories,
          preparedItems.map((item) => item.description),
        ),
      ]);
      await logAction('credit_note.create', 'invoice', creditNoteInvoice.id, { source_invoice_id: sourceInvoice.id, source_invoice_number: sourceInvoice.number, credit_note_number: creditNoteNumber, total: amount });
      await Promise.all([reload(), reloadTransactions()]);
      setCreditNoteDraft(null);
      toast({ kind: 'success', message: `Avoir ${creditNoteNumber} cree et comptabilise.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const openCreditNoteRefundModal = (creditNote: Invoice) => {
    if (!user) return;
    if (!isCreditNoteInvoice(creditNote)) {
      toast({ kind: 'info', message: 'Le remboursement s applique uniquement a un avoir client.' });
      return;
    }
    const refundedAmount = refundedByCreditNote.get(creditNote.id) || 0;
    const availableRefund = Math.max(0, Number(creditNote.total || 0) - refundedAmount);
    if (availableRefund <= 0.01) {
      toast({ kind: 'info', message: 'Cet avoir a deja ete totalement rembourse.' });
      return;
    }
    setCreditNoteRefundDraft({
      creditNote,
      amount: Number(availableRefund.toFixed(2)),
      refundDate: new Date().toISOString().slice(0, 10),
      treasuryLabel: getDefaultTreasuryLabel(creditNote.payment_method),
    });
  };

  const recordCreditNoteRefund = async () => {
    if (!user || !creditNoteRefundDraft) return;

    const creditNote = creditNoteRefundDraft.creditNote;
    const refundedAmount = refundedByCreditNote.get(creditNote.id) || 0;
    const availableRefund = Math.max(0, Number(creditNote.total || 0) - refundedAmount);
    const amount = Number(creditNoteRefundDraft.amount || 0);

    if (amount <= 0) {
      toast({ kind: 'error', message: 'Le montant du remboursement doit etre superieur a zero.' });
      return;
    }
    if (amount - availableRefund > 0.01) {
      toast({ kind: 'error', message: 'Le montant du remboursement depasse le solde restant de cet avoir.' });
      return;
    }

    try {
      await insertTransactions([
        buildCreditNoteRefundTransaction(
          user.id,
          creditNote,
          amount,
          creditNoteRefundDraft.refundDate,
          creditNoteRefundDraft.treasuryLabel,
        ),
      ]);
      await logAction('credit_note.refund', 'invoice', creditNote.id, {
        credit_note_number: creditNote.number,
        amount_refunded: amount,
        treasury_account: creditNoteRefundDraft.treasuryLabel,
      });
      await Promise.all([reload(), reloadTransactions()]);
      setCreditNoteRefundDraft(null);
      toast({ kind: 'success', message: `Remboursement de l avoir ${creditNote.number} comptabilise.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };
  const sendReminder = async (invoice: Invoice) => {
    try {
      const reminderCount = invoice.reminder_count + 1;
      await updateInvoice(invoice.id, { reminder_count: reminderCount, last_reminder_at: new Date().toISOString() });
      await logAction('invoice.remind', 'invoice', invoice.id, { number: invoice.number, reminder_count: reminderCount });
      if (invoice.customer_email) {
        const result = await sendReminderEmail({ ...invoice, reminder_count: reminderCount }, profile, reminderCount);
        toast(result.success ? { kind: 'success', message: `Relance ${reminderCount} envoyÃ©e Ã  ${invoice.customer_email}.` } : { kind: 'error', message: `Relance enregistrÃ©e mais e-mail non dÃ©livrÃ© : ${result.error}` });
      } else {
        toast({ kind: 'success', message: `Relance ${reminderCount} enregistrÃ©e.` });
      }
      reload();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const normalizeInvoice = async (invoice: Invoice) => {
    if (!canNormalizeInvoice(invoice, profile)) {
      toast({ kind: 'info', message: 'Completez le profil RDC (NIF, RCCM, DEF) pour faire passer la facture a l etape de normalisation.' });
      return;
    }
    try {
      await updateInvoice(invoice.id, {
        normalization_status: 'normalized',
        normalized_at: new Date().toISOString(),
        verification_code: buildVerificationCode(invoice, profile),
        device_id: profile?.def_device_id || null,
        normalized_qr_payload: buildInvoiceQrPayload(invoice, profile),
      });
      await logAction('invoice.normalize', 'invoice', invoice.id, { number: invoice.number });
      reload();
      toast({ kind: 'success', message: 'Facture standard convertie en facture normalisee locale, en attente du branchement API DGI.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const removeInvoice = async (invoice: Invoice) => {
    if (!confirm(`Supprimer ${isInvoicesTab ? 'la facture' : 'le devis'} ${invoice.number || ''} ?`)) return;
    try {
      await deleteInvoice(invoice.id);
      reload();
      toast({ kind: 'success', message: 'Element supprime.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Facturation</h1>
          <p className="mt-1 text-sm text-ink-500">{list.length} {isInvoicesTab ? 'facture(s)' : 'devis'} - {formatTotals(stats.paid)} encaissees</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={16} /> {isInvoicesTab ? 'Nouvelle facture standard' : 'Nouveau devis'}</button>
      </div>

      <div className="card p-1.5"><div className="flex gap-1">{[
        { id: 'invoices' as const, label: 'Factures', count: invoices.filter((invoice) => !invoice.is_quote).length },
        { id: 'quotes' as const, label: 'Devis', count: invoices.filter((invoice) => invoice.is_quote).length },
      ].map((tabOption) => (
        <button key={tabOption.id} onClick={() => { setTab(tabOption.id); setStatusFilter('all'); setSearch(''); }} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${tab === tabOption.id ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-600 hover:bg-ink-100'}`}>
          <span>{tabOption.label}</span><span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === tabOption.id ? 'bg-white/20' : 'bg-ink-100'}`}>{tabOption.count}</span>
        </button>
      ))}</div></div>

      {isInvoicesTab && <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Parcours DGI</p>
            <h2 className="mt-1 font-display text-lg font-bold text-ink-950">Facture standard puis normalisation</h2>
            <p className="mt-1 text-sm text-ink-500">Les factures sont emises en standard, puis passent a la normalisation quand le profil fiscal RDC est complet et que le flux DGI est pret.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-ink-100 px-3 py-2 text-sm text-ink-700"><span className="font-semibold">{normalizationWorkflow.standard}</span> standard</div>
            <div className="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800"><span className="font-semibold">{normalizationWorkflow.ready}</span> prete(s) a normaliser</div>
            <div className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800"><span className="font-semibold">{normalizationWorkflow.normalized}</span> normalisee(s)</div>
            <div className={normalizationWorkflow.profileReady ? 'rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800' : 'rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800'}>{normalizationWorkflow.profileReady ? 'Profil fiscal complet' : 'Profil fiscal a completer'}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">1. Emettre</p><p className="mt-1 text-sm font-semibold text-ink-900">Creer la facture standard en CDF</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">2. Verifier</p><p className="mt-1 text-sm font-semibold text-ink-900">NIF, RCCM, DEF et client identifies</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">3. Preparer</p><p className="mt-1 text-sm font-semibold text-ink-900">Facture marquee prete a normaliser</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">4. Normaliser</p><p className="mt-1 text-sm font-semibold text-ink-900">Conversion locale en attendant le branchement DGI</p></div>
        </div>
        {normalizationWorkflow.priority.length > 0 && <div className="mt-4 rounded-2xl bg-warning-50 p-4 ring-1 ring-warning-100"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-warning-900">Factures a normaliser en priorite</p><p className="text-xs text-warning-800">Ces factures sont deja dans l etat pret a normaliser.</p></div><span className="text-xs font-medium text-warning-800">{normalizationWorkflow.priority.length} priorite(s)</span></div><div className="mt-3 grid gap-2 lg:grid-cols-2">{normalizationWorkflow.priority.map((invoice) => <div key={invoice.id} className="rounded-xl bg-white px-3 py-2"><p className="text-sm font-medium text-ink-900">{invoice.number || '-'} - {invoice.customer_name}</p><p className="mt-1 text-xs text-ink-500">{fmtDate(invoice.issue_date)} | {fmtMoney(invoice.total, getInvoiceCurrency(invoice))}</p></div>)}</div></div>}
      </div>}

      {isInvoicesTab && <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="flex items-center gap-2 text-sm text-ink-500"><CheckCircle2 size={16} className="text-success-600" /> Encaisse</div><p className="mt-2 font-display text-xl font-extrabold text-ink-950">{formatTotals(stats.paid)}</p></div>
        <div className="card p-5"><div className="flex items-center gap-2 text-sm text-ink-500"><Clock size={16} className="text-brand-600" /> En attente</div><p className="mt-2 font-display text-xl font-extrabold text-ink-950">{formatTotals(stats.pending)}</p></div>
        <div className="card p-5"><div className="flex items-center gap-2 text-sm text-ink-500"><AlertCircle size={16} className="text-danger-600" /> En retard</div><p className="mt-2 font-display text-xl font-extrabold text-ink-950">{formatTotals(stats.overdue)}</p></div>
      </div>}


      {isInvoicesTab && <div className="card p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-base font-bold text-ink-900">File de normalisation DGI</h2><p className="mt-1 text-xs text-ink-500">Suivi operationnel des factures deja pretes a passer a l etape de normalisation locale.</p></div><div className="flex flex-wrap gap-2">{normalizationMissingFields.length === 0 ? <span className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800">Profil pret pour NIF / RCCM / DEF</span> : <span className="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800">Champs a completer : {normalizationMissingFields.join(', ')}</span>}</div></div><div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr,0.85fr]"><div className="space-y-2">{normalizationWorkflow.priority.length === 0 ? <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">Aucune facture prete a normaliser pour le moment. Commencez par envoyer une facture avec un profil fiscal RDC complet.</div> : normalizationWorkflow.priority.map((invoice) => <div key={invoice.id} className="rounded-xl bg-ink-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-ink-900">{invoice.number || '-'} - {invoice.customer_name}</p><p className="mt-1 text-xs text-ink-500">Emission {fmtDate(invoice.issue_date)} | {fmtMoney(invoice.total, getInvoiceCurrency(invoice))}</p></div><button onClick={() => normalizeInvoice(invoice)} className="btn-secondary text-xs"><FileSignature size={14} /> Normaliser</button></div></div>)}</div><div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200"><p className="text-sm font-semibold text-brand-900">Lecture du flux</p><div className="mt-3 space-y-2 text-sm text-brand-900"><div className="rounded-xl bg-white px-3 py-2">Facture standard : {normalizationWorkflow.standard}</div><div className="rounded-xl bg-white px-3 py-2">Prete a normaliser : {normalizationWorkflow.ready}</div><div className="rounded-xl bg-white px-3 py-2">Normalisee localement : {normalizationWorkflow.normalized}</div></div><p className="mt-3 text-xs text-brand-800">La normalisation locale prepare les identifiants, le code et le QR. Le televersement officiel vers la DGI sera branche ensuite via les API DEF/DGI.</p></div></div></div>}

      <div className="card p-4"><div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Rechercher par client ou numero" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')} className="input w-auto"><option value="all">Tous statuts</option><option value="draft">Brouillon</option><option value="sent">Envoyee</option><option value="paid">Payee</option><option value="overdue">En retard</option></select></div></div>

      <div className="card overflow-hidden"><div className="overflow-x-auto scrollbar-thin"><table className="w-full table-fixed text-[13px]"><thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500"><th className="px-4 py-3 font-semibold">Numero</th><th className="px-4 py-3 font-semibold">Client</th><th className="px-4 py-3 font-semibold">Emission</th><th className="px-4 py-3 font-semibold">Echeance</th><th className="px-4 py-3 text-right font-semibold">Montant</th><th className="px-4 py-3 font-semibold">Statut</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-ink-100">
      {loading && Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={7} className="px-4 py-3"><div className="skeleton h-10" /></td></tr>)}
      {!loading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-500">Aucun {isInvoicesTab ? 'facture' : 'devis'} pour le moment.</td></tr>}
      {!loading && paged.map((invoice) => {
        const effectiveStatus = effectiveInvoiceStatus(invoice);
        const normalizationStatus = getInvoiceNormalizationStatus(invoice, profile);
        const invoiceCurrency = getInvoiceCurrency(invoice);
        const invoiceExchangeRate = readInvoiceExchangeRate(invoice.notes);
        const invoiceUsdAmount = invoiceExchangeRate ? computeUsdAmount(invoice.total, invoiceCurrency, invoiceExchangeRate) : null;
        const isCreditNote = isCreditNoteInvoice(invoice);
        const settledAmount = settledByInvoice.get(invoice.id) || 0;
        const creditedAmount = creditedByInvoice.get(invoice.id) || 0;
        const refundedAmount = refundedByCreditNote.get(invoice.id) || 0;
        const residualAmount = isCreditNote
          ? Math.max(0, Number(invoice.total || 0) - refundedAmount)
          : Math.max(0, Number(invoice.total || 0) - settledAmount - creditedAmount);
        const refundableAmount = Math.max(0, Number(invoice.total || 0) - refundedAmount);

        const meta = statusMeta[effectiveStatus];
        return <tr key={invoice.id} className="hover:bg-ink-50/60 transition"><td className="px-4 py-3 font-mono text-xs text-ink-600">{invoice.number || '-'}</td><td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-xs font-semibold text-brand-700">{initials(invoice.customer_name)}</div><div><p className="font-medium text-ink-900">{invoice.customer_name}</p>{invoice.customer_email && <p className="text-xs text-ink-500">{invoice.customer_email}</p>}</div></div></td><td className="px-4 py-3 whitespace-nowrap text-ink-600">{fmtDate(invoice.issue_date)}</td><td className="px-4 py-3 whitespace-nowrap text-ink-600">{fmtDate(invoice.due_date)}</td><td className="px-4 py-3 text-right text-ink-900"><p className="font-semibold">{fmtMoney(invoice.total, invoiceCurrency)}</p>{invoiceUsdAmount ? <><p className="text-xs text-ink-500">{fmtMoney(invoiceUsdAmount, 'USD')}</p><p className="text-[11px] text-ink-400">Taux: 1 USD = {invoiceExchangeRate?.toLocaleString('fr-CD')} CDF</p></> : null}{!invoice.is_quote && <><p className="mt-1 text-xs text-ink-500">Encaisse: {fmtMoney(Math.min(settledAmount, Number(invoice.total || 0)), invoiceCurrency)}</p><p className="text-xs font-medium text-ink-700">Reste: {fmtMoney(residualAmount, invoiceCurrency)}</p></>}</td><td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><Badge tone={meta.tone}><meta.icon size={12} /> {meta.label}</Badge>{isInvoicesTab && invoice.reminder_count > 0 && <span className="flex items-center gap-1 text-xs text-ink-500"><Bell size={11} /> {invoice.reminder_count} relance(s)</span>}{!invoice.is_quote && <span className="text-xs text-ink-500">{getInvoiceNormalizationLabel(normalizationStatus)}</span>}</div></td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button onClick={() => setViewing(invoice)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900" title="Apercu"><Eye size={16} /></button>{!invoice.is_quote && normalizationStatus !== 'normalized' && <button onClick={() => normalizeInvoice(invoice)} className="rounded-lg p-1.5 text-accent-700 hover:bg-accent-50" title="Normaliser"><FileSignature size={16} /></button>}{effectiveStatus === 'draft' && <button onClick={() => sendInvoice(invoice)} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" title="Envoyer"><Send size={16} /></button>}{!invoice.is_quote && !isCreditNoteInvoice(invoice) && <button onClick={() => openCreditNoteModal(invoice)} className="rounded-lg p-1.5 text-accent-700 hover:bg-accent-50" title="Creer un avoir"><FileText size={16} /></button>}{isCreditNote && refundableAmount > 0.01 && <button onClick={() => openCreditNoteRefundModal(invoice)} className="rounded-lg p-1.5 text-success-600 hover:bg-success-50" title="Rembourser l avoir"><CheckCircle2 size={16} /></button>}{!invoice.is_quote && (effectiveStatus === 'sent' || effectiveStatus === 'overdue' || residualAmount > 0.01) && <><button onClick={() => sendReminder(invoice)} className="rounded-lg p-1.5 text-warning-600 hover:bg-warning-50" title="Relancer"><Bell size={16} /></button><button onClick={() => openPaymentModal(invoice)} className="rounded-lg p-1.5 text-success-600 hover:bg-success-50" title="Enregistrer un paiement"><CheckCircle2 size={16} /></button></>}{invoice.is_quote && effectiveStatus === 'sent' && <button onClick={() => convertQuote(invoice)} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" title="Convertir en facture"><FileText size={16} /></button>}<button onClick={() => removeInvoice(invoice)} className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600" title="Supprimer"><Trash2 size={16} /></button></div></td></tr>;
      })}
      </tbody></table></div><Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={pageSize} /></div>

      <InvoiceEditor open={createOpen} onClose={() => setCreateOpen(false)} number={nextNumber} isQuote={!isInvoicesTab} profile={profile} userEmail={user?.email || ''} customers={customers} catalogItems={catalogItems} categories={categories} onSaved={() => { reload(); reloadCustomers(); reloadCatalogItems(); reloadTransactions(); setCreateOpen(false); }} />
      <InvoicePaymentModal
        draft={paymentDraft}
        settledAmount={paymentDraft ? (settledByInvoice.get(paymentDraft.invoice.id) || 0) : 0}
        onClose={() => setPaymentDraft(null)}
        onSave={recordInvoicePayment}
        onChange={setPaymentDraft}
      />
      <InvoiceCreditNoteModal
        draft={creditNoteDraft}
        creditedAmount={creditNoteDraft ? (creditedByInvoice.get(creditNoteDraft.invoice.id) || 0) : 0}
        onClose={() => setCreditNoteDraft(null)}
        onSave={createCreditNote}
        onChange={setCreditNoteDraft}
      />
      <InvoiceCreditNoteRefundModal
        draft={creditNoteRefundDraft}
        refundedAmount={creditNoteRefundDraft ? (refundedByCreditNote.get(creditNoteRefundDraft.creditNote.id) || 0) : 0}
        onClose={() => setCreditNoteRefundDraft(null)}
        onSave={recordCreditNoteRefund}
        onChange={setCreditNoteRefundDraft}
      />
      <InvoicePreview invoice={viewing} profile={profile} onClose={() => setViewing(null)} previewMode={false} />
    </div>
  );
}

function InvoiceEditor({
  open,
  onClose,
  number,
  isQuote,
  profile,
  userEmail,
  customers,
  catalogItems,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  number: string;
  isQuote: boolean;
  profile: Profile | null;
  userEmail: string;
  customers: Customer[];
  catalogItems: CatalogItem[];
  categories: Category[];
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState(number);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerRccm, setCustomerRccm] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>('Virement bancaire');
  const [headerNote, setHeaderNote] = useState('');
  const [notes, setNotes] = useState('');
  const [nonTaxableAmount, setNonTaxableAmount] = useState(0);
  const [otherTaxesAmount, setOtherTaxesAmount] = useState(0);
  const [currency] = useState<InvoiceCurrency>('CDF');
  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([{ id: crypto.randomUUID(), catalog_item_id: null, description: '', quantity: 1, unit_price: 0, vat_rate: RDC_STANDARD_VAT_RATE }]);

  useEffect(() => {
    if (open) setInvoiceNumber(number);
  }, [number, open]);

  const activeCustomers = useMemo(() => customers.filter((customer) => customer.active !== false), [customers]);
  const activeCatalogItems = useMemo(() => catalogItems.filter((item) => item.active !== false), [catalogItems]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let vatTotal = 0;
    for (const item of items) {
      const lineTotal = Number(item.quantity) * Number(item.unit_price);
      subtotal += lineTotal;
      vatTotal += (lineTotal * Number(item.vat_rate)) / 100;
    }
    const cappedNonTaxable = Math.max(0, Math.min(subtotal, Number(nonTaxableAmount || 0)));
    const adjustedVatTotal = Math.max(0, vatTotal - (cappedNonTaxable * RDC_STANDARD_VAT_RATE) / 100);
    return {
      subtotal,
      vatTotal: adjustedVatTotal,
      total: subtotal + adjustedVatTotal + Number(otherTaxesAmount || 0),
    };
  }, [items, nonTaxableAmount, otherTaxesAmount]);

  const compliance = useMemo(
    () => getInvoiceComplianceChecks({ number: invoiceNumber, issue_date: issueDate, total: totals.total, vat_total: totals.vatTotal, customer_name: customerName }, profile),
    [customerName, issueDate, invoiceNumber, profile, totals.total, totals.vatTotal],
  );

  const effectiveExchangeRate = useMemo(() => parseExchangeRateValue(exchangeRateInput), [exchangeRateInput]);
  const usdEquivalent = useMemo(() => computeUsdAmount(totals.total, currency, effectiveExchangeRate), [currency, effectiveExchangeRate, totals.total]);
  const invoiceNotes = useMemo(() => buildInvoiceNotes(headerNote, notes, effectiveExchangeRate), [effectiveExchangeRate, headerNote, notes]);

  const previewInvoice = useMemo<Invoice>(() => ({
    id: 'preview-invoice',
    user_id: user?.id || 'preview-user',
    customer_id: selectedCustomerId || null,
    number: invoiceNumber.trim() || number,
    customer_name: customerName.trim() || 'Client a renseigner',
    customer_email: customerEmail.trim() || null,
    customer_address: customerAddress.trim() || null,
    customer_siren: customerTaxId.trim() || customerRccm.trim() || null,
    customer_tax_id: customerTaxId.trim() || null,
    customer_rccm: customerRccm.trim() || null,
    issue_date: issueDate,
    due_date: dueDate,
    status: 'draft',
    subtotal: totals.subtotal,
    vat_total: totals.vatTotal,
    total: totals.total,
    currency,
    notes: invoiceNotes,
    paid_at: null,
    is_quote: isQuote,
    reminder_count: 0,
    last_reminder_at: null,
    payment_method: paymentMethod,
    normalization_status: 'standard',
    normalized_at: null,
    verification_code: null,
    device_id: profile?.def_device_id || null,
    other_taxes_amount: Number(otherTaxesAmount || 0),
    non_taxable_amount: Number(nonTaxableAmount || 0),
    normalized_qr_payload: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: items.filter((item) => item.description.trim()).map((item) => ({
      id: item.id,
      invoice_id: 'preview-invoice',
      catalog_item_id: item.catalog_item_id || null,
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      vat_rate: Number(item.vat_rate),
      line_total: Number(item.quantity) * Number(item.unit_price),
      created_at: new Date().toISOString(),
    })),
  }), [currency, customerAddress, customerEmail, customerName, customerRccm, customerTaxId, dueDate, invoiceNotes, invoiceNumber, isQuote, issueDate, items, number, otherTaxesAmount, paymentMethod, profile?.def_device_id, selectedCustomerId, totals.subtotal, totals.total, totals.vatTotal, user?.id]);

  const updateItem = (id: string, patch: Partial<DraftItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addItem = () => setItems((current) => [...current, { id: crypto.randomUUID(), catalog_item_id: null, description: '', quantity: 1, unit_price: 0, vat_rate: RDC_STANDARD_VAT_RATE }]);
  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  const applyCustomer = (customer: Customer | undefined) => {
    if (!customer) return;
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name || '');
    setCustomerEmail(customer.email || '');
    setCustomerAddress(customer.address || '');
    setCustomerTaxId(customer.tax_id || '');
    setCustomerRccm(customer.rccm || '');
  };

  const applyCatalogItem = (draftId: string, catalogItemId: string) => {
    const catalogItem = activeCatalogItems.find((item) => item.id === catalogItemId);
    if (!catalogItem) {
      updateItem(draftId, { catalog_item_id: null });
      return;
    }
    updateItem(draftId, {
      catalog_item_id: catalogItem.id,
      description: catalogItem.description || catalogItem.name,
      unit_price: Number(catalogItem.unit_price || 0),
      vat_rate: Number(catalogItem.vat_rate ?? RDC_STANDARD_VAT_RATE),
    });
  };

  const reset = () => {
    setInvoiceNumber(number);
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerTaxId('');
    setCustomerRccm('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    setPaymentMethod('Virement bancaire');
    setHeaderNote('');
    setNotes('');
    setNonTaxableAmount(0);
    setOtherTaxesAmount(0);
    setExchangeRateInput('');
    setPreviewOpen(false);
    setItems([{ id: crypto.randomUUID(), catalog_item_id: null, description: '', quantity: 1, unit_price: 0, vat_rate: RDC_STANDARD_VAT_RATE }]);
  };


  const openPreview = () => {
    if (!invoiceNumber.trim()) return toast({ kind: 'error', message: 'Le numero de facture est requis pour l apercu.' });
    if (!customerName.trim()) return toast({ kind: 'error', message: 'Le nom du client est requis pour l apercu.' });
    if (items.filter((item) => item.description.trim()).length === 0) return toast({ kind: 'error', message: 'Ajoutez au moins une ligne pour l apercu.' });
    setPreviewOpen(true);
  };

  const save = async (status: InvoiceStatus) => {
    if (!user) return;
    const validItems = items.filter((item) => item.description.trim());
    if (!customerName.trim()) return toast({ kind: 'error', message: 'Le nom du client est requis.' });
    if (!invoiceNumber.trim()) return toast({ kind: 'error', message: 'Le numero de facture est requis.' });
    if (validItems.length === 0) return toast({ kind: 'error', message: 'Ajoutez au moins une ligne.' });

    try {
      let customerId = selectedCustomerId || null;
      const normalizedCustomerName = customerName.trim().toLowerCase();
      const matchedCustomer = customerId
        ? activeCustomers.find((customer) => customer.id === customerId)
        : activeCustomers.find((customer) => customer.name.trim().toLowerCase() === normalizedCustomerName);

      if (matchedCustomer) {
        customerId = matchedCustomer.id;
      } else {
        const createdCustomer = await insertCustomer({
          user_id: user.id,
          name: customerName.trim(),
          email: customerEmail.trim() || null,
          address: customerAddress.trim() || null,
          tax_id: customerTaxId.trim() || null,
          rccm: customerRccm.trim() || null,
          notes: null,
          active: true,
        });
        customerId = createdCustomer.id;
      }

      const preparedItems = [] as Array<{
        catalog_item_id?: string | null;
        description: string;
        quantity: number;
        unit_price: number;
        vat_rate: number;
        line_total: number;
      }>;

      for (const item of validItems) {
        let catalogItemId = item.catalog_item_id || null;
        const normalizedDescription = item.description.trim().toLowerCase();
        const matchedCatalogItem = catalogItemId
          ? activeCatalogItems.find((catalogItem) => catalogItem.id === catalogItemId)
          : activeCatalogItems.find((catalogItem) => catalogItem.name.trim().toLowerCase() === normalizedDescription);

        if (matchedCatalogItem) {
          catalogItemId = matchedCatalogItem.id;
        } else {
          const createdCatalogItem = await insertCatalogItem({
            user_id: user.id,
            name: item.description.trim(),
            description: item.description.trim(),
            sku: null,
            item_type: 'service',
            unit_price: Number(item.unit_price),
            vat_rate: Number(item.vat_rate),
            currency,
            active: true,
          });
          catalogItemId = createdCatalogItem.id;
        }

        preparedItems.push({
          catalog_item_id: catalogItemId,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_rate: Number(item.vat_rate),
          line_total: Number(item.quantity) * Number(item.unit_price),
        });
      }

      const createdInvoice = await createInvoice({
        user_id: user.id,
        customer_id: customerId,
        number: invoiceNumber.trim(),
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_address: customerAddress.trim() || null,
        customer_siren: customerTaxId.trim() || customerRccm.trim() || null,
        customer_tax_id: customerTaxId.trim() || null,
        customer_rccm: customerRccm.trim() || null,
        issue_date: issueDate,
        due_date: dueDate,
        status,
        subtotal: totals.subtotal,
        vat_total: totals.vatTotal,
        total: totals.total,
        currency,
        payment_method: paymentMethod,
        other_taxes_amount: Number(otherTaxesAmount || 0),
        non_taxable_amount: Number(nonTaxableAmount || 0),
        notes: invoiceNotes,
        is_quote: isQuote,
        normalization_status: 'standard',
      }, preparedItems);
      if (!isQuote && status !== 'draft') {
        await insertTransactions([
          buildInvoiceIssueTransaction(
            user.id,
            { ...createdInvoice, items: preparedItems.map((item, index) => ({
              id: `${createdInvoice.id}-${index}`,
              invoice_id: createdInvoice.id,
              catalog_item_id: item.catalog_item_id || null,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              vat_rate: item.vat_rate,
              line_total: item.line_total,
              created_at: createdInvoice.created_at,
            })) },
            categories,
            preparedItems.map((item) => item.description),
          ),
        ]);
      }
      await logAction('invoice.create', 'invoice', createdInvoice.id, { number: invoiceNumber.trim(), status, isQuote, total: totals.total, currency, customer_id: customerId, payment_method: paymentMethod, exchange_rate: effectiveExchangeRate });
      toast({ kind: 'success', message: status === 'draft' ? `${isQuote ? 'Devis' : 'Facture'} personnalise(e) enregistree.` : `${isQuote ? 'Devis' : 'Facture'} personnalise(e) creee et marquee envoyee.` });
      reset();
      onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <>
      <Modal
      open={open}
      onClose={onClose}
      title={isQuote ? 'Nouveau devis' : 'Nouvelle facture standard'}
      size="xl"
        footer={<><button onClick={onClose} className="btn-ghost">Annuler</button><button onClick={openPreview} className="btn-secondary"><Eye size={16} /> Apercu</button><button onClick={() => save('draft')} className="btn-secondary"><FileText size={16} /> Brouillon</button><button onClick={() => save('sent')} className="btn-primary"><Send size={16} /> Creer et envoyer</button></>}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 p-4">
          <div><p className="text-xs text-ink-500">Numero</p><input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())} className="input mt-1 w-[240px] font-mono" /></div>
          <div><p className="text-xs text-ink-500">Emetteur</p><p className="font-semibold text-ink-900">{profile?.company_name || 'Mon activite'}</p><p className="text-xs text-ink-500">{userEmail}</p><p className="text-xs text-ink-400">Serie configuree : {profile?.invoice_series || 'FAC'}</p></div>
        </div>
        {!isQuote && <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-200"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-brand-800">Facture standard puis normalisation DGI</p><p className="text-xs text-brand-700">Code local : {buildVerificationCode({ number: invoiceNumber, issue_date: issueDate, total: totals.total, vat_total: totals.vatTotal }, profile)}</p></div><Badge tone={compliance.score >= 80 ? 'success' : 'warning'}>{compliance.score}% conforme</Badge></div><p className="mt-2 text-xs text-brand-700">La facture est creee d abord comme facture standard. La normalisation se fait ensuite depuis la liste des factures.</p></div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="label">Client enregistre</label><select value={selectedCustomerId} onChange={(e) => applyCustomer(activeCustomers.find((customer) => customer.id === e.target.value))} className="input"><option value="">Selectionner un client</option>{activeCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
          <div><label className="label">Client *</label><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" placeholder="Nom du client" /></div>
          <div><label className="label">E-mail</label><input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="input" placeholder="client@example.com" /></div>
          <div><label className="label">NIF client</label><input value={customerTaxId} onChange={(e) => setCustomerTaxId(e.target.value)} className="input" placeholder="Identifiant fiscal" /></div>
          <div><label className="label">RCCM client</label><input value={customerRccm} onChange={(e) => setCustomerRccm(e.target.value)} className="input" placeholder="Reference RCCM" /></div>
          <div><label className="label">Adresse</label><input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="input" placeholder="Adresse du client" /></div>
          <div><label className="label">Devise de facturation</label><input value="Franc congolais (CDF)" className="input" readOnly /></div>
          <div><label className="label">Taux CDF/USD (facultatif)</label><input type="number" step="0.0001" min="0" value={exchangeRateInput} onChange={(e) => setExchangeRateInput(e.target.value)} className="input" placeholder="Ex : 2850" /></div>
          <div><label className="label">Mode de paiement</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])} className="input">{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></div>
          <div><label className="label">Date d emission</label><input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input" /></div>
          <div><label className="label">{isQuote ? 'Validite du devis' : 'Date d echeance'}</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" /></div>
          <div><label className="label">Mention d entete</label><input value={headerNote} onChange={(e) => setHeaderNote(e.target.value)} className="input" placeholder="Ex : Merci pour votre confiance" /></div>
        </div>
        <div><div className="flex items-center justify-between"><label className="label mb-0">Lignes</label><button onClick={addItem} className="btn-ghost text-sm"><Plus size={14} /> Ajouter une ligne</button></div><div className="mt-2 space-y-2">{items.map((item) => <div key={item.id} className="grid grid-cols-12 items-center gap-2"><select className="input col-span-12 sm:col-span-3" value={item.catalog_item_id || ''} onChange={(e) => applyCatalogItem(item.id, e.target.value)}><option value="">Article / service</option>{activeCatalogItems.map((catalogItem) => <option key={catalogItem.id} value={catalogItem.id}>{catalogItem.name}</option>)}</select><input className="input col-span-12 sm:col-span-3" placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} /><input type="number" step="0.01" className="input col-span-4 text-right sm:col-span-1" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} /><input type="number" step="0.01" className="input col-span-4 text-right sm:col-span-2" value={item.unit_price} onChange={(e) => updateItem(item.id, { unit_price: Number(e.target.value) })} /><select className="input col-span-2 px-1 sm:col-span-1" value={item.vat_rate} onChange={(e) => updateItem(item.id, { vat_rate: Number(e.target.value) })}><option value={0}>0%</option><option value={RDC_STANDARD_VAT_RATE}>{RDC_STANDARD_VAT_RATE}%</option></select><div className="col-span-1 text-right text-sm font-semibold text-ink-900">{fmtMoney(Number(item.quantity) * Number(item.unit_price), currency)}</div><button onClick={() => removeItem(item.id)} className="col-span-1 rounded-lg p-1 text-ink-400 hover:bg-danger-50 hover:text-danger-600"><Trash2 size={14} /></button></div>)}</div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><label className="label">Montant non taxable</label><input type="number" step="0.01" value={nonTaxableAmount} onChange={(e) => setNonTaxableAmount(Number(e.target.value))} className="input" /></div><div><label className="label">Autres taxes / frais</label><input type="number" step="0.01" value={otherTaxesAmount} onChange={(e) => setOtherTaxesAmount(Number(e.target.value))} className="input" /></div><div className="sm:col-span-2"><label className="label">Notes et conditions</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[88px]" placeholder="Conditions de paiement, references, mentions commerciales" /></div></div>
        <div className="ml-auto w-full max-w-sm space-y-2 rounded-xl bg-ink-50 p-4"><div className="flex justify-between text-sm text-ink-600"><span>Sous-total HT</span><span className="font-medium">{fmtMoney(totals.subtotal, currency)}</span></div><div className="flex justify-between text-sm text-ink-600"><span>Part non taxable</span><span className="font-medium">{fmtMoney(nonTaxableAmount, currency)}</span></div><div className="flex justify-between text-sm text-ink-600"><span>TVA RDC</span><span className="font-medium">{fmtMoney(totals.vatTotal, currency)}</span></div><div className="flex justify-between text-sm text-ink-600"><span>Autres taxes / frais</span><span className="font-medium">{fmtMoney(otherTaxesAmount, currency)}</span></div>{effectiveExchangeRate ? <><div className="flex justify-between text-sm text-ink-600"><span>Taux CDF/USD</span><span className="font-medium">1 USD = {effectiveExchangeRate.toLocaleString('fr-CD')} CDF</span></div><div className="flex justify-between text-sm text-ink-600"><span>Montant en dollars</span><span className="font-medium">{fmtMoney(usdEquivalent, 'USD')}</span></div></> : null}<div className="flex justify-between border-t border-ink-200 pt-2 font-display text-lg font-extrabold text-ink-950"><span>Total TTC</span><span>{fmtMoney(totals.total, currency)}</span></div></div>
      </div>
      </Modal>
      <InvoicePreview invoice={previewOpen ? previewInvoice : null} profile={profile} onClose={() => setPreviewOpen(false)} previewMode />
    </>
  );
}

function InvoicePaymentModal({
  draft,
  settledAmount,
  onClose,
  onSave,
  onChange,
}: {
  draft: InvoicePaymentDraft | null;
  settledAmount: number;
  onClose: () => void;
  onSave: () => void;
  onChange: (draft: InvoicePaymentDraft | null) => void;
}) {
  if (!draft) return null;

  const currency = getInvoiceCurrency(draft.invoice);
  const residualAmount = Math.max(0, Number(draft.invoice.total || 0) - Number(settledAmount || 0));

  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      title={`Enregistrer un paiement - ${draft.invoice.number || ''}`}
      size="md"
      footer={<><button onClick={onClose} className="btn-ghost">Annuler</button><button onClick={onSave} className="btn-primary"><CheckCircle2 size={16} /> Comptabiliser le paiement</button></>}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
          <p><span className="font-semibold text-ink-900">Client:</span> {draft.invoice.customer_name}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Total facture:</span> {fmtMoney(draft.invoice.total, currency)}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Deja encaisse:</span> {fmtMoney(Math.min(settledAmount, Number(draft.invoice.total || 0)), currency)}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Solde restant:</span> {fmtMoney(residualAmount, currency)}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Date du paiement</label>
            <input type="date" value={draft.paymentDate} onChange={(e) => onChange({ ...draft, paymentDate: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Montant recu</label>
            <input type="number" step="0.01" min="0" max={residualAmount} value={draft.amount} onChange={(e) => onChange({ ...draft, amount: Number(e.target.value) })} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Compte de tresorerie</label>
            <select value={draft.treasuryLabel} onChange={(e) => onChange({ ...draft, treasuryLabel: e.target.value as TreasuryAccountLabel })} className="input">
              {TREASURY_ACCOUNT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
function InvoiceCreditNoteModal({
  draft,
  creditedAmount,
  onClose,
  onSave,
  onChange,
}: {
  draft: CreditNoteDraft | null;
  creditedAmount: number;
  onClose: () => void;
  onSave: () => void;
  onChange: (draft: CreditNoteDraft | null) => void;
}) {
  if (!draft) return null;

  const currency = getInvoiceCurrency(draft.invoice);
  const availableAmount = Math.max(0, Number(draft.invoice.total || 0) - Number(creditedAmount || 0));

  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      title={`Creer un avoir - ${draft.invoice.number || ''}`}
      size="md"
      footer={<><button onClick={onClose} className="btn-ghost">Annuler</button><button onClick={onSave} className="btn-primary"><FileText size={16} /> Creer l avoir</button></>}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
          <p><span className="font-semibold text-ink-900">Facture source:</span> {draft.invoice.number}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Client:</span> {draft.invoice.customer_name}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Montant facture:</span> {fmtMoney(draft.invoice.total, currency)}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Avoirs deja emis:</span> {fmtMoney(creditedAmount, currency)}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Montant encore creditable:</span> {fmtMoney(availableAmount, currency)}</p>
        </div>
        <div className="grid gap-3">
          <div>
            <label className="label">Date de l avoir</label>
            <input type="date" value={draft.issueDate} onChange={(e) => onChange({ ...draft, issueDate: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Montant de l avoir</label>
            <input type="number" step="0.01" min="0" max={availableAmount} value={draft.amount} onChange={(e) => onChange({ ...draft, amount: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="label">Motif</label>
            <textarea value={draft.reason} onChange={(e) => onChange({ ...draft, reason: e.target.value })} className="input min-h-[88px]" placeholder="Ex : Retour marchandise, remise commerciale, regularisation de facturation" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
function InvoiceCreditNoteRefundModal({
  draft,
  refundedAmount,
  onClose,
  onSave,
  onChange,
}: {
  draft: CreditNoteRefundDraft | null;
  refundedAmount: number;
  onClose: () => void;
  onSave: () => void;
  onChange: (draft: CreditNoteRefundDraft | null) => void;
}) {
  if (!draft) return null;

  const currency = getInvoiceCurrency(draft.creditNote);
  const availableAmount = Math.max(0, Number(draft.creditNote.total || 0) - Number(refundedAmount || 0));

  return (
    <Modal
      open={!!draft}
      onClose={onClose}
      title={`Rembourser l avoir - ${draft.creditNote.number || ''}`}
      size="md"
      footer={<><button onClick={onClose} className="btn-ghost">Annuler</button><button onClick={onSave} className="btn-primary"><CheckCircle2 size={16} /> Comptabiliser le remboursement</button></>}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
          <p><span className="font-semibold text-ink-900">Avoir:</span> {draft.creditNote.number}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Client:</span> {draft.creditNote.customer_name}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Montant avoir:</span> {fmtMoney(draft.creditNote.total, currency)}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Deja rembourse:</span> {fmtMoney(refundedAmount, currency)}</p>
          <p className="mt-1"><span className="font-semibold text-ink-900">Reste a rembourser:</span> {fmtMoney(availableAmount, currency)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Date du remboursement</label>
            <input type="date" value={draft.refundDate} onChange={(e) => onChange({ ...draft, refundDate: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Montant rembourse</label>
            <input type="number" step="0.01" min="0" max={availableAmount} value={draft.amount} onChange={(e) => onChange({ ...draft, amount: Number(e.target.value) })} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Compte de tresorerie</label>
            <select value={draft.treasuryLabel} onChange={(e) => onChange({ ...draft, treasuryLabel: e.target.value as TreasuryAccountLabel })} className="input">
              {TREASURY_ACCOUNT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
function InvoicePreview({ invoice, profile, onClose, previewMode = false }: { invoice: Invoice | null; profile: Profile | null; onClose: () => void; previewMode?: boolean }) {
  if (!invoice) return null;
  const verificationCode = buildVerificationCode(invoice, profile);
  const qrPayload = buildInvoiceQrPayload(invoice, profile);
  const normalizationStatus = getInvoiceNormalizationStatus(invoice, profile);
  const normalizationLabel = getInvoiceNormalizationLabel(normalizationStatus);
  const compliance = getInvoiceComplianceChecks(invoice, profile);
  const missingNormalizationFields = [
    !profile?.tax_id && !profile?.siren ? 'NIF' : null,
    !profile?.rccm ? 'RCCM' : null,
    !profile?.def_device_id ? 'DEF' : null,
  ].filter(Boolean) as string[];
  const currency = getInvoiceCurrency(invoice);

  const fiscalId = profile?.tax_id || profile?.siren || 'A renseigner';
  const profileWithExtra = profile as (Profile & { idnat?: string | null; email?: string | null; fax?: string | null }) | null;
  const companyLabel = profile?.company_name || 'Mon activite';
  const companyAddressLines = [
    profile?.address,
    [profile?.postal_code, profile?.city].filter(Boolean).join(' '),
  ].filter(Boolean);
  const paymentModeLabel = invoice.payment_method || 'Standard';
  const isCreditNote = isCreditNoteInvoice(invoice);
  const creditNoteSourceNumber = readInvoiceCreditNoteSourceNumber(invoice.notes);
  const storedExchangeRate = readInvoiceExchangeRate(invoice.notes);
  const effectiveInvoiceExchangeRate = currency === 'USD' ? 1 : storedExchangeRate;
  const amountInUsdLabel = effectiveInvoiceExchangeRate ? fmtMoney(computeUsdAmount(invoice.total, currency, effectiveInvoiceExchangeRate), 'USD') : '-';
  const rateLabel = currency === 'USD' ? '1 USD = 1 USD' : (effectiveInvoiceExchangeRate ? `1 USD = ${effectiveInvoiceExchangeRate.toLocaleString('fr-CD')} CDF` : 'Non renseigne');
  const customerTaxOrSiren = invoice.customer_tax_id || invoice.customer_siren || null;
  const customerIdNat = (invoice as Invoice & { customer_idnat?: string | null }).customer_idnat || null;
  const amountInWords = fmtMoneyWords(invoice.total, currency);
  const publicNotes = stripInvoiceMetaNotes(invoice.notes);
  const previewItems = (invoice.items || []) as InvoiceItem[];
  const summaryRows = [
    ...(Number(invoice.vat_total || 0) > 0 ? [{ label: 'TVA (16%)', amount: invoice.vat_total }] : []),
    { label: isCreditNote ? 'Montant de l avoir' : 'Montant a payer', amount: invoice.total, strong: true },
    ];

  const handlePrintInvoice = () => {
    const invoiceRoot = document.querySelector('.print-invoice-root') as HTMLElement | null;
    if (!invoiceRoot) return;

    const printWindow = window.open('', '_blank', 'width=960,height=1280');
    if (!printWindow) return;

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');
    const title = `${invoice.is_quote ? 'Devis' : 'Facture'} ${invoice.number || ''}`;

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    ${styles}
    <style>
      @page {
        size: A4 portrait;
        margin: 6mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-family: Inter, sans-serif;
      }

      .print-shell {
        width: 196mm;
        max-width: 196mm;
        min-width: 196mm;
        margin: 0 auto;
        padding: 0;
      }

      .print-invoice-root {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 100% !important;
        margin: 0 !important;
        gap: 8px !important;
        font-size: 12.2px !important;
        line-height: 1.25 !important;
      }

      .print-invoice-page {
        padding: 14px !important;
        box-shadow: none !important;
      }

      .print-invoice-header {
        display: grid !important;
        grid-template-columns: 170px minmax(0, 1fr) !important;
        align-items: start !important;
        gap: 14px !important;
      }

      .print-invoice-logo-wrap {
        justify-content: flex-start !important;
        align-items: flex-start !important;
      }

      .print-invoice-header-meta {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 235px !important;
        align-items: start !important;
        gap: 14px !important;
      }

      .print-invoice-company {
        padding-top: 2px !important;
      }

      .print-invoice-tax {
        padding-top: 6px !important;
      }

      .print-invoice-customer-block {
        padding: 12px 14px !important;
      }

      .print-invoice-customer-grid {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 275px !important;
        gap: 18px !important;
        align-items: start !important;
      }

      .print-invoice-customer-left {
        display: grid !important;
        gap: 24px !important;
      }

      .print-invoice-customer-right {
        justify-self: stretch !important;
        display: grid !important;
        gap: 6px !important;
        align-content: start !important;
      }

      .print-invoice-customer-row {
        display: grid !important;
        align-items: start !important;
        line-height: 1.22 !important;
      }

      .print-invoice-customer-row-left {
        grid-template-columns: 128px minmax(0, 1fr) !important;
        gap: 10px !important;
      }

      .print-invoice-customer-row-right {
        grid-template-columns: 98px minmax(0, 1fr) !important;
        gap: 10px !important;
      }

      .print-invoice-customer-row > span:first-child {
        white-space: nowrap !important;
      }

      .print-invoice-customer-row > span:last-child {
        white-space: normal !important;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .print-invoice-customer-row-right > span:last-child {
        text-align: right !important;
      }

      .print-invoice-customer-spacer {
        height: 10px !important;
        padding-top: 0 !important;
      }

      .print-invoice-root > * + * {
        margin-top: 8px !important;
      }

      .print-invoice-page > * + * {
        margin-top: 8px !important;
      }

      .print-invoice-table,
      .print-invoice-table th,
      .print-invoice-table td {
        white-space: normal !important;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .print-invoice-table th,
      .print-invoice-table td {
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }

      .print-invoice-footer,
      .print-invoice-note,
      .print-invoice-page,
      .print-invoice-table tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <div class="print-shell">${invoiceRoot.outerHTML}</div>
  </body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  };

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={previewMode ? `Apercu ${invoice.is_quote ? 'du devis' : 'de la facture'} ${invoice.number || ''}` : `${invoice.is_quote ? 'Devis' : 'Facture'} ${invoice.number || ''}`}
      size="xl"
      footer={<><button onClick={onClose} className="btn-ghost">Fermer</button><button onClick={handlePrintInvoice} className="btn-secondary"><Download size={16} /> Imprimer</button></>}
    >
      <div className="print-invoice-root mx-auto max-w-[960px] space-y-5 bg-white text-ink-900 print:w-full">
        <div className="print-invoice-page rounded-2xl border border-ink-300 bg-white p-6 shadow-sm print:break-inside-avoid">
          <div className="print-invoice-header grid items-start gap-4 lg:grid-cols-[165px_minmax(0,1fr)]">
            <div className="print-invoice-logo-wrap flex items-start justify-center pt-1 lg:justify-start">
              {profile?.logo_url
                ? <img src={profile.logo_url} alt="Logo" className="max-h-24 w-auto object-contain" />
                : <div className="grid h-24 w-24 place-items-center rounded-xl bg-ink-900 text-2xl font-bold text-white">{initials(companyLabel)}</div>}
            </div>

            <div className="print-invoice-header-meta grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_255px]">
              <div className="print-invoice-company self-start pt-0.5 text-left">
                <p className="text-[1.12rem] font-extrabold uppercase italic leading-tight text-ink-950">{companyLabel}</p>
                <div className="mt-1 space-y-0.5 text-sm leading-5 text-ink-700">
                  {companyAddressLines.map((line) => <p key={line}>{line}</p>)}
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-ink-700">
                  {profile?.phone && <p>Telephone: {profile.phone}</p>}
                  {profileWithExtra?.email && <p>E-mail: {profileWithExtra.email}</p>}
                </div>
              </div>

              <div className="print-invoice-tax self-start space-y-1.5 pt-1.5 text-sm text-ink-800">
                <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-x-2.5"><span className="font-semibold">RCCM:</span><span>{profile?.rccm || '-'}</span></div>
                <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-x-2.5"><span className="font-semibold">NIF:</span><span>{fiscalId}</span></div>
                <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-x-2.5"><span className="font-semibold">ID-NAT:</span><span>{profileWithExtra?.idnat || '-'}</span></div>
              </div>
            </div>
          </div>

          <div className="print-invoice-banner-wrap mt-4 flex justify-center">
            <div className="print-invoice-banner min-w-[205px] border-[3px] border-ink-950 bg-neutral-300 px-4 py-1 text-center font-display text-[1.08rem] font-bold tracking-tight text-ink-950 shadow-sm">
              {invoice.is_quote ? 'DEVIS No' : 'FACTURE No'} {invoice.number || '-'}
            </div>
          </div>

          <div className="print-invoice-customer-block mt-5 border-[3px] border-ink-950 bg-white px-4 py-4">
            <div className="print-invoice-customer-grid grid gap-6 md:grid-cols-[minmax(0,1fr)_290px]">
              <div className="print-invoice-customer-left space-y-8 text-[13px] text-ink-800">
                <div className="print-invoice-customer-row print-invoice-customer-row-left grid grid-cols-[132px_minmax(0,1fr)] gap-x-3"><span className="font-semibold italic">Client:</span><span>{invoice.customer_name}</span></div>
                <div className="print-invoice-customer-row print-invoice-customer-row-left grid grid-cols-[132px_minmax(0,1fr)] gap-x-3"><span className="font-semibold italic">E-mail:</span><span>{invoice.customer_email || '-'}</span></div>
              </div>

              <div className="print-invoice-customer-right space-y-1.5 text-[13px] text-ink-800">
                <div className="print-invoice-customer-row print-invoice-customer-row-right grid grid-cols-[102px_minmax(0,1fr)] gap-x-3"><span className="font-semibold italic">Document No:</span><span className="text-right">{invoice.number || '-'}</span></div>
                <div className="print-invoice-customer-row print-invoice-customer-row-right grid grid-cols-[102px_minmax(0,1fr)] gap-x-3"><span className="font-semibold italic">Page:</span><span className="text-right">1</span></div>
                <div className="print-invoice-customer-row print-invoice-customer-row-right grid grid-cols-[102px_minmax(0,1fr)] gap-x-3"><span className="font-semibold italic">Date:</span><span className="text-right">{fmtDate(invoice.issue_date)}</span></div>
                <div className="print-invoice-customer-spacer pt-3" />
                <div className="print-invoice-customer-row print-invoice-customer-row-right grid grid-cols-[102px_minmax(0,1fr)] gap-x-3"><span className="font-semibold italic">RCCM:</span><span>{invoice.customer_rccm || '-'}</span></div>
                <div className="print-invoice-customer-row print-invoice-customer-row-right grid grid-cols-[102px_minmax(0,1fr)] gap-x-3"><span className="font-semibold italic">NIF:</span><span>{customerTaxOrSiren || '-'}</span></div>
                <div className="print-invoice-customer-row print-invoice-customer-row-right grid grid-cols-[102px_minmax(0,1fr)] gap-x-3"><span className="font-semibold italic">ID-NAT:</span><span>{customerIdNat || '-'}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 border-[3px] border-ink-950 bg-white text-[13px] text-ink-900">
            <div className="grid grid-cols-[120px_minmax(0,1fr)] border-r border-ink-950 px-4 py-3"><span className="font-semibold italic">Montant en dollars</span><span>{amountInUsdLabel}</span></div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] border-r border-ink-950 px-4 py-3"><span className="font-semibold italic">Taux</span><span>{rateLabel}</span></div>
            <div className="grid grid-cols-[120px_minmax(0,1fr)] px-4 py-3"><span className="font-semibold italic">Mode de paiement</span><span>{paymentModeLabel}</span></div>
          </div>

          {!invoice.is_quote && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-ink-900 print:break-inside-avoid">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Parcours DGI</p>
                  <p className="mt-1 text-sm font-semibold text-ink-950">{normalizationLabel}</p>
                </div>
                <div className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800">
                  Conformite facture: {compliance.score}%
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-1.5">
                  <p>
                    {normalizationStatus === 'normalized'
                      ? 'Facture normalisee localement. Le depot officiel sera branche lorsque les API DGI seront disponibles.'
                      : normalizationStatus === 'ready'
                        ? 'Facture prete pour la normalisation locale avec les references fiscales du fournisseur.'
                        : 'Facture standard active. Completez le profil fiscal du fournisseur pour preparer la normalisation DGI.'}
                  </p>
                  <p className="text-xs text-ink-600">
                    {missingNormalizationFields.length > 0
                      ? `Champs a completer: ${missingNormalizationFields.join(', ')}`
                      : 'Champs fournisseur prets: NIF, RCCM et DEF.'}
                  </p>
                </div>
                <div className="space-y-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-ink-700">
                  <p><span className="font-semibold text-ink-900">Code local:</span> {verificationCode}</p>
                  <p><span className="font-semibold text-ink-900">Etat:</span> {normalizationLabel}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 overflow-hidden border-[3px] border-ink-950 bg-white">
            <table className="print-invoice-table w-full table-fixed text-[13px]">
              <thead className="border-b-[3px] border-ink-950 bg-white text-ink-900">
                <tr>
                  <th className="w-[60px] border-r border-ink-950 px-3 py-2 text-center font-semibold italic">No</th>
                  <th className="border-r border-ink-950 px-4 py-2 text-left font-semibold italic">Designation / Description</th>
                  <th className="w-[150px] border-r border-ink-950 px-3 py-2 text-right font-semibold italic">Prix unitaire</th>
                  <th className="w-[95px] border-r border-ink-950 px-3 py-2 text-center font-semibold italic">Quantite</th>
                  <th className="w-[170px] px-4 py-2 text-right font-semibold italic">Montant total</th>
                </tr>
              </thead>
              <tbody className="align-top">
                {previewItems.map((item, index) => <tr key={item.id} className={index === 0 ? "" : "border-t border-ink-200"}><td className="border-r border-ink-950 px-3 py-2.5 text-center align-top">{index + 1}</td><td className="border-r border-ink-950 px-4 py-2.5 align-top whitespace-normal break-words leading-5">{item.description}</td><td className="border-r border-ink-950 px-3 py-2.5 text-right align-top">{fmtMoney(item.unit_price, currency)}</td><td className="border-r border-ink-950 px-3 py-2.5 text-center align-top">{item.quantity}</td><td className="px-4 py-2.5 text-right align-top font-medium">{fmtMoney(item.line_total, currency)}</td></tr>)}
                {previewItems.length === 0 && <tr><td className="border-r border-ink-950 px-3 py-4 text-center">1</td><td className="border-r border-ink-950 px-4 py-4">Aucune ligne</td><td className="border-r border-ink-950 px-3 py-4 text-right">{fmtMoney(0, currency)}</td><td className="border-r border-ink-950 px-3 py-4 text-center">0</td><td className="px-4 py-4 text-right">{fmtMoney(0, currency)}</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-0 flex justify-end">
            <div className="w-full max-w-[405px] border-l-[3px] border-r-[3px] border-b-[3px] border-ink-950 bg-white">
              <table className="w-full table-fixed text-[13px] text-ink-900">
                <tbody>
                  {summaryRows.map((row, index) => <tr key={row.label} className={index === summaryRows.length - 1 ? "" : "border-b border-ink-300"}><td className={`border-r border-ink-950 px-4 py-2 font-semibold italic ${row.strong ? "text-[14px]" : ""}`}>{row.label}</td><td className={`px-4 py-2 text-right ${row.strong ? "text-[14px] font-bold" : ""}`}>{fmtMoney(row.amount, currency)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {!invoice.is_quote && <div className="print-invoice-note border border-ink-300 bg-white px-4 py-3 text-sm text-ink-900"><p className="font-semibold">{isCreditNote ? 'Nous annulons :' : 'Nous disons :'} <span className="italic">{amountInWords}</span></p>{isCreditNote && creditNoteSourceNumber ? <p className="mt-1 text-xs text-ink-600">Reference facture d origine : {creditNoteSourceNumber}</p> : null}</div>}

        {publicNotes && <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-800"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">Notes</p><p className="mt-2 whitespace-pre-line leading-6">{publicNotes}</p></div>}

        <div className="print-invoice-footer space-y-4 pt-2 text-[13px] text-ink-800">
          <p className="text-sm font-semibold text-danger-700">Merci de regler cette facture selon l'echeance convenue.</p>
          <div>
            <p className="font-semibold">Remittance Details:</p>
            <div className="mt-2 grid gap-4 md:grid-cols-3">
              <div>
                <p className="font-semibold">Beneficiary Name</p>
                <p>{companyLabel}</p>
                {profile?.iban && <><p className="mt-2 font-semibold">Bank Account</p><p>{profile.iban}</p></>}
                {profile?.bic && <><p className="mt-2 font-semibold">Swift Code</p><p>{profile.bic}</p></>}
              </div>
              <div>
                <p className="font-semibold">Reference fiscale</p>
                <p>{verificationCode}</p>
                <p className="mt-2 font-semibold">Code QR</p>
                <p className="break-all text-xs leading-5">{qrPayload}</p>
              </div>
              <div>
                <p className="font-semibold">Client</p>
                <p>{invoice.customer_name}</p>
                {invoice.customer_email && <p>{invoice.customer_email}</p>}
                {invoice.customer_address && <p>{invoice.customer_address}</p>}
              </div>
            </div>
          </div>
          <p>Merci de signaler toute contestation dans un delai de 14 jours apres reception de cette facture.</p>
        </div>
      </div>
    </Modal>
  );
}
















































