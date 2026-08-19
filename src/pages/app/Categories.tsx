import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Tag, Check } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useCategories } from '../../lib/hooks';
import { insertCategory, updateCategory, deleteCategory } from '../../lib/api';
import { logAction } from '../../lib/audit';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import type { Category, CategoryKind } from '../../lib/types';

export function CategoriesPage() {
  const { items: categories, loading, reload } = useCategories();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const incomeCats = categories.filter((c) => c.kind === 'income');
  const expenseCats = categories.filter((c) => c.kind === 'expense');

  const remove = async (cat: Category) => {
    if (!confirm(`Supprimer la catégorie « ${cat.label} » ?`)) return;
    try {
      await deleteCategory(cat.id);
      await logAction('category.delete', 'category', cat.id, { label: cat.label });
      reload();
      toast({ kind: 'success', message: 'Catégorie supprimée.' });
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Catégories</h1>
          <p className="mt-1 text-sm text-ink-500">
            Personnalisez votre plan comptable. Les mots-clés alimentent la catégorisation automatique.
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus size={16} /> Nouvelle catégorie
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategorySection
          title="Recettes"
          icon="?"
          tone="success"
          items={incomeCats}
          loading={loading}
          onEdit={setEditing}
          onDelete={remove}
        />
        <CategorySection
          title="Dépenses"
          icon="?"
          tone="danger"
          items={expenseCats}
          loading={loading}
          onEdit={setEditing}
          onDelete={remove}
        />
      </div>

      <CategoryEditor
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { reload(); setCreateOpen(false); }}
      />
      <CategoryEditor
        category={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => { reload(); setEditing(null); }}
      />
    </div>
  );
}

function CategorySection({
  title,
  icon,
  tone,
  items,
  loading,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: string;
  tone: 'success' | 'danger';
  items: Category[];
  loading: boolean;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-4">
        <span className={`grid h-7 w-7 place-items-center rounded-lg text-sm font-bold ${tone === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          {icon}
        </span>
        <h2 className="font-display text-base font-bold text-ink-900">{title}</h2>
        <span className="ml-auto text-xs text-ink-500">{items.length}</span>
      </div>
      <div className="divide-y divide-ink-100">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-3"><div className="skeleton h-10" /></div>
        ))}
        {!loading && items.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-ink-500">Aucune catégorie.</p>
        )}
        {!loading && items.map((cat) => (
          <div key={cat.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-ink-50/60 transition">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 text-ink-600">
              <Tag size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">{cat.label}</p>
              {cat.keywords?.length > 0 && (
                <p className="truncate text-xs text-ink-500">
                  Mots-clés : {cat.keywords.join(', ')}
                </p>
              )}
            </div>
            <Badge tone="neutral">TVA {cat.vat_rate}%</Badge>
            <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => onEdit(cat)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                title="Modifier"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => onDelete(cat)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                title="Supprimer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryEditor({
  category,
  open,
  onClose,
  onSaved,
}: {
  category?: Category | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [label, setLabel] = useState(category?.label ?? '');
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? 'expense');
  const [vatRate, setVatRate] = useState(category?.vat_rate ?? 20);
  const [keywords, setKeywords] = useState((category?.keywords ?? []).join(', '));

  useEffect(() => {
    if (!open) return;
    setLabel(category?.label ?? '');
    setKind(category?.kind ?? 'expense');
    setVatRate(category?.vat_rate ?? 20);
    setKeywords((category?.keywords ?? []).join(', '));
  }, [category, open]);

  const save = async () => {
    if (!user) return;
    if (!label.trim()) {
      toast({ kind: 'error', message: 'Libellé requis.' });
      return;
    }
    const kw = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    try {
      if (category) {
        await updateCategory(category.id, { label: label.trim(), kind, vat_rate: Number(vatRate), keywords: kw });
        await logAction('category.update', 'category', category.id, { label: label.trim() });
      } else {
        await insertCategory({ user_id: user.id, label: label.trim(), kind, vat_rate: Number(vatRate), keywords: kw, color: 'accent' });
        await logAction('category.create', 'category', undefined, { label: label.trim() });
      }
      toast({ kind: 'success', message: category ? 'Catégorie mise à jour.' : 'Catégorie créée.' });
      onSaved();
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
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
        <div>
          <label className="label">Libellé</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="input" placeholder="Ex : Formation" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setKind('expense')}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${kind === 'expense' ? 'border-danger-500 bg-danger-50 text-danger-700' : 'border-ink-200'}`}
              >
                Dépense
              </button>
              <button
                onClick={() => setKind('income')}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${kind === 'income' ? 'border-success-500 bg-success-50 text-success-700' : 'border-ink-200'}`}
              >
                Recette
              </button>
            </div>
          </div>
          <div>
            <label className="label">Taux de TVA</label>
            <select value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="input">
              <option value={0}>0%</option>
              <option value={5.5}>5,5%</option>
              <option value={10}>10%</option>
              <option value={20}>20%</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Mots-clés (séparés par des virgules)</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="input"
            placeholder="formation, cours, elearning"
          />
          <p className="mt-1 text-xs text-ink-500">Utilisés pour la catégorisation automatique des transactions.</p>
        </div>
      </div>
    </Modal>
  );
}
