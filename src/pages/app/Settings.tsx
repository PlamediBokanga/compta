import { useEffect, useMemo, useState } from 'react';
import { Building2, Check, History, KeyRound, QrCode, Save, Shield, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { upsertProfile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fetchAuditLogs, logAction } from '../../lib/audit';
import { fmtDate } from '../../lib/format';
import { getLegalStatusDefinition, LEGAL_STATUS_DEFINITIONS } from '../../lib/legal-status';
import { supabase } from '../../lib/supabase';
import { validateBic, validateIban, validateRccm, validateTaxId } from '../../lib/validate';
import type { AuditLog, LegalStatus, VatRegime } from '../../lib/types';

const legalOptions: { value: LegalStatus; label: string }[] = LEGAL_STATUS_DEFINITIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));

const vatOptions: { value: VatRegime; label: string }[] = [
  { value: 'franchise', label: 'Franchise / exoneree' },
  { value: 'reel_simplifie', label: 'Regime intermediaire' },
  { value: 'reel_normal', label: 'Regime normal TVA' },
];

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    legal_status: 'sarl' as LegalStatus,
    vat_regime: 'reel_normal' as VatRegime,
    tax_id: '',
    rccm: '',
    tax_center: '',
    def_device_id: '',
    accounting_standard: 'SYSCOHADA',
    country: 'RDC',
    vat_number: '',
    address: '',
    postal_code: '',
    city: '',
    phone: '',
    iban: '',
    bic: '',
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      company_name: profile.company_name || '',
      legal_status: profile.legal_status || 'sarl',
      vat_regime: profile.vat_regime || 'reel_normal',
      tax_id: profile.tax_id || profile.siren || '',
      rccm: profile.rccm || '',
      tax_center: profile.tax_center || '',
      def_device_id: profile.def_device_id || '',
      accounting_standard: profile.accounting_standard || 'SYSCOHADA',
      country: profile.country || 'RDC',
      vat_number: profile.vat_number || '',
      address: profile.address || '',
      postal_code: profile.postal_code || '',
      city: profile.city || '',
      phone: profile.phone || '',
      iban: profile.iban || '',
      bic: profile.bic || '',
    });
  }, [profile]);

  const errors = {
    tax_id: validateTaxId(form.tax_id),
    rccm: validateRccm(form.rccm),
    iban: validateIban(form.iban),
    bic: validateBic(form.bic),
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const statusDefinition = getLegalStatusDefinition(form.legal_status);

  const profileWorkflow = useMemo(() => {
    const identityChecks = [form.company_name, form.legal_status, form.tax_id, form.rccm, form.tax_center, form.address];
    const invoiceChecks = [form.phone, form.city, form.accounting_standard, form.country];
    const normalizationChecks = [form.tax_id, form.rccm, form.def_device_id];

    return {
      identityCompleted: identityChecks.filter((value) => String(value || '').trim().length > 0).length,
      identityTotal: identityChecks.length,
      invoiceCompleted: invoiceChecks.filter((value) => String(value || '').trim().length > 0).length,
      invoiceTotal: invoiceChecks.length,
      normalizationReady: normalizationChecks.every((value) => String(value || '').trim().length > 0),
      paymentReady: Boolean(String(form.iban || '').trim() || String(form.bic || '').trim()),
    };
  }, [form]);

  const save = async () => {
    if (!user) return;
    if (hasErrors) {
      toast({ kind: 'error', message: 'Corrigez les champs invalides avant de sauvegarder.' });
      return;
    }

    setSaving(true);
    try {
      await upsertProfile({ user_id: user.id, ...form, siren: form.tax_id || null });
      await logAction('settings.update', 'profile', user.id);
      await refreshProfile();
      toast({ kind: 'success', message: 'Profil RDC enregistre.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Reglages</h1>
        <p className="mt-1 text-sm text-ink-500">
          Vos informations legales et fiscales pilotent la facture standard, la future normalisation DGI et les exports SYSCOHADA / CPCC.
        </p>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Parcours principal</p>
            <h2 className="mt-1 font-display text-lg font-bold text-ink-950">Completer le profil qui alimente toute l application</h2>
            <p className="mt-1 text-sm text-ink-500">
              Ces reglages servent a la facture, a la normalisation RDC, aux declarations et aux rapports comptables.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <span className="font-semibold">{profileWorkflow.identityCompleted}/{profileWorkflow.identityTotal}</span> identite entreprise
            </div>
            <div className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800">
              <span className="font-semibold">{profileWorkflow.invoiceCompleted}/{profileWorkflow.invoiceTotal}</span> profil facture
            </div>
            <div className={profileWorkflow.normalizationReady ? 'rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800' : 'rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800'}>
              {profileWorkflow.normalizationReady ? 'Normalisation prete' : 'Normalisation a completer'}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">1. Identifier</p><p className="mt-1 text-sm font-semibold text-ink-900">Nom, statut, NIF et RCCM</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">2. Localiser</p><p className="mt-1 text-sm font-semibold text-ink-900">Adresse, ville, telephone et centre des impots</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">3. Fiscaliser</p><p className="mt-1 text-sm font-semibold text-ink-900">DEF et regime TVA pour la RDC</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">4. Facturer</p><p className="mt-1 text-sm font-semibold text-ink-900">Coordonnees de paiement et base facture</p></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-ink-50 p-4">
            <p className="text-sm font-semibold text-ink-900">Identite legale</p>
            <p className="mt-1 text-xs text-ink-500">{profileWorkflow.identityCompleted} champ(s) renseignes sur {profileWorkflow.identityTotal}</p>
          </div>
          <div className="rounded-2xl bg-ink-50 p-4">
            <p className="text-sm font-semibold text-ink-900">Facture et contact</p>
            <p className="mt-1 text-xs text-ink-500">{profileWorkflow.invoiceCompleted} champ(s) renseignes sur {profileWorkflow.invoiceTotal}</p>
          </div>
          <div className="rounded-2xl bg-ink-50 p-4">
            <p className="text-sm font-semibold text-ink-900">Paiement</p>
            <p className="mt-1 text-xs text-ink-500">{profileWorkflow.paymentReady ? 'Coordonnees de paiement presentes' : 'Ajouter au moins une coordonnee bancaire'}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Building2 size={20} /></div>
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Identite entreprise RDC</h2>
            <p className="text-xs text-ink-500">DGI, RCCM, dispositif fiscal et standard comptable</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Nom de l activite</label><input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="input" placeholder="Ex : Maison Kivu Services" /></div>
          <div><label className="label">Statut juridique</label><select value={form.legal_status} onChange={(e) => setForm({ ...form, legal_status: e.target.value as LegalStatus })} className="input">{legalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div><label className="label">Regime de TVA</label><select value={form.vat_regime} onChange={(e) => setForm({ ...form, vat_regime: e.target.value as VatRegime })} className="input">{vatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          {statusDefinition && <div className="sm:col-span-2 rounded-xl bg-ink-50 p-4 text-sm text-ink-700"><p className="font-semibold text-ink-900">{statusDefinition.label}</p><p className="mt-1">Associes : {statusDefinition.associatesLabel}</p><p className="mt-1">Responsabilite : {statusDefinition.liabilityLabel}</p><p className="mt-1">Orientation : {statusDefinition.taxOrientation}</p><p className="mt-1">Base comptable : {statusDefinition.accountingBasis}</p></div>}
          <div><label className="label">NIF / identifiant fiscal</label><input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className={`input ${errors.tax_id ? 'ring-danger-500/40' : ''}`} placeholder="Ex : A0700XXXXX" />{errors.tax_id && <p className="mt-1 text-xs text-danger-600">{errors.tax_id}</p>}</div>
          <div><label className="label">RCCM</label><input value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} className={`input ${errors.rccm ? 'ring-danger-500/40' : ''}`} placeholder="Ex : CD/KIN/RCCM/24-B-1234" />{errors.rccm && <p className="mt-1 text-xs text-danger-600">{errors.rccm}</p>}</div>
          <div><label className="label">Centre des impots</label><input value={form.tax_center} onChange={(e) => setForm({ ...form, tax_center: e.target.value })} className="input" placeholder="Ex : CDI Gombe" /></div>
          <div><label className="label">Dispositif fiscal / DEF</label><input value={form.def_device_id} onChange={(e) => setForm({ ...form, def_device_id: e.target.value })} className="input" placeholder="Reference e-UF / e-MCF" /></div>
          <div><label className="label">Pays</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" placeholder="RDC" /></div>
          <div><label className="label">Standard comptable</label><input value={form.accounting_standard} onChange={(e) => setForm({ ...form, accounting_standard: e.target.value })} className="input" placeholder="SYSCOHADA / CPCC" /></div>
        </div>
      </div>

      <div className="card p-6"><h2 className="font-display text-lg font-bold text-ink-900">Coordonnees</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="label">Adresse</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" placeholder="Ex : 12 avenue de la Justice" /></div><div><label className="label">Code postal / zone</label><input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="input" placeholder="Commune / zone" /></div><div><label className="label">Ville</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" placeholder="Kinshasa" /></div><div><label className="label">Telephone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="+243 ..." /></div></div></div>
      <div className="card p-6"><h2 className="font-display text-lg font-bold text-ink-900">Paiement</h2><p className="text-xs text-ink-500">Coordonnees bancaires affichees sur vos factures.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="label">IBAN</label><input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} className={`input font-mono ${errors.iban ? 'ring-danger-500/40' : ''}`} placeholder="IBAN" />{errors.iban && <p className="mt-1 text-xs text-danger-600">{errors.iban}</p>}</div><div><label className="label">BIC</label><input value={form.bic} onChange={(e) => setForm({ ...form, bic: e.target.value })} className={`input font-mono ${errors.bic ? 'ring-danger-500/40' : ''}`} placeholder="RAWBCDKIXXX" />{errors.bic && <p className="mt-1 text-xs text-danger-600">{errors.bic}</p>}</div></div></div>

      <div className="flex items-center justify-between"><p className="text-xs text-ink-500">{user?.email ? `Connecte en tant que ${user.email}` : ''}</p><button onClick={save} disabled={saving} className="btn-primary">{saving ? <Save size={16} className="animate-pulse" /> : <Check size={16} />}{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div>
      <SecuritySection userId={user?.id || null} />
    </div>
  );
}

function SecuritySection({ userId }: { userId: string | null }) {
  const toast = useToast();
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const checkMfa = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.find((factor) => factor.status === 'verified');
      setMfaEnrolled(Boolean(totp));
    } catch {
      // ignore
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      setLogs(await fetchAuditLogs(30));
    } catch (error) {
      console.warn('audit logs load failed', error);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    void checkMfa();
    void loadLogs();
  }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    setVerifyCode('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Tenzo' });
      if (error) throw new Error(error.message);
      setFactorId(data.id);
      setQrUrl(data.totp.uri);
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'MFA indisponible' });
    } finally {
      setEnrolling(false);
    }
  };

  const verifyEnroll = async () => {
    if (!factorId || !verifyCode) return;
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw new Error(challenge.error.message);
      const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: verifyCode });
      if (verify.error) throw new Error(verify.error.message);
      setMfaEnrolled(true);
      setFactorId(null);
      setQrUrl(null);
      setVerifyCode('');
      await logAction('mfa.enroll', 'user', userId || undefined);
      toast({ kind: 'success', message: 'MFA activee avec succes.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Code invalide' });
    }
  };

  const cancelEnroll = async () => {
    if (factorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch {
        // ignore
      }
    }
    setFactorId(null);
    setQrUrl(null);
    setVerifyCode('');
  };

  const actionLabels: Record<string, { label: string; tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
    signin: { label: 'Connexion', tone: 'brand' },
    signout: { label: 'Deconnexion', tone: 'neutral' },
    'invoice.create': { label: 'Facture creee', tone: 'brand' },
    'invoice.send': { label: 'Facture envoyee', tone: 'brand' },
    'invoice.pay': { label: 'Facture payee', tone: 'success' },
    'invoice.remind': { label: 'Relance envoyee', tone: 'warning' },
    'invoice.normalize': { label: 'Facture normalisee', tone: 'success' },
    'quote.convert': { label: 'Devis converti', tone: 'brand' },
    'declaration.generate': { label: 'Declaration generee', tone: 'brand' },
    'declaration.submit': { label: 'Declaration teledeclaree', tone: 'success' },
    'settings.update': { label: 'Reglages modifies', tone: 'neutral' },
    'document.upload': { label: 'Document importe', tone: 'brand' },
    'document.match': { label: 'Rapprochement', tone: 'success' },
    'mfa.enroll': { label: 'MFA activee', tone: 'success' },
  };

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Shield size={20} /></div>
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Securite</h2>
            <p className="text-xs text-ink-500">Authentification multi-facteurs</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-ink-50 p-4">
          <div className="flex items-center gap-3">
            {mfaEnrolled ? <ShieldCheck size={24} className="text-success-600" /> : <KeyRound size={24} className="text-ink-400" />}
            <div>
              <p className="text-sm font-semibold text-ink-900">MFA {mfaEnrolled ? 'activee' : 'non activee'}</p>
              <p className="text-xs text-ink-500">{mfaEnrolled ? 'Votre compte est protege par un code TOTP.' : 'Renforcez la securite du compte avec un code a usage unique.'}</p>
            </div>
          </div>
          {mfaEnrolled ? <Badge tone="success"><ShieldCheck size={12} /> Activee</Badge> : <button onClick={startEnroll} disabled={enrolling} className="btn-primary"><KeyRound size={16} /> Activer MFA</button>}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2"><History size={18} className="text-brand-700" /><h2 className="font-display text-lg font-bold text-ink-900">Journal d audit</h2></div>
        <p className="mt-1 text-xs text-ink-500">30 dernieres actions enregistrees sur votre compte.</p>
        <div className="mt-4 divide-y divide-ink-100">
          {logsLoading && Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton h-12" />)}
          {!logsLoading && logs.length === 0 && <p className="py-6 text-center text-sm text-ink-500">Aucune action enregistree.</p>}
          {!logsLoading && logs.map((log) => {
            const meta = actionLabels[log.action] || { label: log.action, tone: 'neutral' as const };
            return (
              <div key={log.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <div>
                    <p className="text-sm text-ink-700">{log.action}</p>
                    {log.entity_type && <p className="text-xs text-ink-500">{log.entity_type}{log.metadata && Object.keys(log.metadata).length > 0 && ` - ${JSON.stringify(log.metadata).slice(0, 80)}`}</p>}
                  </div>
                </div>
                <span className="text-xs text-ink-400">{fmtDate(log.created_at)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={!!qrUrl} onClose={cancelEnroll} title="Activer l authentification multi-facteurs" footer={<><button onClick={cancelEnroll} className="btn-ghost">Annuler</button><button onClick={verifyEnroll} className="btn-primary" disabled={!verifyCode}><Check size={16} /> Verifier et activer</button></>}>
        <div className="space-y-4">
          <p className="text-sm text-ink-600">Scannez ce QR code avec votre application d authentification puis saisissez le code a 6 chiffres genere.</p>
          <div className="flex justify-center rounded-xl bg-white p-4 ring-1 ring-ink-200">
            {qrUrl && <div className="flex flex-col items-center gap-3"><QrCode size={120} className="text-ink-900" /><code className="block max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-ink-50 p-2 text-xs text-ink-600">{qrUrl}</code></div>}
          </div>
          <div>
            <label className="label">Code de verification</label>
            <input type="text" inputMode="numeric" maxLength={6} value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))} className="input text-center font-mono text-lg tracking-widest" placeholder="000000" />
          </div>
        </div>
      </Modal>
    </>
  );
}
