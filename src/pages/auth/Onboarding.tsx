import { useState } from 'react';
import { ArrowRight, Briefcase, Building2, Check } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../lib/auth';
import { LEGAL_STATUS_DEFINITIONS } from '../../lib/legal-status';
import { useRouter } from '../../lib/router';
import { seedCategories } from '../../lib/seed';
import { supabase } from '../../lib/supabase';
import type { LegalStatus, VatRegime } from '../../lib/types';

const legalOptions: { value: LegalStatus; label: string; hint: string }[] = LEGAL_STATUS_DEFINITIONS.map((item) => ({
  value: item.value,
  label: item.shortLabel,
  hint: item.associatesLabel,
}));

const vatOptions: { value: VatRegime; label: string; hint: string }[] = [
  { value: 'franchise', label: 'Franchise', hint: 'Pas de TVA facturee' },
  { value: 'reel_simplifie', label: 'Regime intermediaire', hint: 'TVA avec obligations reduites' },
  { value: 'reel_normal', label: 'Regime normal', hint: 'TVA declaree regulierement' },
];

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [legalStatus, setLegalStatus] = useState<LegalStatus | null>(null);
  const [vatRegime, setVatRegime] = useState<VatRegime>('reel_normal');
  const [taxId, setTaxId] = useState('');
  const [rccm, setRccm] = useState('');
  const [taxCenter, setTaxCenter] = useState('');
  const [defDeviceId, setDefDeviceId] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!user || !legalStatus) return;
    setSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      company_name: companyName.trim(),
      legal_status: legalStatus,
      vat_regime: vatRegime,
      siren: taxId.trim() || null,
      tax_id: taxId.trim() || null,
      rccm: rccm.trim() || null,
      tax_center: taxCenter.trim() || null,
      def_device_id: defDeviceId.trim() || null,
      accounting_standard: 'SYSCOHADA',
      country: 'RDC',
      address: address.trim() || null,
      postal_code: postalCode.trim() || null,
      city: city.trim() || null,
    });

    if (error) {
      setSaving(false);
      toast({ kind: 'error', message: `Erreur lors de l'enregistrement : ${error.message}` });
      return;
    }

    await seedCategories(user.id);
    await refreshProfile();
    setSaving(false);
    toast({ kind: 'success', message: 'Votre espace RDC est pret.' });
    navigate('/app');
  };

  const canNext = step === 0 ? companyName.trim().length > 0 && !!legalStatus : true;
  const selectedStatus = LEGAL_STATUS_DEFINITIONS.find((item) => item.value === legalStatus) || null;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo withText />
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className={step >= 0 ? 'font-semibold text-brand-700' : ''}>1. Societe</span>
            <span className="text-ink-300">-&gt;</span>
            <span className={step >= 1 ? 'font-semibold text-brand-700' : ''}>2. Coordonnees</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        {step === 0 && (
          <div className="animate-fade-in">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-950">Configurons votre entreprise</h1>
            <p className="mt-2 text-ink-600">Ces informations serviront a vos factures, rapports SYSCOHADA et declarations RDC.</p>

            <div className="mt-8 card p-6">
              <label className="label">Nom de l'activite</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input autoFocus value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input pl-9" placeholder="Ex : Maison Kivu Services" />
              </div>

              <div className="mt-6">
                <label className="label">Statut juridique</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {legalOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLegalStatus(option.value)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${legalStatus === option.value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-ink-200 bg-white hover:border-ink-300'}`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{option.label}</p>
                        <p className="text-xs text-ink-500">{option.hint}</p>
                      </div>
                      {legalStatus === option.value && <Check size={18} className="text-brand-600" />}
                    </button>
                  ))}
                </div>
                {selectedStatus && (
                  <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
                    <p className="font-semibold text-ink-900">{selectedStatus.label}</p>
                    <p className="mt-1">Responsabilite : {selectedStatus.liabilityLabel}</p>
                    <p className="mt-1">Base comptable : {selectedStatus.accountingBasis}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <label className="label">Regime de TVA</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {vatOptions.map((option) => (
                    <button key={option.value} onClick={() => setVatRegime(option.value)} className={`rounded-xl border px-3 py-2.5 text-left transition ${vatRegime === option.value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-ink-200 bg-white hover:border-ink-300'}`}>
                      <p className="text-sm font-semibold text-ink-900">{option.label}</p>
                      <p className="text-xs text-ink-500">{option.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button disabled={!canNext} onClick={() => setStep(1)} className="btn-primary">Continuer <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-950">Vos references RDC</h1>
            <p className="mt-2 text-ink-600">Ces champs alimentent la facture standard, puis la future normalisation DGI.</p>
            <div className="mt-8 card space-y-4 p-6">
              <div><label className="label">NIF / identifiant fiscal</label><input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="input" placeholder="Ex : A0700XXXXX" /></div>
              <div><label className="label">RCCM</label><input value={rccm} onChange={(e) => setRccm(e.target.value)} className="input" placeholder="Ex : CD/KIN/RCCM/24-B-1234" /></div>
              <div><label className="label">Centre des impots</label><input value={taxCenter} onChange={(e) => setTaxCenter(e.target.value)} className="input" placeholder="Ex : CDI Gombe" /></div>
              <div><label className="label">Reference dispositif fiscal</label><input value={defDeviceId} onChange={(e) => setDefDeviceId(e.target.value)} className="input" placeholder="e-UF / e-MCF / DEF" /></div>
              <div><label className="label">Adresse</label><input value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="12 avenue de la Justice" /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Code postal / zone</label><input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="input" placeholder="Gombe" /></div><div><label className="label">Ville</label><input value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="Kinshasa" /></div></div>
            </div>
            <div className="mt-6 flex items-center justify-between"><button onClick={() => setStep(0)} className="btn-ghost">Retour</button><button disabled={saving} onClick={finish} className="btn-primary">{saving ? 'Enregistrement...' : <>Terminer <Briefcase size={16} /></>}</button></div>
          </div>
        )}
      </main>
    </div>
  );
}
