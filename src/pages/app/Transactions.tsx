import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useCategories, useTransactions } from '../../lib/hooks';
import { computeVat, suggestCategory } from '../../lib/categorize';
import { insertTransactions, updateTransaction } from '../../lib/api';
import { generateDemoTransactions } from '../../lib/demo-data';
import { parseCsv } from '../../lib/csv';
import { fmtDate, fmtCDF } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import type { CategorizationState, Direction, Transaction } from '../../lib/types';

const stateLabel: Record<CategorizationState, string> = {
  auto: 'Auto',
  suggested: 'Suggere',
  manual: 'Manuel',
  uncategorized: 'A categoriser',
};

const stateTone: Record<CategorizationState, 'brand' | 'warning' | 'neutral' | 'accent'> = {
  auto: 'brand',
  suggested: 'warning',
  manual: 'neutral',
  uncategorized: 'accent',
};

export function TransactionsPage() {
  const { user } = useAuth();
  const { items: transactions, loading, reload } = useTransactions();
  const { items: categories } = useCategories();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<Direction | 'all'>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [importing, setImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 25;

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      if (dirFilter !== 'all' && transaction.direction !== dirFilter) return false;
      if (catFilter === 'uncategorized' && transaction.category_id) return false;
      if (catFilter !== 'all' && catFilter !== 'uncategorized' && transaction.category_id !== catFilter) return false;
      if (search && !transaction.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, search, dirFilter, catFilter]);

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const transaction of filtered) {
      if (transaction.direction === 'in') income += Number(transaction.amount);
      else expenses += Number(transaction.amount);
    }
    return { income, expenses };
  }, [filtered]);

  const workflow = useMemo(() => {
    const uncategorized = transactions.filter((transaction) => !transaction.category_id).length;
    const suggested = transactions.filter((transaction) => transaction.categorization_state === 'suggested').length;
    const categorized = transactions.filter((transaction) => !!transaction.category_id).length;
    const vatTracked = transactions.filter((transaction) => Number(transaction.vat_amount) > 0).length;
    return { uncategorized, suggested, categorized, vatTracked, total: transactions.length };
  }, [transactions]);

  const priorities = useMemo(() => {
    return transactions
      .filter((transaction) => !transaction.category_id || transaction.categorization_state === 'suggested')
      .slice(0, 5);
  }, [transactions]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => setPage(1), [search, dirFilter, catFilter]);

  const runImport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const rows = generateDemoTransactions(user.id);
      const enriched = rows.map((row) => {
        const { category, state } = suggestCategory(row, categories);
        const vatRate = category?.vat_rate ?? 0;
        return {
          ...row,
          category_id: category?.id ?? null,
          categorization_state: state,
          vat_rate: vatRate,
          vat_amount: computeVat(Number(row.amount), vatRate),
        };
      });
      await insertTransactions(enriched);
      reload();
      toast({ kind: 'success', message: `${enriched.length} transactions importees et categorisees.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Import echoue' });
    } finally {
      setImporting(false);
    }
  };

  const handleCsvImport = async (file: File | undefined) => {
    if (!file || !user) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast({ kind: 'error', message: 'Aucune transaction valide trouvee dans le CSV.' });
        return;
      }
      const enriched = parsed.map((row) => {
        const { category, state } = suggestCategory(row, categories);
        const vatRate = category?.vat_rate ?? 0;
        return {
          user_id: user.id,
          date: row.date,
          label: row.label,
          amount: row.amount,
          direction: row.direction,
          category_id: category?.id ?? null,
          categorization_state: state,
          vat_rate: vatRate,
          vat_amount: computeVat(row.amount, vatRate),
          bank_account_label: 'Import CSV',
        };
      });
      await insertTransactions(enriched);
      reload();
      toast({ kind: 'success', message: `${enriched.length} transactions importees depuis le CSV.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Import CSV echoue' });
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const categorize = async (transaction: Transaction, categoryId: string | null) => {
    const category = categories.find((item) => item.id === categoryId);
    const vatRate = category?.vat_rate ?? 0;
    const vatAmount = computeVat(Number(transaction.amount), vatRate);
    await updateTransaction(transaction.id, {
      category_id: categoryId,
      categorization_state: categoryId ? 'manual' : 'uncategorized',
      vat_rate: vatRate,
      vat_amount: vatAmount,
    });
    reload();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Transactions</h1>
          <p className="mt-1 text-sm text-ink-500">
            {transactions.length} transactions | {transactions.filter((transaction) => !transaction.category_id).length} a categoriser
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={runImport} disabled={importing} className="btn-secondary">
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
            {importing ? 'Import...' : 'Importer des mouvements'}
          </button>
          <button onClick={() => csvInputRef.current?.click()} disabled={importing} className="btn-secondary">
            <FileSpreadsheet size={16} /> Import CSV
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleCsvImport(e.target.files?.[0])}
          />
          <button onClick={() => setAddOpen(true)} className="btn-primary">
            <Plus size={16} /> Transaction
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Parcours principal</p>
            <h2 className="mt-1 font-display text-lg font-bold text-ink-950">Importer, classer et preparer la TVA</h2>
            <p className="mt-1 text-sm text-ink-500">
              Ici, le plus important est de traiter d abord les mouvements non classes avant la cloture et les declarations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <span className="font-semibold">{workflow.uncategorized}</span> a classer
            </div>
            <div className="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800">
              <span className="font-semibold">{workflow.suggested}</span> a valider
            </div>
            <div className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800">
              <span className="font-semibold">{workflow.categorized}</span> deja classes
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-ink-50 p-3">
            <p className="text-xs text-ink-500">1. Importer la banque</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">Import test ou import CSV</p>
          </div>
          <div className="rounded-2xl bg-ink-50 p-3">
            <p className="text-xs text-ink-500">2. Classer les mouvements</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">{workflow.uncategorized} mouvement(s) restent a affecter</p>
          </div>
          <div className="rounded-2xl bg-ink-50 p-3">
            <p className="text-xs text-ink-500">3. Verifier la TVA</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">{workflow.vatTracked} ligne(s) avec TVA suivie</p>
          </div>
          <div className="rounded-2xl bg-ink-50 p-3">
            <p className="text-xs text-ink-500">4. Passer a la declaration</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">Base prete pour TVA, IPR et social</p>
          </div>
        </div>
        {priorities.length > 0 && (
          <div className="mt-4 rounded-2xl bg-warning-50 p-4 ring-1 ring-warning-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-warning-900">A traiter maintenant</p>
                <p className="text-xs text-warning-800">Les premiers mouvements qui bloquent la comptabilisation propre.</p>
              </div>
              <span className="text-xs font-medium text-warning-800">{priorities.length} priorite(s)</span>
            </div>
            <div className="mt-3 space-y-2">
              {priorities.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{transaction.label}</p>
                    <p className="text-xs text-ink-500">{fmtDate(transaction.date)} | {transaction.categorization_state === 'suggested' ? 'Categorie proposee a confirmer' : 'Categorie manquante'}</p>
                  </div>
                  <span className="font-semibold text-ink-900">{fmtCDF(Number(transaction.amount))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Rechercher une transaction..."
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={16} className="text-ink-400" />
            <div className="flex rounded-lg bg-ink-100 p-1">
              {(['all', 'in', 'out'] as const).map((direction) => (
                <button
                  key={direction}
                  onClick={() => setDirFilter(direction)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    dirFilter === direction ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-600'
                  }`}
                >
                  {direction === 'all' ? 'Tous' : direction === 'in' ? 'Entrees' : 'Sorties'}
                </button>
              ))}
            </div>
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input w-auto">
            <option value="all">Toutes categories</option>
            <option value="uncategorized">Non categorisees</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-success-700">
            <ArrowUpRight size={14} /> {fmtCDF(totals.income)}
          </span>
          <span className="flex items-center gap-1.5 text-danger-700">
            <ArrowDownRight size={14} /> {fmtCDF(totals.expenses)}
          </span>
          <span className="ml-auto text-ink-500">{filtered.length} resultat(s)</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Libelle</th>
                <th className="px-4 py-3 font-semibold">Categorie</th>
                <th className="px-4 py-3 font-semibold text-right">Montant</th>
                <th className="px-4 py-3 font-semibold text-right">TVA</th>
                <th className="px-4 py-3 font-semibold text-right">Etat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading && Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={6} className="px-4 py-3"><div className="skeleton h-10" /></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-ink-500">
                    Aucune transaction. Utilisez l import de mouvements ou le CSV pour commencer.
                  </td>
                </tr>
              )}
              {!loading && paged.map((transaction) => (
                <tr key={transaction.id} className="group transition hover:bg-ink-50/60">
                  <td className="px-4 py-3 whitespace-nowrap text-ink-600">{fmtDate(transaction.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${transaction.direction === 'in' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'}`}>
                        {transaction.direction === 'in' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <span className="font-medium text-ink-900">{transaction.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={transaction.category_id ?? ''}
                      onChange={(e) => categorize(transaction, e.target.value || null)}
                      className="rounded-lg border-0 bg-transparent px-2 py-1 text-sm text-ink-700 ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      <option value="">- Choisir -</option>
                      {categories
                        .filter((category) => category.kind === (transaction.direction === 'in' ? 'income' : 'expense'))
                        .map((category) => (
                          <option key={category.id} value={category.id}>{category.label}</option>
                        ))}
                    </select>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${transaction.direction === 'in' ? 'text-success-700' : 'text-ink-900'}`}>
                    {transaction.direction === 'in' ? '+' : '-'}{fmtCDF(transaction.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-500">
                    {Number(transaction.vat_amount) > 0 ? fmtCDF(transaction.vat_amount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge tone={stateTone[transaction.categorization_state]}>
                      {transaction.categorization_state === 'auto' && <Sparkles size={12} />}
                      {stateLabel[transaction.categorization_state]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      <AddTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={categories}
        onSaved={() => { reload(); setAddOpen(false); }}
      />
    </div>
  );
}

function AddTransactionModal({
  open,
  onClose,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: import('../../lib/types').Category[];
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<Direction>('out');
  const [categoryId, setCategoryId] = useState('');

  const reset = () => {
    setLabel('');
    setAmount('');
    setCategoryId('');
    setDirection('out');
  };

  const save = async () => {
    if (!user) return;
    if (!label.trim() || !amount) {
      toast({ kind: 'error', message: 'Libelle et montant requis.' });
      return;
    }
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) {
      toast({ kind: 'error', message: 'Montant invalide.' });
      return;
    }
    const category = categories.find((item) => item.id === categoryId) || null;
    const vatRate = category?.vat_rate ?? 0;
    try {
      await insertTransactions([
        {
          user_id: user.id,
          date,
          label: label.trim(),
          amount: numericAmount,
          direction,
          category_id: category?.id ?? null,
          categorization_state: category ? 'manual' : 'uncategorized',
          vat_rate: vatRate,
          vat_amount: computeVat(numericAmount, vatRate),
          bank_account_label: 'Saisie manuelle',
        },
      ]);
      toast({ kind: 'success', message: 'Transaction ajoutee.' });
      reset();
      onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter une transaction"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} className="btn-primary">
            <Check size={16} /> Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sens</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection('out')}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${direction === 'out' ? 'border-danger-500 bg-danger-50 text-danger-700' : 'border-ink-200'}`}
              >
                Depense
              </button>
              <button
                onClick={() => setDirection('in')}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${direction === 'in' ? 'border-success-500 bg-success-50 text-success-700' : 'border-ink-200'}`}
              >
                Recette
              </button>
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Libelle</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="input" placeholder="Ex : Achat fournitures" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="0,00" />
          </div>
          <div>
            <label className="label">Categorie</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
              <option value="">- Aucune -</option>
              {categories.filter((category) => category.kind === (direction === 'in' ? 'income' : 'expense')).map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

