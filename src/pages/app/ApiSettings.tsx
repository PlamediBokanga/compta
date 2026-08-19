import { useEffect, useState } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Webhook as WebhookIcon,
  Copy,
  Check,
  Eye,
  EyeOff,
  Power,
  Code,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useAccessControl } from '../../lib/access';
import { supabase } from '../../lib/supabase';
import { logAction } from '../../lib/audit';
import { fmtDate } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { AccessDenied } from '../../components/ui/AccessDenied';
import type { ApiKey, Webhook } from '../../lib/types';

const webhookEvents = [
  { id: 'invoice.created', label: 'Facture creee' },
  { id: 'invoice.paid', label: 'Facture payee' },
  { id: 'invoice.reminder', label: 'Relance envoyee' },
  { id: 'declaration.ready', label: 'Declaration prete' },
  { id: 'declaration.submitted', label: 'Declaration teledeclaree' },
  { id: 'transaction.imported', label: 'Transaction importee' },
];

export function ApiSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const access = useAccessControl();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const [keysRes, whRes] = await Promise.all([
      supabase.from('api_keys').select('*').eq('revoked', false).order('created_at', { ascending: false }),
      supabase.from('webhooks').select('*').order('created_at', { ascending: false }),
    ]);
    setApiKeys((keysRes.data as ApiKey[]) ?? []);
    setWebhooks((whRes.data as Webhook[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (access.canAccessApi) {
      load();
    }
  }, [access.canAccessApi]);

  if (access.loading) {
    return <div className="card p-6 text-sm text-ink-500">Verification des autorisations...</div>;
  }

  if (!access.canAccessApi) {
    return (
      <AccessDenied
        title="Acces restreint"
        message="La gestion des cles API et des webhooks est reservee au proprietaire du compte."
      />
    );
  }

  const generateKey = async (name: string) => {
    if (!user) return;
    const raw = `tz_${crypto.randomUUID().replace(/-/g, '')}`;
    const prefix = raw.slice(0, 12);
    const hash = await sha256(raw);
    try {
      const { error } = await supabase.from('api_keys').insert({
        user_id: user.id,
        name,
        key_prefix: prefix,
        key_hash: hash,
      });
      if (error) throw new Error(error.message);
      await logAction('api_key.create', 'api_key', undefined, { name });
      setNewKey(raw);
      setCopied(false);
      load();
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  const revokeKey = async (key: ApiKey) => {
    if (!confirm(`Revoquer la cle " ${key.name} " ?`)) return;
    try {
      const { error } = await supabase.from('api_keys').update({ revoked: true }).eq('id', key.id);
      if (error) throw new Error(error.message);
      await logAction('api_key.revoke', 'api_key', key.id, { name: key.name });
      load();
      toast({ kind: 'success', message: 'Cle revoquee.' });
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  const toggleWebhook = async (wh: Webhook) => {
    try {
      const { error } = await supabase.from('webhooks').update({ active: !wh.active }).eq('id', wh.id);
      if (error) throw new Error(error.message);
      load();
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  const deleteWebhook = async (wh: Webhook) => {
    if (!confirm(`Supprimer le webhook ${wh.url} ?`)) return;
    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', wh.id);
      if (error) throw new Error(error.message);
      await logAction('webhook.delete', 'webhook', wh.id, { url: wh.url });
      load();
      toast({ kind: 'success', message: 'Webhook supprime.' });
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    }
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">API & Webhooks</h1>
        <p className="mt-1 text-sm text-ink-500">
          Integrez Tenzo a vos outils via notre API REST et configurez des webhooks pour etre notifie en temps reel.
        </p>
      </div>

      {/* API Keys */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-brand-700" />
            <h2 className="font-display text-base font-bold text-ink-900">Cles API</h2>
          </div>
          <button onClick={() => setKeyModalOpen(true)} className="btn-secondary text-sm">
            <Plus size={14} /> Generer une cle
          </button>
        </div>
        <div className="divide-y divide-ink-100">
          {loading && Array.from({ length: 2 }).map((_, i) => <div key={i} className="px-5 py-4"><div className="skeleton h-12" /></div>)}
          {!loading && apiKeys.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-500">
              Aucune cle API. Generez une cle pour acceder a l'API Tenzo.
            </p>
          )}
          {!loading && apiKeys.map((key) => (
            <div key={key.id} className="flex items-center gap-3 px-5 py-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-600">
                <Key size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">{key.name}</p>
                <p className="font-mono text-xs text-ink-500">{key.key_prefix}...</p>
              </div>
              {key.last_used_at && (
                <span className="text-xs text-ink-400">Derniere utilisation : {fmtDate(key.last_used_at)}</span>
              )}
              <Badge tone="neutral">Active</Badge>
              <button
                onClick={() => revokeKey(key)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                title="Revoquer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Webhooks */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <WebhookIcon size={18} className="text-brand-700" />
            <h2 className="font-display text-base font-bold text-ink-900">Webhooks</h2>
          </div>
          <button onClick={() => setWebhookModalOpen(true)} className="btn-secondary text-sm">
            <Plus size={14} /> Ajouter un endpoint
          </button>
        </div>
        <div className="divide-y divide-ink-100">
          {loading && Array.from({ length: 2 }).map((_, i) => <div key={i} className="px-5 py-4"><div className="skeleton h-12" /></div>)}
          {!loading && webhooks.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-ink-500">
              Aucun webhook. Configurez un endpoint pour recevoir des notifications en temps reel.
            </p>
          )}
          {!loading && webhooks.map((wh) => (
            <div key={wh.id} className="flex items-center gap-3 px-5 py-4">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-600">
                <WebhookIcon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{wh.url}</p>
                <p className="text-xs text-ink-500">
                  {wh.events.length} evenement(s) | Cree le {fmtDate(wh.created_at)}
                </p>
              </div>
              <Badge tone={wh.active ? 'success' : 'neutral'}>
                {wh.active ? 'Actif' : 'Inactif'}
              </Badge>
              <button
                onClick={() => toggleWebhook(wh)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
                title={wh.active ? 'Desactiver' : 'Activer'}
              >
                <Power size={15} />
              </button>
              <button
                onClick={() => deleteWebhook(wh)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                title="Supprimer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* API Documentation */}
      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Code size={18} className="text-brand-700" />
          <h2 className="font-display text-base font-bold text-ink-900">Documentation rapide</h2>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-ink-900 p-4 text-sm text-ink-100">
            <p className="text-xs text-ink-400 mb-2">Authentification - header Authorization</p>
            <code className="block font-mono text-xs">
              curl -H "Authorization: Bearer tz_votre_cle" \<br />
              {'  '}https://api.tenzo.fr/v1/transactions
            </code>
          </div>
          <div className="rounded-xl bg-ink-900 p-4 text-sm text-ink-100">
            <p className="text-xs text-ink-400 mb-2">Creer une transaction - POST /v1/transactions</p>
            <code className="block font-mono text-xs">
              {'{'}<br />
              {'  "date": "2026-07-17",'}<br />
              {'  "label": "Achat fournitures",'}<br />
              {'  "amount": 45.90,'}<br />
              {'  "direction": "out"'}<br />
              {'}'}
            </code>
          </div>
        </div>
      </div>

      {/* New key modal */}
      <CreateKeyModal
        open={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onCreate={generateKey}
      />

      {/* New key display */}
      <Modal
        open={!!newKey}
        onClose={() => setNewKey(null)}
        title="Cle API generee"
        footer={
          <button onClick={() => setNewKey(null)} className="btn-primary">
            <Check size={16} /> J'ai copie ma cle
          </button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-warning-50 p-4 text-sm text-warning-800 ring-1 ring-warning-500/30">
            Copiez votre cle maintenant. Pour des raisons de securite, elle ne sera plus jamais affichee.
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-ink-900 p-4">
            <code className="flex-1 overflow-x-auto font-mono text-xs text-ink-100">{newKey}</code>
            <button onClick={copyKey} className="shrink-0 rounded-lg bg-ink-700 p-2 text-ink-100 hover:bg-ink-600">
              {copied ? <Check size={16} className="text-success-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </Modal>

      {/* Webhook modal */}
      <CreateWebhookModal
        open={webhookModalOpen}
        onClose={() => setWebhookModalOpen(false)}
        onSaved={() => { load(); setWebhookModalOpen(false); }}
      />
    </div>
  );
}

function CreateKeyModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const toast = useToast();

  const save = () => {
    if (!name.trim()) {
      toast({ kind: 'error', message: 'Nom requis.' });
      return;
    }
    onCreate(name.trim());
    setName('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generer une cle API"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} className="btn-primary">
            <Key size={16} /> Generer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Nom de la cle</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Ex : Production, Script comptabilite..."
            autoFocus
          />
        </div>
        <p className="text-xs text-ink-500">
          La cle aura acces a toutes vos donnees via l'API REST. Vous pouvez la revoquer a tout moment.
        </p>
      </div>
    </Modal>
  );
}

function CreateWebhookModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['invoice.created', 'invoice.paid']);
  const [saving, setSaving] = useState(false);

  const toggleEvent = (id: string) => {
    setSelectedEvents((cur) => cur.includes(id) ? cur.filter((e) => e !== id) : [...cur, id]);
  };

  const save = async () => {
    if (!user) return;
    if (!url.trim()) {
      toast({ kind: 'error', message: 'URL requise.' });
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast({ kind: 'error', message: 'L\'URL doit commencer par http:// ou https://' });
      return;
    }
    if (selectedEvents.length === 0) {
      toast({ kind: 'error', message: 'Selectionnez au moins un evenement.' });
      return;
    }
    setSaving(true);
    try {
      const secret = crypto.randomUUID();
      const { error } = await supabase.from('webhooks').insert({
        user_id: user.id,
        url: url.trim(),
        events: selectedEvents,
        secret,
        active: true,
      });
      if (error) throw new Error(error.message);
      await logAction('webhook.create', 'webhook', undefined, { url: url.trim(), events: selectedEvents });
      toast({ kind: 'success', message: 'Webhook configure.' });
      setUrl('');
      setSelectedEvents(['invoice.created', 'invoice.paid']);
      onSaved();
    } catch (e) {
      toast({ kind: 'error', message: e instanceof Error ? e.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter un webhook"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement...' : <><WebhookIcon size={16} /> Enregistrer</>}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">URL du endpoint</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input"
            placeholder="https://votre-app.com/webhooks/tenzo"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Evenements a surveiller</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {webhookEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => toggleEvent(ev.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedEvents.includes(ev.id)
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                }`}
              >
                {selectedEvents.includes(ev.id) ? <Eye size={14} /> : <EyeOff size={14} />}
                {ev.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}





