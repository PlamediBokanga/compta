import { useMemo, useState } from 'react';
import { Calculator, Percent, TrendingUp, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fmtCDF, fmtPct } from '../../lib/format';
import { useTransactions } from '../../lib/hooks';
import { getLegalStatusDefinition, getLegalStatusLabel } from '../../lib/legal-status';
import { buildPayrollPostingGuide, estimateIere, estimateIprMonthly, getInppRate, simulatePayrollSocial } from '../../lib/social';

export function SocialPage() {
  const { profile } = useAuth();
  const { items: transactions } = useTransactions();

  const annualRevenue = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    return transactions
      .filter((transaction) => transaction.direction === 'in' && transaction.date >= yearStart)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  }, [transactions]);

  const [monthlyPayroll, setMonthlyPayroll] = useState(annualRevenue > 0 ? Math.round(annualRevenue / 12 / 3) : 1500);
  const [employeeCount, setEmployeeCount] = useState(1);
  const [companyNature, setCompanyNature] = useState<'private' | 'public'>('private');
  const [expatriatePayroll, setExpatriatePayroll] = useState(0);

  const legalStatus = profile?.legal_status ?? 'entreprise_individuelle';
  const definition = getLegalStatusDefinition(legalStatus);
  const payroll = useMemo(() => simulatePayrollSocial(monthlyPayroll, employeeCount, companyNature), [monthlyPayroll, employeeCount, companyNature]);
  const inppRate = getInppRate(employeeCount, companyNature);
  const iprEstimate = useMemo(
    () => estimateIprMonthly(payroll.grossPayroll, { cnssEmployeeDeduction: payroll.cnssEmployee }),
    [payroll.grossPayroll, payroll.cnssEmployee],
  );
  const iereEstimate = useMemo(() => estimateIere(expatriatePayroll), [expatriatePayroll]);
  const payrollPostingGuide = useMemo(() => buildPayrollPostingGuide(payroll, iprEstimate, iereEstimate), [payroll, iprEstimate, iereEstimate]);

  const socialWorkflow = useMemo(() => {
    const steps = [
      {
        id: 'payroll',
        title: 'Saisir la paie brute',
        detail: `${fmtCDF(payroll.grossPayroll)} de base mensuelle de paie`,
      },
      {
        id: 'social',
        title: 'Calculer les cotisations',
        detail: `${fmtCDF(payroll.totalSocialDue)} a reverser aux organismes sociaux`,
      },
      {
        id: 'tax',
        title: 'Retenir l IPR / IERE',
        detail: `${fmtCDF(iprEstimate.monthlyTax + iereEstimate.amount)} de fiscalite salariale estimee`,
      },
      {
        id: 'postings',
        title: 'Passer les ecritures',
        detail: `${payrollPostingGuide.lines.length} ecriture(s) conseillee(s)`,
      },
    ];

    const priorities = [
      { label: 'CNSS + INPP + ONEM', amount: payroll.totalSocialDue, tone: 'brand' as const },
      { label: 'IPR DGI', amount: iprEstimate.monthlyTax, tone: 'warning' as const },
      { label: 'IERE DGI', amount: iereEstimate.amount, tone: 'accent' as const },
    ].filter((item) => item.amount > 0);

    return { steps, priorities };
  }, [payroll, iprEstimate, iereEstimate, payrollPostingGuide.lines.length]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Social et cotisations RDC</h1>
        <p className="mt-1 text-sm text-ink-500">Obligations patronales liees a l embauche de salaries : CNSS, INPP, ONEM, IPR et IERE sur la paie du mois.</p>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Parcours principal</p>
            <h2 className="mt-1 font-display text-lg font-bold text-ink-950">Calculer la paie puis declarer les retenues</h2>
            <p className="mt-1 text-sm text-ink-500">Le module social doit vous aider a savoir quoi payer, quoi retenir et quoi comptabiliser sur le mois en cours.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <span className="font-semibold">{fmtCDF(payroll.totalSocialDue)}</span> social a reverser
            </div>
            <div className="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800">
              <span className="font-semibold">{fmtCDF(iprEstimate.monthlyTax)}</span> IPR estime
            </div>
            <div className="rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-800">
              <span className="font-semibold">{fmtCDF(iereEstimate.amount)}</span> IERE estime
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {socialWorkflow.steps.map((step, index) => (
            <div key={step.id} className="rounded-2xl bg-ink-50 p-3">
              <p className="text-xs text-ink-500">{index + 1}. {step.title}</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{step.detail}</p>
            </div>
          ))}
        </div>
        {socialWorkflow.priorities.length > 0 && (
          <div className="mt-4 rounded-2xl bg-ink-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink-900">A suivre ce mois-ci</p>
                <p className="text-xs text-ink-500">Les principaux montants a verifier avant declaration et comptabilisation.</p>
              </div>
              <span className="text-xs text-ink-500">{socialWorkflow.priorities.length} poste(s)</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {socialWorkflow.priorities.map((item) => (
                <div key={item.label} className="rounded-xl bg-white px-3 py-3 ring-1 ring-ink-100">
                  <p className="text-xs text-ink-500">{item.label}</p>
                  <p className={`mt-1 font-display text-lg font-bold ${item.tone === 'brand' ? 'text-brand-700' : item.tone === 'warning' ? 'text-warning-700' : 'text-accent-700'}`}>{fmtCDF(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="flex items-center gap-2"><Calculator size={20} className="text-brand-700" /><h2 className="font-display text-lg font-bold text-ink-900">Simulateur employeur</h2></div>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Masse salariale brute mensuelle</label>
              <input type="number" step="100" min="0" value={monthlyPayroll} onChange={(e) => setMonthlyPayroll(Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">Effectif</label>
              <input type="number" min="1" value={employeeCount} onChange={(e) => setEmployeeCount(Math.max(1, Number(e.target.value)))} className="input" />
            </div>
            <div>
              <label className="label">Nature de l entreprise</label>
              <select value={companyNature} onChange={(e) => setCompanyNature(e.target.value as 'private' | 'public')} className="input">
                <option value="private">Privee</option>
                <option value="public">Publique</option>
              </select>
            </div>
            <div>
              <label className="label">Remunerations expatries soumises a l IERE</label>
              <input type="number" step="100" min="0" value={expatriatePayroll} onChange={(e) => setExpatriatePayroll(Math.max(0, Number(e.target.value)))} className="input" />
              <p className="mt-1 text-xs text-ink-500">Optionnel: saisir seulement la part de paie des expatries quand elle existe.</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
              <p className="text-ink-500">Statut detecte</p>
              <p className="font-semibold text-ink-900">{getLegalStatusLabel(legalStatus)}</p>
              <p className="mt-1 text-xs text-ink-500">Des le premier salarie, les obligations CNSS, INPP et ONEM s appliquent, quelle que soit la forme juridique.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="card p-5"><div className="flex items-center gap-2 text-sm text-ink-500"><Wallet size={16} className="text-success-600" /> Cout employeur total</div><p className="mt-2 font-display text-2xl font-extrabold text-success-700">{fmtCDF(payroll.totalEmployerCost)}</p><p className="mt-1 text-xs text-ink-500">salaire brut + charges patronales</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 text-sm text-ink-500"><Users size={16} className="text-danger-600" /> Charges patronales</div><p className="mt-2 font-display text-2xl font-extrabold text-danger-700">{fmtCDF(payroll.totalEmployerCharges)}</p><p className="mt-1 text-xs text-ink-500">CNSS + INPP + ONEM</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 text-sm text-ink-500"><Wallet size={16} className="text-brand-600" /> Social a reverser</div><p className="mt-2 font-display text-2xl font-extrabold text-brand-700">{fmtCDF(payroll.totalSocialDue)}</p><p className="mt-1 text-xs text-ink-500">charges patronales + CNSS salariale</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 text-sm text-ink-500"><Percent size={16} className="text-warning-600" /> IPR estimatif</div><p className="mt-2 font-display text-2xl font-extrabold text-warning-700">{fmtCDF(iprEstimate.monthlyTax)}</p><p className="mt-1 text-xs text-ink-500">retenue DGI mensuelle estimee</p></div>
            <div className="card p-5"><div className="flex items-center gap-2 text-sm text-ink-500"><Percent size={16} className="text-accent-600" /> IERE estimatif</div><p className="mt-2 font-display text-2xl font-extrabold text-accent-700">{fmtCDF(iereEstimate.amount)}</p><p className="mt-1 text-xs text-ink-500">25 % sur les expatries</p></div>
          </div>

          {definition && <div className="card p-6"><div className="flex items-center gap-2"><TrendingUp size={18} className="text-brand-700" /><h3 className="font-display text-base font-bold text-ink-900">Matrice juridique RDC</h3></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Famille</p><p className="mt-1 font-semibold text-ink-900">{definition.family.replace(/_/g, ' ')}</p></div><div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Associes / membres</p><p className="mt-1 font-semibold text-ink-900">{definition.associatesLabel}</p></div><div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Responsabilite</p><p className="mt-1 font-semibold text-ink-900">{definition.liabilityLabel}</p></div><div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Finalite</p><p className="mt-1 font-semibold text-ink-900">{definition.profitPurpose.replace(/_/g, ' ')}</p></div><div className="rounded-xl bg-ink-50 p-4 sm:col-span-2"><p className="text-xs text-ink-500">Comptabilite</p><p className="mt-1 font-semibold text-ink-900">{definition.accountingBasis}</p><p className="mt-2 text-xs text-ink-500">Orientation fiscale : {definition.taxOrientation}</p></div></div><div className="mt-4 space-y-2">{definition.notes.map((note) => <div key={note} className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">{note}</div>)}</div></div>}

          <div className="card p-6">
            <h3 className="font-display text-base font-bold text-ink-900">Details des cotisations sociales</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">CNSS employeur</p><p className="mt-1 font-display text-xl font-bold text-ink-950">{fmtCDF(payroll.cnssEmployer)}</p><p className="mt-1 text-xs text-ink-500">13,5 % du salaire brut</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">CNSS salarie</p><p className="mt-1 font-display text-xl font-bold text-ink-950">{fmtCDF(payroll.cnssEmployee)}</p><p className="mt-1 text-xs text-ink-500">5 % retenu sur salaire</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">INPP employeur</p><p className="mt-1 font-display text-xl font-bold text-ink-950">{fmtCDF(payroll.inppEmployer)}</p><p className="mt-1 text-xs text-ink-500">{inppRate} % selon effectif et nature</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">ONEM employeur</p><p className="mt-1 font-display text-xl font-bold text-ink-950">{fmtCDF(payroll.onemEmployer)}</p><p className="mt-1 text-xs text-ink-500">0,2 %</p></div>
            </div>
            <div className="mt-4 space-y-3">{payroll.breakdown.map((item) => <div key={`${item.side}-${item.label}`} className="flex items-center justify-between border-b border-ink-100 pb-2 text-sm"><span className="text-ink-700">{item.label}</span><div className="flex items-center gap-4"><span className="text-xs text-ink-400">{item.rate}%</span><span className="font-semibold text-ink-900">{fmtCDF(item.amount)}</span></div></div>)}<div className="flex items-center justify-between border-t-2 border-ink-200 pt-3 font-display font-bold text-ink-950"><span>Total patronal</span><span>{fmtCDF(payroll.totalEmployerCharges)}</span></div><div className="flex items-center justify-between text-sm font-semibold text-ink-900"><span>Total retenue salarie</span><span>{fmtCDF(payroll.totalEmployeeWithholding)}</span></div><div className="flex items-center justify-between text-sm font-semibold text-ink-900"><span>Total a reverser</span><span>{fmtCDF(payroll.totalSocialDue)}</span></div></div>
            <p className="mt-4 text-xs text-ink-400">{payroll.periodicityHint}</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-ink-900">Ecritures comptables conseillees</h3>
                <p className="mt-1 text-xs text-ink-500">Guide pratique pour constater la paie, les retenues sociales, l IPR et l IERE.</p>
              </div>
              <span className="chip bg-brand-50 text-brand-700">{payrollPostingGuide.lines.length} ecriture(s)</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Salaire brut</p><p className="mt-1 font-display text-xl font-bold text-ink-950">{fmtCDF(payrollPostingGuide.grossPayroll)}</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Net estime</p><p className="mt-1 font-display text-xl font-bold text-success-700">{fmtCDF(payrollPostingGuide.netPayroll)}</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Social a reverser</p><p className="mt-1 font-display text-xl font-bold text-brand-700">{fmtCDF(payrollPostingGuide.socialRemittance)}</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">IPR a reverser</p><p className="mt-1 font-display text-xl font-bold text-warning-700">{fmtCDF(payrollPostingGuide.iprRemittance)}</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">IERE a reverser</p><p className="mt-1 font-display text-xl font-bold text-accent-700">{fmtCDF(payrollPostingGuide.iereRemittance)}</p></div>
            </div>
            <div className="mt-4 space-y-3">
              {payrollPostingGuide.lines.map((line) => (
                <div key={line.id} className="rounded-xl bg-ink-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{line.label}</p>
                      <p className="text-xs text-ink-500">{line.stage === 'constatation' ? 'Constatation comptable' : 'Paiement / reversement'}</p>
                    </div>
                    <p className="font-semibold text-ink-900">{fmtCDF(line.amount)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-ink-500 sm:grid-cols-2">
                    <div><p className="uppercase tracking-wide">Debit</p><p className="mt-1 font-medium text-ink-900">{line.debitAccount}</p></div>
                    <div><p className="uppercase tracking-wide">Credit</p><p className="mt-1 font-medium text-ink-900">{line.creditAccount}</p></div>
                  </div>
                  <p className="mt-2 text-sm text-ink-600">{line.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-display text-base font-bold text-ink-900">Lecture IPR et IERE DGI</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Base imposable mensuelle</p><p className="mt-1 font-display text-xl font-bold text-ink-950">{fmtCDF(iprEstimate.taxableMonthlyBase)}</p><p className="mt-1 text-xs text-ink-500">apres deduction CNSS salarie</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Taux effectif IPR</p><p className="mt-1 font-display text-xl font-bold text-ink-950">{fmtPct(iprEstimate.effectiveMonthlyRate)}</p><p className="mt-1 text-xs text-ink-500">sur base imposable du mois</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Base IERE</p><p className="mt-1 font-display text-xl font-bold text-ink-950">{fmtCDF(iereEstimate.expatriateGrossPayroll)}</p><p className="mt-1 text-xs text-ink-500">remunerations expatries declarees</p></div>
              <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">IERE</p><p className="mt-1 font-display text-xl font-bold text-accent-700">{fmtCDF(iereEstimate.amount)}</p><p className="mt-1 text-xs text-ink-500">taux legal {iereEstimate.rate} %</p></div>
            </div>
            <div className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
              {iprEstimate.minimumApplied ? 'Minimum 2 500 FC actif pour l IPR.' : iprEstimate.cappedAtThirtyPercent ? 'Plafond IPR de 30 % actif sur cette estimation.' : 'Bareme progressif IPR applique sur la base imposable nette.'}
            </div>
            <div className="mt-4 space-y-3">{iprEstimate.bracketBreakdown.map((item) => <div key={item.label} className="flex items-center justify-between border-b border-ink-100 pb-2 text-sm"><span className="text-ink-700">{item.label}</span><div className="flex items-center gap-4"><span className="text-xs text-ink-400">{item.rate}%</span><span className="font-semibold text-ink-900">{fmtCDF(item.tax)}</span></div></div>)}</div>
            <div className="mt-4 space-y-2">{iprEstimate.notes.map((note) => <p key={note} className="text-xs text-ink-500">{note}</p>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
