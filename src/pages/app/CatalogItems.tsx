import { useEffect, useMemo, useState } from 'react';
import { Box, Check, Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../lib/auth';
import { deleteCatalogItem, insertCatalogItem, updateCatalogItem } from '../../lib/api';
import { logAction } from '../../lib/audit';
import { fmtMoney } from '../../lib/format';
import { useCatalogItems } from '../../lib/hooks';
import { RDC_STANDARD_VAT_RATE } from '../../lib/rdc';
import type { CatalogItem, CatalogItemType } from '../../lib/types';

export function CatalogItemsPage() {
  const { items, loading, reload } = useCatalogItems();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.description, item.sku, item.item_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [items, search]);

  const workflow = useMemo(() => {
    const active = items.filter((item) => item.active).length;
    const inCdf = items.filter((item) => item.currency === 'CDF').length;
    const standardVat = items.filter((item) => Number(item.vat_rate) === RDC_STANDARD_VAT_RATE).length;
    return { active, inCdf, standardVat, total: items.length };
  }, [items]);

  const remove = async (item: CatalogItem) => {
    if (!confirm(`Supprimer l'article ou service \"${item.name}\" ?`)) return;
    try {
      await deleteCatalogItem(item.id);
      await logAction('catalog_item.delete', 'catalog_item', item.id, { name: item.name });
      reload();
      toast({ kind: 'success', message: 'Article / service supprime.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const toggleActive = async (item: CatalogItem) => {
    try {
      await updateCatalogItem(item.id, { active: !item.active });
      await logAction('catalog_item.toggle_active', 'catalog_item', item.id, { active: !item.active, name: item.name });
      reload();
      toast({ kind: 'success', message: item.active ? 'Article / service désactivé.' : 'Article / service réactivé.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Articles et services</h1>
          <p className="mt-1 text-sm text-ink-500">Préparez votre référentiel commercial avec prix unitaires, TVA RDC et devises CDF/USD.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={16} /> Nouvel article / service</button>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Parcours principal</p>
            <h2 className="mt-1 font-display text-lg font-bold text-ink-950">Preparer les lignes de vente avant la facture</h2>
            <p className="mt-1 text-sm text-ink-500">Le catalogue doit vous permettre de facturer plus vite avec les bons prix, la bonne devise et la bonne TVA RDC.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800"><span className="font-semibold">{workflow.active}</span> actif(s)</div>
            <div className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800"><span className="font-semibold">{workflow.inCdf}</span> en CDF</div>
            <div className="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800"><span className="font-semibold">{workflow.standardVat}</span> avec TVA standard</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">1. Creer</p><p className="mt-1 text-sm font-semibold text-ink-900">Produit ou service avec description</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">2. Tarifer</p><p className="mt-1 text-sm font-semibold text-ink-900">Prix unitaire en CDF ou USD</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">3. Fiscaliser</p><p className="mt-1 text-sm font-semibold text-ink-900">TVA adaptee a la vente</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">4. Facturer</p><p className="mt-1 text-sm font-semibold text-ink-900">Lignes prêtes dans la facture</p></div>
        </div>
      </div>

      <div className="card p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder="Rechercher par nom, description, SKU ou type" />
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-ink-100">
          {loading && Array.from({ length: 5 }).map((_, index) => <div key={index} className="px-5 py-3"><div className="skeleton h-14" /></div>)}
          {!loading && filtered.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-500">Aucun article ou service enregistré.</p>}
          {!loading && filtered.map((item) => (
            <div key={item.id} className="group flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-ink-50/60 transition">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.item_type === 'product' ? 'bg-accent-100 text-accent-700' : 'bg-brand-100 text-brand-700'}`}>{item.item_type === 'product' ? <Box size={18} /> : <Wrench size={18} />}</div>
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink-900">{item.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${item.active ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-500'}`}>{item.active ? 'Actif' : 'Inactif'}</span>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">{item.item_type === 'product' ? 'Produit' : 'Service'}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                  {item.description && <span>{item.description}</span>}
                  {item.sku && <span>SKU: {item.sku}</span>}
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-ink-900">{fmtMoney(item.unit_price, item.currency as 'CDF' | 'USD')}</p>
                <p className="text-xs text-ink-500">TVA {item.vat_rate}%</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => toggleActive(item)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900" title={item.active ? 'Désactiver' : 'Réactiver'}><Check size={15} /></button>
                <button onClick={() => setEditing(item)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900" title="Modifier"><Pencil size={15} /></button>
                <button onClick={() => remove(item)} className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600" title="Supprimer"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CatalogItemEditor open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { reload(); setCreateOpen(false); }} />
      <CatalogItemEditor item={editing} open={!!editing} onClose={() => setEditing(null)} onSaved={() => { reload(); setEditing(null); }} />
    </div>
  );
}

function CatalogItemEditor({
  item,
  open,
  onClose,
  onSaved,
}: {
  item?: CatalogItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [itemType, setItemType] = useState<CatalogItemType>('service');
  const [unitPrice, setUnitPrice] = useState(0);
  const [vatRate, setVatRate] = useState(RDC_STANDARD_VAT_RATE);
  const [currency, setCurrency] = useState<'CDF' | 'USD'>('CDF');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? '');
    setDescription(item?.description ?? '');
    setSku(item?.sku ?? '');
    setItemType(item?.item_type ?? 'service');
    setUnitPrice(Number(item?.unit_price ?? 0));
    setVatRate(Number(item?.vat_rate ?? RDC_STANDARD_VAT_RATE));
    setCurrency((item?.currency as 'CDF' | 'USD') ?? 'CDF');
    setActive(item?.active ?? true);
  }, [item, open]);

  const save = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ kind: 'error', message: 'Le nom de l\'article ou service est requis.' });
      return;
    }
    try {
      const payload = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        sku: sku.trim() || null,
        item_type: itemType,
        unit_price: Number(unitPrice),
        vat_rate: Number(vatRate),
        currency,
        active,
      };
      if (item) {
        await updateCatalogItem(item.id, payload);
        await logAction('catalog_item.update', 'catalog_item', item.id, { name: name.trim() });
      } else {
        await insertCatalogItem(payload);
        await logAction('catalog_item.create', 'catalog_item', undefined, { name: name.trim() });
      }
      toast({ kind: 'success', message: item ? 'Article / service mis à jour.' : 'Article / service créé.' });
      onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Modifier l\'article / service' : 'Nouvel article / service'}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} className="btn-primary"><Check size={16} /> Enregistrer</button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Nom</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" autoFocus /></div>
        <div><label className="label">SKU</label><input value={sku} onChange={(e) => setSku(e.target.value)} className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[88px]" /></div>
        <div><label className="label">Type</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setItemType('product')} className={`rounded-xl border px-3 py-2 text-sm font-medium ${itemType === 'product' ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-ink-200'}`}>Produit</button><button onClick={() => setItemType('service')} className={`rounded-xl border px-3 py-2 text-sm font-medium ${itemType === 'service' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200'}`}>Service</button></div></div>
        <div><label className="label">Devise</label><select value={currency} onChange={(e) => setCurrency(e.target.value as 'CDF' | 'USD')} className="input"><option value="CDF">CDF</option><option value="USD">USD</option></select></div>
        <div><label className="label">Prix unitaire</label><input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} className="input" /></div>
        <div><label className="label">TVA</label><select value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="input"><option value={0}>0%</option><option value={RDC_STANDARD_VAT_RATE}>{RDC_STANDARD_VAT_RATE}%</option></select></div>
        <div className="sm:col-span-2"><label className="inline-flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Article / service actif</label></div>
      </div>
    </Modal>
  );
}


