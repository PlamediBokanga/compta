import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  FileText,
  ImageIcon,
  Link2,
  Paperclip,
  ScanLine,
  Sparkles,
  Trash2,
  Upload,
  CheckCircle2,
  Clock,
  Search,
  Unlink,
  Eye,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useCategories } from '../../lib/hooks';
import { insertDocument, insertTransactions, deleteDocument, updateDocument, updateTransaction } from '../../lib/api';
import { logAction } from '../../lib/audit';
import { supabase } from '../../lib/supabase';
import { fmtDate, fmtCDF } from '../../lib/format';
import { suggestCategory } from '../../lib/categorize';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import type { AccountingDocument, DocumentStatus, Transaction } from '../../lib/types';

const statusMeta: Record<DocumentStatus, { label: string; tone: 'brand' | 'success' | 'warning' | 'neutral'; icon: LucideIcon }> = {
  pending: { label: 'En attente', tone: 'warning', icon: Clock },
  ocr_done: { label: 'OCR termine', tone: 'brand', icon: Sparkles },
  matched: { label: 'Rapproche', tone: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejete', tone: 'neutral', icon: FileText },
};

const kindLabel = {
  receipt: 'Recu',
  invoice_in: 'Facture fournisseur',
  invoice_out: 'Facture client',
  bank_statement: 'Releve bancaire',
  other: 'Autre',
};

interface MatchSuggestion {
  transaction: Transaction;
  score: number;
  reason: string;
}

interface ExpenseDraft {
  supplier: string;
  date: string;
  amount: number;
  vatAmount: number;
}

function findSuggestions(doc: AccountingDocument, transactions: Transaction[]): MatchSuggestion[] {
  if (doc.amount == null) return [];
  const docAmount = Number(doc.amount);
  const docDate = doc.date ? new Date(doc.date) : null;
  const suggestions: MatchSuggestion[] = [];

  for (const t of transactions) {
    if (t.document_id || t.direction !== 'out') continue;
    const tAmount = Number(t.amount);
    const amountDiff = Math.abs(tAmount - docAmount);
    const amountPct = amountDiff / Math.max(docAmount, 1);
    let score = 0;
    const reasons: string[] = [];

    if (amountDiff === 0) {
      score += 60;
      reasons.push('montant exact');
    } else if (amountPct <= 0.05) {
      score += 40;
      reasons.push('montant proche');
    } else if (amountPct <= 0.1) {
      score += 15;
      reasons.push('montant approximatif');
    } else {
      continue;
    }

    if (docDate) {
      const tDate = new Date(t.date);
      const daysDiff = Math.abs((docDate.getTime() - tDate.getTime()) / 86400000);
      if (daysDiff <= 3) {
        score += 30;
        reasons.push('date identique');
      } else if (daysDiff <= 7) {
        score += 15;
        reasons.push('date proche');
      } else if (daysDiff <= 30) {
        score += 5;
      } else {
        continue;
      }
    }

    if (doc.supplier && t.label.toLowerCase().includes(doc.supplier.toLowerCase().split(' ')[0])) {
      score += 20;
      reasons.push('fournisseur detecte');
    }

    suggestions.push({ transaction: t, score, reason: reasons.join(' | ') });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
}

export function DocumentsPage() {
  const { user } = useAuth();
  const { items: categories } = useCategories();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<AccountingDocument[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [dragOver, setDragOver] = useState(false);
  const [matching, setMatching] = useState<AccountingDocument | null>(null);
  const [reviewing, setReviewing] = useState<AccountingDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'to_review' | 'created' | 'matched'>('all');

  const load = async () => {
    setLoading(true);
    const [docsRes, txRes] = await Promise.all([
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
    ]);
    if (docsRes.error) toast({ kind: 'error', message: docsRes.error.message });
    setItems((docsRes.data as AccountingDocument[]) ?? []);
    setTransactions((txRes.data as Transaction[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      setProcessing(id);
      try {
        // Upload to Supabase Storage
        const filePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        let fileUrl: string | null = null;
        if (uploadErr) {
          console.warn('Storage upload failed, continuing without URL:', uploadErr.message);
        } else {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
          fileUrl = urlData.publicUrl;
        }

        // Simulated OCR processing
        await new Promise((r) => setTimeout(r, 900 + Math.random() * 800));
        const ocr = simulateOcr(file.name);
        await insertDocument({
          user_id: user.id,
          kind: 'receipt',
          file_name: file.name,
          file_url: fileUrl,
          mime_type: file.type,
          size_bytes: file.size,
          status: 'ocr_done',
          ocr_data: ocr,
          amount: ocr.amount,
          date: ocr.date,
          supplier: ocr.supplier,
          vat_amount: ocr.vat_amount,
        });
        await logAction('document.upload', 'document', undefined, { file: file.name, amount: ocr.amount, supplier: ocr.supplier });
        toast({ kind: 'success', message: `"${file.name}" analyse : ${ocr.supplier} | ${fmtCDF(ocr.amount)}` });
      } catch (e) {
        toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur OCR' });
      } finally {
        setProcessing(null);
      }
    }
    load();
  };

  const remove = async (doc: AccountingDocument) => {
    if (!confirm(`Supprimer "${doc.file_name}" ?`)) return;
    try {
      // Delete file from storage if it exists
      if (doc.file_url) {
        const match = doc.file_url.match(/\/documents\/(.+)$/);
        if (match) {
          await supabase.storage.from('documents').remove([match[1]]);
        }
      }
      await deleteDocument(doc.id);
      load();
      toast({ kind: 'success', message: 'Document supprime.' });
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  const unlink = async (doc: AccountingDocument) => {
    try {
      await updateDocument(doc.id, { status: 'ocr_done', transaction_id: null });
      if (doc.transaction_id) {
        await updateTransaction(doc.transaction_id, { document_id: null, reconciliated: false });
      }
      load();
      toast({ kind: 'success', message: 'Rapprochement annule.' });
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  const createExpense = async (doc: AccountingDocument, draft: ExpenseDraft) => {
    if (!user || doc.transaction_id || transactions.some((transaction) => transaction.document_id === doc.id)) return;
    const amount = Number(draft.amount || 0);
    if (amount <= 0) {
      toast({ kind: 'error', message: 'Le justificatif ne contient pas encore de montant exploitable.' });
      return;
    }

    try {
      const vatAmount = Number(draft.vatAmount || 0);
      const netAmount = amount - vatAmount;
      const vatRate = netAmount > 0 ? Number(((vatAmount / netAmount) * 100).toFixed(2)) : 0;
      const label = `Achat - ${draft.supplier || doc.file_name}`;
      const suggestion = suggestCategory({ label, direction: 'out', amount }, categories);
      const [transaction] = await insertTransactions([{
        user_id: user.id,
        date: draft.date || new Date().toISOString().slice(0, 10),
        label: `Achat - ${doc.supplier || doc.file_name}`,
        amount,
        direction: 'out',
        category_id: null,
        categorization_state: 'uncategorized',
        vat_rate: vatRate,
        vat_amount: vatAmount,
        bank_account_label: null,
        reconciliated: false,
        document_id: doc.id,
        raw: {
          source: 'document_ocr',
          document_id: doc.id,
          supplier: draft.supplier,
          file_name: doc.file_name,
          category_suggestion: suggestion.category?.label ?? null,
        },
      }]);
      await logAction('document.expense_created', 'document', doc.id, { transaction_id: transaction.id, amount });
      toast({ kind: 'success', message: 'Depense creee et justificatif rattache.' });
      load();
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur lors de la creation de la depense.' });
    }
  };
  const categorizeExpense = async (transaction: Transaction, categoryId: string) => {
    try {
      await updateTransaction(transaction.id, {
        category_id: categoryId || null,
        categorization_state: categoryId ? 'manual' : 'uncategorized',
      });
      toast({ kind: 'success', message: categoryId ? 'Categorie de depense mise a jour.' : 'Depense remise a classer.' });
      load();
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur de categorisation.' });
    }
  };
  const stats = useMemo(() => {
    let pending = 0;
    let matched = 0;
    let ocrDone = 0;
    for (const d of items) {
      if (d.status === 'pending') pending++;
      else if (d.status === 'matched') matched++;
      else if (d.status === 'ocr_done') ocrDone++;
    }
    return { pending, matched, ocrDone, total: items.length };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((doc) => {
      const expenseTx = transactions.find((transaction) => transaction.document_id === doc.id);
      const matchesQuery = !query || [doc.file_name, doc.supplier || '', expenseTx?.label || ''].some((value) => value.toLowerCase().includes(query));
      if (!matchesQuery) return false;
      if (viewFilter === 'to_review') return doc.status === 'ocr_done' && !expenseTx && !doc.transaction_id;
      if (viewFilter === 'created') return !!expenseTx;
      if (viewFilter === 'matched') return doc.status === 'matched';
      return true;
    });
  }, [items, transactions, searchQuery, viewFilter]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Achats et justificatifs</h1>
          <p className="mt-1 text-sm text-ink-500">
            Importez vos depenses, recus et factures fournisseur. L analyse extrait les donnees et propose un rapprochement automatique.
          </p>
        </div>
        <button onClick={() => inputRef.current?.click()} className="btn-primary">
          <Upload size={16} /> Importer
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Paperclip size={16} /> Total
          </div>
          <p className="mt-1.5 font-display text-xl font-extrabold text-ink-950">{stats.total}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Clock size={16} className="text-warning-600" /> En attente
          </div>
          <p className="mt-1.5 font-display text-xl font-extrabold text-ink-950">{stats.pending}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <Sparkles size={16} className="text-brand-600" /> OCR termine
          </div>
          <p className="mt-1.5 font-display text-xl font-extrabold text-ink-950">{stats.ocrDone}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <CheckCircle2 size={16} className="text-success-600" /> Rapproches
          </div>
          <p className="mt-1.5 font-display text-xl font-extrabold text-ink-950">{stats.matched}</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`card cursor-pointer border-2 border-dashed p-8 text-center transition ${
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-brand-400 hover:bg-ink-50'
        }`}
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <ScanLine size={24} />
        </div>
        <p className="mt-3 font-semibold text-ink-900">Glissez-deposez vos justificatifs ici</p>
        <p className="mt-1 text-sm text-ink-500">ou cliquez pour parcourir. PNG, JPG, PDF - jusqu'a 10 Mo.</p>
        {processing && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-sm text-brand-700">
            <Sparkles size={14} className="animate-pulse" /> Analyse OCR en cours...
          </div>
        )}
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input pl-9"
            placeholder="Rechercher un fournisseur ou une piece..."
          />
        </div>
        <select
          value={viewFilter}
          onChange={(e) => { setViewFilter(e.target.value as typeof viewFilter); setPage(1); }}
          className="input w-auto min-w-[190px]"
          aria-label="Filtrer les justificatifs"
        >
          <option value="all">Toutes les pieces</option>
          <option value="to_review">A verifier</option>
          <option value="created">Depenses creees</option>
          <option value="matched">Paiements rapproches</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-44 skeleton" />)}
        {!loading && items.length === 0 && (
          <div className="col-span-full card p-10 text-center text-ink-500">
            <ImageIcon size={32} className="mx-auto text-ink-300" />
            <p className="mt-2">Aucune piece. Importez votre premiere depense pour commencer le classement.</p>
          </div>
        )}
        {paged.map((doc) => {
          const meta = statusMeta[doc.status];
          const expenseTx = transactions.find((t) => t.document_id === doc.id);
          const matchedTx = transactions.find((t) => t.id === doc.transaction_id);
          return (
            <div key={doc.id} className="card group p-4 transition hover:shadow-pop">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink-100 text-ink-600">
                  <FileText size={18} />
                </div>
                <div className="flex items-center gap-1">
                  {doc.status === 'matched' && (
                    <button
                      onClick={() => unlink(doc)}
                      className="rounded-lg p-1.5 text-ink-400 opacity-0 transition hover:bg-ink-100 hover:text-ink-700 group-hover:opacity-100"
                      title="Annuler le rapprochement"
                    >
                      <Unlink size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => remove(doc)}
                    className="rounded-lg p-1.5 text-ink-400 opacity-0 transition hover:bg-danger-50 hover:text-danger-600 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-3 truncate text-sm font-medium text-ink-900" title={doc.file_name}>
                {doc.file_name}
              </p>
              <p className="text-xs text-ink-500">{kindLabel[doc.kind]} | {fmtDate(doc.created_at)}</p>
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  <Eye size={12} /> Voir le fichier
                </a>
              )}

              {doc.status === 'ocr_done' || doc.status === 'matched' ? (
                <div className="mt-3 rounded-lg bg-ink-50 p-3 text-xs">
                  {doc.supplier && <p className="font-medium text-ink-800">{doc.supplier}</p>}
                  {doc.date && <p className="text-ink-500">{fmtDate(doc.date)}</p>}
                  {doc.amount != null && (
                    <p className="mt-1 font-semibold text-ink-900">{fmtCDF(Number(doc.amount))}</p>
                  )}
                  {Number(doc.vat_amount) > 0 && (
                    <p className="text-ink-500">TVA : {fmtCDF(Number(doc.vat_amount))}</p>
                  )}
                  {expenseTx && (
                    <div className="mt-2 border-t border-ink-200 pt-2">
                      <div className="flex items-center gap-1.5 text-ink-700">
                        <CheckCircle2 size={12} />
                        <span className="truncate">Depense comptable creee</span>
                      </div>
                      <select
                        value={expenseTx.category_id ?? ''}
                        onChange={(e) => categorizeExpense(expenseTx, e.target.value)}
                        className="input mt-2 h-8 py-1 text-xs"
                        aria-label="Categorie de la depense"
                      >
                        <option value="">A classer plus tard</option>
                        {categories.filter((category) => category.kind === 'expense').map((category) => (
                          <option key={category.id} value={category.id}>{category.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {matchedTx && (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-ink-200 pt-2 text-success-700">
                      <Link2 size={12} />
                      <span className="truncate">Paiement rapproche : {matchedTx.label}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
                  {doc.status === 'pending' ? 'En attente de traitement...' : 'Rejete'}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <Badge tone={meta.tone}>
                  <meta.icon size={12} />
                  {meta.label}
                </Badge>
                {doc.status === 'ocr_done' && (
                  <div className="flex items-center gap-3">
                    {!expenseTx ? (
                      <button
                        onClick={() => setReviewing(doc)}
                        className="text-xs font-medium text-ink-700 hover:text-ink-900"
                      >
                        Creer la depense
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-success-700">Depense creee</span>
                    )}
                    <button
                      onClick={() => setMatching(doc)}
                      className="text-xs font-medium text-brand-700 hover:text-brand-800"
                    >
                      Rapprocher le paiement
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={items.length}
        pageSize={PAGE_SIZE}
      />

      <ExpenseReviewModal
        doc={reviewing}
        onClose={() => setReviewing(null)}
        onConfirm={async (draft) => {
          if (!reviewing) return;
          await createExpense(reviewing, draft);
          setReviewing(null);
        }}
      />
      <MatchModal
        doc={matching}
        transactions={transactions}
        onClose={() => setMatching(null)}
        onMatched={() => { load(); setMatching(null); }}
      />
    </div>
  );
}

function ExpenseReviewModal({
  doc,
  onClose,
  onConfirm,
}: {
  doc: AccountingDocument | null;
  onClose: () => void;
  onConfirm: (draft: ExpenseDraft) => Promise<void>;
}) {
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [vatAmount, setVatAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!doc) return;
    setSupplier(doc.supplier || '');
    setDate(doc.date || new Date().toISOString().slice(0, 10));
    setAmount(doc.amount != null ? String(doc.amount) : '');
    setVatAmount(doc.vat_amount != null ? String(doc.vat_amount) : '0');
    setValidationError('');
  }, [doc]);

  if (!doc) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    const numericVat = Number(vatAmount || 0);
    if (numericAmount <= 0) {
      setValidationError('Le montant TTC doit etre superieur a zero.');
      return;
    }
    if (numericVat < 0 || numericVat > numericAmount) {
      setValidationError('La TVA doit etre comprise entre zero et le montant TTC.');
      return;
    }
    setValidationError('');
    setSaving(true);
    try {
      await onConfirm({ supplier: supplier.trim(), date, amount: numericAmount, vatAmount: numericVat });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!doc} onClose={onClose} title="Verifier la depense" size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-500">Verifiez les donnees extraites avant de creer l ecriture comptable.</p>
        <div>
          <label className="label">Fournisseur</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">Montant TTC (CDF)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">TVA (CDF)</label>
            <input type="number" min="0" step="0.01" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} className="input" />
          </div>
        </div>
        {validationError && <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{validationError}</p>}
        <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enregistrement...' : 'Creer la depense'}</button>
        </div>
      </form>
    </Modal>
  );
}
function MatchModal({
  doc,
  transactions,
  onClose,
  onMatched,
}: {
  doc: AccountingDocument | null;
  transactions: Transaction[];
  onClose: () => void;
  onMatched: () => void;
}) {
  const toast = useToast();
  const [search, setSearch] = useState('');

  const suggestions = useMemo(() => {
    if (!doc) return [];
    return doc ? findSuggestions(doc, transactions) : [];
  }, [doc, transactions]);

  const filtered = useMemo(() => {
    if (!doc) return [];
    const list = transactions.filter((t) => !t.document_id && t.direction === 'out');
    if (!search) return list;
    return list.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()));
  }, [doc, transactions, search]);

  if (!doc) return null;

  const match = async (txId: string) => {
    try {
      await updateDocument(doc.id, { status: 'matched', transaction_id: txId });
      await updateTransaction(txId, { document_id: doc.id, reconciliated: true });
      await logAction('document.match', 'document', doc.id, { transaction_id: txId });
      toast({ kind: 'success', message: 'Justificatif rapproche de la transaction.' });
      onMatched();
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  return (
    <Modal open={!!doc} onClose={onClose} title="Rapprocher un justificatif" size="lg">
      <div className="space-y-4">
        <div className="rounded-xl bg-ink-50 p-4">
          <p className="text-xs text-ink-500">Document</p>
          <p className="font-medium text-ink-900">{doc.file_name}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            {doc.supplier && <span className="text-ink-700">Fournisseur : <strong>{doc.supplier}</strong></span>}
            {doc.amount != null && <span className="text-ink-700">Montant : <strong>{fmtCDF(Number(doc.amount))}</strong></span>}
            {doc.date && <span className="text-ink-700">Date : <strong>{fmtDate(doc.date)}</strong></span>}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div>
            <p className="label flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand-600" /> Suggestions automatiques
            </p>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s.transaction.id}
                  onClick={() => match(s.transaction.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-brand-200 bg-brand-50 p-3 text-left transition hover:bg-brand-100"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-900">{s.transaction.label}</p>
                    <p className="text-xs text-ink-500">
                      {fmtDate(s.transaction.date)} | {s.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink-900">{fmtCDF(Number(s.transaction.amount))}</span>
                    <Badge tone="brand">Score {s.score}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Paiements et sorties non rapproches</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Rechercher..."
            />
          </div>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-500">Aucune transaction disponible.</p>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => match(t.id)}
                className="flex w-full items-center justify-between rounded-lg p-2.5 text-left transition hover:bg-ink-50"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{t.label}</p>
                  <p className="text-xs text-ink-500">{fmtDate(t.date)}</p>
                </div>
                <span className="text-sm font-semibold text-ink-900">{fmtCDF(Number(t.amount))}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function simulateOcr(_fileName: string): {
  amount: number;
  date: string;
  supplier: string;
  vat_amount: number;
} {
  const suppliers = [
    'Apple Store', 'Office Depot', 'Le Bistrot Parisien', 'Total Energies', 'BNP Paribas',
    'Orange Business', 'WeWork', 'HISCOX Assurance', 'Fournisseur ABC', 'Office Depot',
  ];
  const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
  const amount = Math.round((20 + Math.random() * 480) * 100) / 100;
  const vatRate = Math.random() > 0.5 ? 20 : 10;
  const vatAmount = Math.round((amount * vatRate) / (100 + vatRate) * 100) / 100;
  const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString().slice(0, 10);
  return { amount, date, supplier, vat_amount: vatAmount };
}

