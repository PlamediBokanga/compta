import { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../lib/auth';
import { deleteCustomer, insertCustomer, updateCustomer } from '../../lib/api';
import { logAction } from '../../lib/audit';
import { useCustomers } from '../../lib/hooks';
import { initials } from '../../lib/format';
import type { Customer } from '../../lib/types';

export function CustomersPage() {
  const { items: customers, loading, reload } = useCustomers();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone, customer.tax_id, customer.rccm]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [customers, search]);

  const workflow = useMemo(() => {
    const active = customers.filter((customer) => customer.active).length;
    const withFiscalId = customers.filter((customer) => !!customer.tax_id || !!customer.rccm).length;
    const missingContact = customers.filter((customer) => !customer.phone && !customer.email).length;
    return { active, withFiscalId, missingContact, total: customers.length };
  }, [customers]);

  const remove = async (customer: Customer) => {
    if (!confirm(`Supprimer le client \"${customer.name}\" ?`)) return;
    try {
      await deleteCustomer(customer.id);
      await logAction('customer.delete', 'customer', customer.id, { name: customer.name });
      reload();
      toast({ kind: 'success', message: 'Client supprime.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const toggleActive = async (customer: Customer) => {
    try {
      await updateCustomer(customer.id, { active: !customer.active });
      await logAction('customer.toggle_active', 'customer', customer.id, { active: !customer.active, name: customer.name });
      reload();
      toast({ kind: 'success', message: customer.active ? 'Client désactivé.' : 'Client réactivé.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Clients</h1>
          <p className="mt-1 text-sm text-ink-500">Centralisez vos clients, leurs contacts et leurs références fiscales avant la facturation.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={16} /> Nouveau client</button>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Parcours principal</p>
            <h2 className="mt-1 font-display text-lg font-bold text-ink-950">Preparer les clients avant emission des factures</h2>
            <p className="mt-1 text-sm text-ink-500">L objectif ici est d avoir des fiches clients propres, joignables et fiscalement identifiables pour gagner du temps a la facturation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800"><span className="font-semibold">{workflow.active}</span> client(s) actif(s)</div>
            <div className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800"><span className="font-semibold">{workflow.withFiscalId}</span> avec NIF/RCCM</div>
            <div className="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800"><span className="font-semibold">{workflow.missingContact}</span> sans contact</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">1. Creer</p><p className="mt-1 text-sm font-semibold text-ink-900">Nom, telephone, e-mail et adresse</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">2. Identifier</p><p className="mt-1 text-sm font-semibold text-ink-900">RCCM et NIF quand ils existent</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">3. Facturer</p><p className="mt-1 text-sm font-semibold text-ink-900">Base client prete pour les factures</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">4. Encaisser</p><p className="mt-1 text-sm font-semibold text-ink-900">Suivi plus simple des paiements</p></div>
        </div>
      </div>

      <div className="card p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder="Rechercher par nom, e-mail, téléphone, NIF ou RCCM" />
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-ink-100">
          {loading && Array.from({ length: 5 }).map((_, index) => <div key={index} className="px-5 py-3"><div className="skeleton h-14" /></div>)}
          {!loading && filtered.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-500">Aucun client enregistré.</p>}
          {!loading && filtered.map((customer) => (
            <div key={customer.id} className="group flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-ink-50/60 transition">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-sm font-semibold text-brand-700">{initials(customer.name)}</div>
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink-900">{customer.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${customer.active ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-500'}`}>{customer.active ? 'Actif' : 'Inactif'}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                  {customer.email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {customer.email}</span>}
                  {customer.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>}
                  {customer.address && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {customer.address}</span>}
                  {(customer.tax_id || customer.rccm) && <span className="inline-flex items-center gap-1"><Building2 size={12} /> {customer.tax_id || customer.rccm}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button onClick={() => toggleActive(customer)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900" title={customer.active ? 'Désactiver' : 'Réactiver'}><Check size={15} /></button>
                <button onClick={() => setEditing(customer)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900" title="Modifier"><Pencil size={15} /></button>
                <button onClick={() => remove(customer)} className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600" title="Supprimer"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CustomerEditor open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { reload(); setCreateOpen(false); }} />
      <CustomerEditor customer={editing} open={!!editing} onClose={() => setEditing(null)} onSaved={() => { reload(); setEditing(null); }} />
    </div>
  );
}

function CustomerEditor({
  customer,
  open,
  onClose,
  onSaved,
}: {
  customer?: Customer | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [rccm, setRccm] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? '');
    setEmail(customer?.email ?? '');
    setPhone(customer?.phone ?? '');
    setAddress(customer?.address ?? '');
    setTaxId(customer?.tax_id ?? '');
    setRccm(customer?.rccm ?? '');
    setNotes(customer?.notes ?? '');
    setActive(customer?.active ?? true);
  }, [customer, open]);

  const save = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ kind: 'error', message: 'Le nom du client est requis.' });
      return;
    }
    try {
      const payload = {
        user_id: user.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        tax_id: taxId.trim() || null,
        rccm: rccm.trim() || null,
        notes: notes.trim() || null,
        active,
      };
      if (customer) {
        await updateCustomer(customer.id, payload);
        await logAction('customer.update', 'customer', customer.id, { name: name.trim() });
      } else {
        await insertCustomer(payload);
        await logAction('customer.create', 'customer', undefined, { name: name.trim() });
      }
      toast({ kind: 'success', message: customer ? 'Client mis à jour.' : 'Client créé.' });
      onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Modifier le client' : 'Nouveau client'}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} className="btn-primary"><Check size={16} /> Enregistrer</button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Nom / raison sociale</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" autoFocus /></div>
        <div><label className="label">E-mail</label><input value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></div>
        <div><label className="label">Téléphone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" /></div>
        <div><label className="label">Adresse</label><input value={address} onChange={(e) => setAddress(e.target.value)} className="input" /></div>
        <div><label className="label">NIF</label><input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="input" /></div>
        <div><label className="label">RCCM</label><input value={rccm} onChange={(e) => setRccm(e.target.value)} className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[88px]" /></div>
        <div className="sm:col-span-2"><label className="inline-flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Client actif</label></div>
      </div>
    </Modal>
  );
}

