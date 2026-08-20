import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Download, Eye, FileText, Plus, Send, Shield, Sparkles, Trash2, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { deleteDeclaration, insertDeclaration, updateDeclaration } from '../../lib/api';
import { buildAccountingReport } from '../../lib/accounting';
import { useAuth } from '../../lib/auth';
import { logAction } from '../../lib/audit';
import { downloadFile } from '../../lib/download';
import { fmtDate, fmtCDF, fmtPct } from '../../lib/format';
import { useCategories, useDeclarations, useTransactions } from '../../lib/hooks';
import { generateLiasse, generateLiasseCSV, type LiasseForm } from '../../lib/liasse';
import { estimateIere, estimateIprMonthly, simulatePayrollSocial } from '../../lib/social';
import type { Declaration, DeclarationStatus, DeclarationType } from '../../lib/types';

const typeMeta: Record<DeclarationType, { label: string; tone: 'brand' | 'accent' | 'neutral' }> = {
  tva: { label: 'TVA DGI', tone: 'brand' },
  liasse_2035: { label: 'Annexes OHADA', tone: 'accent' },
  liasse_2033: { label: 'Resultat fiscal / IBP', tone: 'accent' },
  liasse_2065: { label: 'Impot sur les benefices', tone: 'accent' },
  urssaf: { label: 'CNSS / INPP / ONEM', tone: 'brand' },
  das2: { label: 'IPR / IERE DGI', tone: 'neutral' },
  cfe: { label: 'Patente / licence', tone: 'neutral' },
  '2042_c_pro': { label: 'IRPP / dirigeant', tone: 'neutral' },
};

const statusMeta: Record<DeclarationStatus, { label: string; tone: 'neutral' | 'warning' | 'brand' | 'success' }> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  ready: { label: 'Prete', tone: 'warning' },
  submitted: { label: 'Teledeclaree', tone: 'brand' },
  paid: { label: 'Payee', tone: 'success' },
  archived: { label: 'Archivee', tone: 'neutral' },
};

function buildMonthlyDueDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().slice(0, 10);
}

function buildMonthlyPeriodLabel() {
  const now = new Date();
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(now);
}

function getReadinessTone(ready: boolean) {
  return ready ? 'success' : 'warning';
}

export function DeclarationsPage() {
  const { user, profile } = useAuth();
  const { items: declarations, loading, reload } = useDeclarations();
  const { items: transactions } = useTransactions();
  const { items: categories } = useCategories();
  const toast = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [viewingLiasse, setViewingLiasse] = useState<LiasseForm | null>(null);
  const [viewingDeclaration, setViewingDeclaration] = useState<Declaration | null>(null);
  const [employeeCount, setEmployeeCount] = useState(1);
  const [companyNature, setCompanyNature] = useState<'private' | 'public'>('private');
  const [expatriatePayroll, setExpatriatePayroll] = useState(0);

  const accounting = useMemo(() => buildAccountingReport(transactions, categories), [transactions, categories]);
  const ibpForm = useMemo(() => generateLiasse('liasse_2065', transactions, categories, profile), [transactions, categories, profile]);
  const cpccForm = useMemo(() => generateLiasse('liasse_2033', transactions, categories, profile), [transactions, categories, profile]);

  const payrollBase = useMemo(() => {
    const salaryCategories = categories
      .filter((category) => {
        const label = category.label.toLowerCase();
        return label.includes('salaire') || label.includes('personnel') || label.includes('paie');
      })
      .map((category) => category.id);

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthlyPayroll = transactions
      .filter(
        (transaction) =>
          transaction.direction === 'out' &&
          transaction.date.startsWith(currentMonth) &&
          transaction.category_id &&
          salaryCategories.includes(transaction.category_id),
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const accountingPayrollDebt = Math.max(0, accounting.controls.payrollDebt);
    return monthlyPayroll > 0 ? monthlyPayroll : accountingPayrollDebt > 0 ? accountingPayrollDebt : 1500;
  }, [transactions, categories, accounting.controls.payrollDebt]);

  const payrollSocial = useMemo(
    () => simulatePayrollSocial(payrollBase, employeeCount, companyNature),
    [payrollBase, employeeCount, companyNature],
  );

  const iprEstimate = useMemo(
    () => estimateIprMonthly(payrollSocial.grossPayroll, { cnssEmployeeDeduction: payrollSocial.cnssEmployee }),
    [payrollSocial.grossPayroll, payrollSocial.cnssEmployee],
  );

  const iereEstimate = useMemo(() => estimateIere(expatriatePayroll), [expatriatePayroll]);

  const computedTaxes = useMemo(() => {
    const vatDue = accounting.controls.vatPayable > 0 ? accounting.controls.vatPayable : 0;
    const vatCredit = accounting.controls.vatCredit;
    const estimatedResult = accounting.pnl.netResult;
    const estimatedIbp = ibpForm.total;

    return {
      collected: accounting.controls.vatCollected,
      deductible: accounting.controls.vatDeductible,
      vatDue,
      vatCredit,
      estimatedResult,
      estimatedIbp,
      payrollEmployerCharges: payrollSocial.totalEmployerCharges,
      payrollEmployeeWithholding: payrollSocial.totalEmployeeWithholding,
      payrollSocialDue: payrollSocial.totalSocialDue,
      estimatedIpr: iprEstimate.monthlyTax,
      estimatedIere: iereEstimate.amount,
    };
  }, [accounting, ibpForm.total, payrollSocial, iprEstimate, iereEstimate.amount]);

  const fiscalProfileReady = Boolean(profile?.tax_id || profile?.siren) && Boolean(profile?.rccm) && Boolean(profile?.tax_center);
  const normalizedInvoiceReady = Boolean(profile?.def_device_id);
  const accountingReady = accounting.controls.uncategorizedTransactions === 0 && accounting.controls.imbalance <= 0.01;
  const tvaReady = fiscalProfileReady && accountingReady;
  const socialReady = payrollSocial.grossPayroll > 0 && employeeCount >= 1;
  const iprReady = socialReady && Boolean(profile?.tax_id || profile?.siren);

  const declarationReconciliation = useMemo(() => {
    const activeDeclarations = declarations.filter((item) => item.status !== 'archived');
    const socialDeclared = activeDeclarations.filter((item) => item.type === 'urssaf').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const iprDeclared = activeDeclarations.filter((item) => item.type === 'das2').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const tvaDeclared = activeDeclarations.filter((item) => item.type === 'tva').reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return [
      {
        id: 'social',
        label: 'CNSS / INPP / ONEM',
        expected: payrollSocial.totalSocialDue,
        booked: Math.max(0, accounting.controls.socialDebt),
        declared: socialDeclared,
        gap: Math.max(0, accounting.controls.socialDebt) - socialDeclared,
        detail: 'Comparer la paie du mois, les comptes 43 et les declarations sociales preparees.',
      },
      {
        id: 'ipr',
        label: 'IPR / IERE DGI',
        expected: iprEstimate.monthlyTax + iereEstimate.amount,
        booked: Math.max(0, accounting.controls.taxDebt),
        declared: iprDeclared,
        gap: Math.max(0, accounting.controls.taxDebt) - iprDeclared,
        detail: 'Verifier les comptes 442100 et 442300, la retenue IPR et la base IERE des expatries.',
      },
      {
        id: 'tva',
        label: 'TVA DGI',
        expected: computedTaxes.vatDue,
        booked: Math.max(0, accounting.controls.vatPayable),
        declared: tvaDeclared,
        gap: Math.max(0, accounting.controls.vatPayable) - tvaDeclared,
        detail: 'Rapprocher la TVA nette, la centralisation 443/445 vers 4441 ou 4449 et les declarations TVA deja generees.',
      },
    ];
  }, [declarations, payrollSocial.totalSocialDue, accounting.controls.socialDebt, iprEstimate.monthlyTax, iereEstimate.amount, accounting.controls.taxDebt, computedTaxes.vatDue, accounting.controls.vatPayable]);
  const monthlyDueDate = buildMonthlyDueDate();
  const monthlyPeriodLabel = buildMonthlyPeriodLabel();
  const monthlyTaxSlip = [
    {
      id: 'tva',
      title: 'TVA DGI',
      amount: computedTaxes.vatDue,
      tone: 'brand' as const,
      dueDate: monthlyDueDate,
      lines: [
        { label: 'TVA collectee', value: fmtCDF(computedTaxes.collected) },
        { label: 'TVA deductible', value: fmtCDF(computedTaxes.deductible) },
        { label: 'Credit reporte', value: fmtCDF(computedTaxes.vatCredit) },
        { label: 'TVA nette a reverser', value: fmtCDF(computedTaxes.vatDue) },
      ],
      reminder: computedTaxes.vatCredit > 0 ? 'Un credit de TVA est disponible et doit etre rapproche puis centralise vers 444900 avant emission definitive.' : 'La TVA nette du mois doit etre rapprochee puis centralisee de 443/445 vers 444100 avant teledeclaration.',
    },
    {
      id: 'social',
      title: 'CNSS / INPP / ONEM',
      amount: payrollSocial.totalSocialDue,
      tone: 'accent' as const,
      dueDate: monthlyDueDate,
      lines: [
        { label: 'CNSS employeur', value: fmtCDF(payrollSocial.cnssEmployer) },
        { label: 'INPP employeur', value: fmtCDF(payrollSocial.inppEmployer) },
        { label: 'ONEM employeur', value: fmtCDF(payrollSocial.onemEmployer) },
        { label: 'CNSS salarie', value: fmtCDF(payrollSocial.cnssEmployee) },
      ],
      reminder: 'Le bordereau social doit couvrir les charges patronales et la retenue CNSS salariale du mois.',
    },
    {
      id: 'ipr',
      title: 'IPR / IERE DGI',
      amount: iprEstimate.monthlyTax + iereEstimate.amount,
      tone: 'warning' as const,
      dueDate: monthlyDueDate,
      lines: [
        { label: 'Base imposable', value: fmtCDF(iprEstimate.taxableMonthlyBase) },
        { label: 'CNSS deductible', value: fmtCDF(iprEstimate.cnssEmployeeDeduction) },
        { label: 'Taux effectif', value: fmtPct(iprEstimate.effectiveMonthlyRate) },
        { label: 'IPR estime', value: fmtCDF(iprEstimate.monthlyTax) },
        { label: 'Base IERE expatries', value: fmtCDF(iereEstimate.expatriateGrossPayroll) },
        { label: 'IERE estime', value: fmtCDF(iereEstimate.amount) },
      ],
      reminder: iereEstimate.amount > 0 ? 'L IPR estimatif est complete par l IERE sur les remunerations expatries declarees.' : iprEstimate.minimumApplied ? 'Le minimum fiscal mensuel reste actif sur cette estimation.' : iprEstimate.cappedAtThirtyPercent ? 'Le plafond de 30 % s applique sur cette estimation mensuelle.' : 'Le bareme progressif mensuel est applique sur la base imposable nette.',
    },
  ];

  const declarationWorkflow = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const readyCount = declarations.filter((item) => item.status === 'ready').length;
    const submittedCount = declarations.filter((item) => item.status === 'submitted').length;
    const paidCount = declarations.filter((item) => item.status === 'paid').length;
    const overdueCount = declarations.filter((item) => item.status !== 'paid' && item.status !== 'archived' && item.due_date && item.due_date < today).length;
    return { readyCount, submittedCount, paidCount, overdueCount };
  }, [declarations]);

  const readinessItems = [
    {
      id: 'fiscal-profile',
      label: 'Profil fiscal',
      ready: fiscalProfileReady,
      detail: fiscalProfileReady
        ? 'NIF, RCCM et centre des impots sont renseignes.'
        : 'Completer NIF, RCCM et centre des impots pour fiabiliser les declarations.',
    },
    {
      id: 'accounting-quality',
      label: 'Qualite comptable',
      ready: accountingReady,
      detail: accountingReady
        ? 'Balance equilibree et aucune operation non categorisee.'
        : `${accounting.controls.uncategorizedTransactions} operation(s) non categorisee(s), ecart de balance ${fmtCDF(accounting.controls.imbalance)}.`,
    },
    {
      id: 'tva',
      label: 'TVA DGI',
      ready: tvaReady,
      detail: computedTaxes.vatCredit > 0
        ? `Credit de TVA disponible: ${fmtCDF(computedTaxes.vatCredit)} via 444900.`
        : `TVA nette a declarer: ${fmtCDF(computedTaxes.vatDue)} via 444100.`,
    },
    {
      id: 'social',
      label: 'CNSS / INPP / ONEM',
      ready: socialReady,
      detail: `Base de paie du mois: ${fmtCDF(payrollSocial.grossPayroll)} pour ${employeeCount} employe(s).`,
    },
    {
      id: 'ipr',
      label: 'IPR / IERE',
      ready: iprReady,
      detail: `Base imposable mensuelle estimee: ${fmtCDF(iprEstimate.taxableMonthlyBase)}.`,
    },
    {
      id: 'normalization',
      label: 'Facture normalisee',
      ready: normalizedInvoiceReady,
      detail: normalizedInvoiceReady
        ? 'Le profil DEF est renseigne pour le flux de normalisation DGI.'
        : 'Renseigner l identifiant DEF pour preparer le flux de normalisation des factures.',
    },
  ];

  const generateTva = async () => {
    if (!user) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0);
    const dueDate = new Date(year, month + 1, 15);
    const periodLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(periodStart);
    const amount = computedTaxes.vatDue > 0 ? computedTaxes.vatDue : 0;
    const centralizationLines = accounting.vatCentralization.lines
      .map((line) => `${line.debitAccount} / ${line.creditAccount} : ${fmtCDF(line.amount)}`)
      .join(' | ');
    const note = computedTaxes.vatCredit > 0
      ? `TVA collectee ${fmtCDF(computedTaxes.collected)} - TVA deductible ${fmtCDF(computedTaxes.deductible)} - credit reporte ${fmtCDF(computedTaxes.vatCredit)} - centralisation ${accounting.vatCentralization.targetAccount} - ${centralizationLines}`
      : `TVA collectee ${fmtCDF(computedTaxes.collected)} - TVA deductible ${fmtCDF(computedTaxes.deductible)} - centralisation ${accounting.vatCentralization.targetAccount} - ${centralizationLines}`;

    try {
      await insertDeclaration({
        user_id: user.id,
        type: 'tva',
        period_label: periodLabel,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        amount,
        status: 'ready',
        due_date: dueDate.toISOString().slice(0, 10),
        notes: note,
      });
      await logAction('declaration.generate', 'declaration', undefined, { type: 'tva', period: periodLabel, amount });
      reload();
      toast({ kind: 'success', message: `Declaration TVA ${periodLabel} generee.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const generatePayrollDeclaration = async () => {
    if (!user) return;
    const periodLabel = buildMonthlyPeriodLabel();
    const dueDate = buildMonthlyDueDate();

    try {
      await insertDeclaration({
        user_id: user.id,
        type: 'urssaf',
        period_label: periodLabel,
        amount: payrollSocial.totalSocialDue,
        status: 'ready',
        due_date: dueDate,
        notes: `CNSS employeur ${fmtCDF(payrollSocial.cnssEmployer)} | INPP ${fmtCDF(payrollSocial.inppEmployer)} | ONEM ${fmtCDF(payrollSocial.onemEmployer)} | retenue CNSS salarie ${fmtCDF(payrollSocial.cnssEmployee)} | total a reverser ${fmtCDF(payrollSocial.totalSocialDue)} | masse salariale ${fmtCDF(payrollSocial.grossPayroll)}`,
      });
      await logAction('declaration.generate', 'declaration', undefined, { type: 'urssaf', period: periodLabel, amount: payrollSocial.totalSocialDue });
      reload();
      toast({ kind: 'success', message: `Declaration sociale ${periodLabel} generee.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const generateIprDeclaration = async () => {
    if (!user) return;
    const periodLabel = buildMonthlyPeriodLabel();
    const dueDate = buildMonthlyDueDate();

    try {
      await insertDeclaration({
        user_id: user.id,
        type: 'das2',
        period_label: periodLabel,
        amount: iprEstimate.monthlyTax + iereEstimate.amount,
        status: 'ready',
        due_date: dueDate,
        notes: `IPR estime ${fmtCDF(iprEstimate.monthlyTax)} | base imposable mensuelle ${fmtCDF(iprEstimate.taxableMonthlyBase)} | CNSS salarie ${fmtCDF(iprEstimate.cnssEmployeeDeduction)} | base IERE expatries ${fmtCDF(iereEstimate.expatriateGrossPayroll)} | IERE estime ${fmtCDF(iereEstimate.amount)} | bareme progressif DGI applique en estimation mensuelle.`,
      });
      await logAction('declaration.generate', 'declaration', undefined, { type: 'das2', period: periodLabel, amount: iprEstimate.monthlyTax + iereEstimate.amount });
      reload();
      toast({ kind: 'success', message: `Declaration IPR / IERE ${periodLabel} preparee.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const generateLiasseDeclaration = async (type: DeclarationType) => {
    if (!user) return;

    const form = generateLiasse(type, transactions, categories, profile);
    const year = new Date().getFullYear();
    const dueDate = type === 'liasse_2065' ? `${year + 1}-04-30` : `${year + 1}-05-15`;

    try {
      await insertDeclaration({
        user_id: user.id,
        type,
        period_label: String(year),
        period_start: `${year}-01-01`,
        period_end: `${year}-12-31`,
        amount: form.total,
        status: 'ready',
        due_date: dueDate,
        notes: form.lines.map((line) => `${line.code} ${line.label}: ${fmtCDF(line.amount)}`).join(' | '),
      });
      await logAction('declaration.generate', 'declaration', undefined, { type, period: String(year), amount: form.total });
      setViewingLiasse(form);
      reload();
      toast({ kind: 'success', message: `${form.title} generee.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const exportLiasseCsv = (form: LiasseForm) => {
    const csv = generateLiasseCSV(form);
    downloadFile(csv, `${form.type}-${new Date().getFullYear()}.csv`, 'text/csv');
    toast({ kind: 'success', message: 'Export CSV telecharge.' });
  };

  const exportDeclaration = (declaration: Declaration) => {
    const lines = [
      `Type: ${typeMeta[declaration.type]?.label || declaration.type}`,
      `Periode: ${declaration.period_label}`,
      `Statut: ${statusMeta[declaration.status]?.label || declaration.status}`,
      `Echeance: ${declaration.due_date ? fmtDate(declaration.due_date) : '-'}`,
      `Montant: ${fmtCDF(Number(declaration.amount || 0))}`,
      `Soumise le: ${declaration.submitted_at ? fmtDate(declaration.submitted_at) : '-'}`,
      '',
      'Notes :',
      declaration.notes || 'Aucune note.',
    ];
    downloadFile(lines.join("\n"), `declaration-${declaration.type}-${declaration.period_label.replace(/[^a-z0-9]+/gi, '-')}.txt`, 'text/plain;charset=utf-8');
    toast({ kind: 'success', message: 'Export de declaration telecharge.' });
  };

  const markDeclarationPaid = async (id: string) => {
    try {
      await updateDeclaration(id, { status: 'paid' });
      await logAction('declaration.pay', 'declaration', id);
      reload();
      toast({ kind: 'success', message: 'Declaration marquee comme payee.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const submitDeclaration = async (id: string) => {
    try {
      await updateDeclaration(id, { status: 'submitted', submitted_at: new Date().toISOString() });
      await logAction('declaration.submit', 'declaration', id);
      reload();
      toast({ kind: 'success', message: 'Declaration marquee comme teledeclaree.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const removeDeclaration = async (id: string) => {
    if (!confirm('Supprimer cette declaration ?')) return;
    try {
      await deleteDeclaration(id);
      reload();
      toast({ kind: 'success', message: 'Declaration supprimee.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const upcoming = declarations
    .filter((item) => item.status !== 'paid' && item.status !== 'archived' && item.status !== 'submitted')
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Declarations</h1>
          <p className="mt-1 text-sm text-ink-500">TVA DGI, IPR, obligations sociales et etats utiles au suivi SYSCOHADA / CPCC.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={generateTva} className="btn-secondary"><Sparkles size={16} /> Generer TVA</button>
          <button onClick={generatePayrollDeclaration} className="btn-secondary"><Users size={16} /> Charges sociales</button>
          <button onClick={generateIprDeclaration} className="btn-secondary"><FileText size={16} /> IPR / IERE</button>
          <button onClick={() => generateLiasseDeclaration('liasse_2033')} className="btn-secondary"><FileText size={16} /> Resultat / IBP</button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={16} /> Nouvelle</button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Parcours principal</p>
            <h2 className="mt-1 font-display text-lg font-bold text-ink-950">Preparer, teledeclarer puis payer les obligations RDC</h2>
            <p className="mt-1 text-sm text-ink-500">Au 4 aout 2026, cette page doit vous montrer clairement ce qui est pret, ce qui est en retard et ce qui reste a payer.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-800"><span className="font-semibold">{declarationWorkflow.readyCount}</span> prete(s)</div>
            <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800"><span className="font-semibold">{declarationWorkflow.submittedCount}</span> teledeclaree(s)</div>
            <div className="rounded-xl bg-success-50 px-3 py-2 text-sm text-success-800"><span className="font-semibold">{declarationWorkflow.paidCount}</span> payee(s)</div>
            <div className={declarationWorkflow.overdueCount > 0 ? 'rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700' : 'rounded-xl bg-ink-100 px-3 py-2 text-sm text-ink-700'}><span className="font-semibold">{declarationWorkflow.overdueCount}</span> en retard</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">1. Verifier</p><p className="mt-1 text-sm font-semibold text-ink-900">Profil fiscal, balance et paie du mois</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">2. Generer</p><p className="mt-1 text-sm font-semibold text-ink-900">TVA, social, IPR / IERE et liasses utiles</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">3. Teledeclarer</p><p className="mt-1 text-sm font-semibold text-ink-900">Faire passer les declarations de pretes a soumises</p></div>
          <div className="rounded-2xl bg-ink-50 p-3"><p className="text-xs text-ink-500">4. Payer</p><p className="mt-1 text-sm font-semibold text-ink-900">Suivre les echeances et solder les dettes</p></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="card p-5"><p className="text-xs text-ink-500">TVA due</p><p className="mt-2 font-display text-2xl font-extrabold text-brand-700">{fmtCDF(computedTaxes.vatDue)}</p><p className="mt-1 text-xs text-ink-500">Credit TVA: {fmtCDF(computedTaxes.vatCredit)}</p></div>
        <div className="card p-5"><p className="text-xs text-ink-500">Charges patronales</p><p className="mt-2 font-display text-2xl font-extrabold text-danger-700">{fmtCDF(computedTaxes.payrollEmployerCharges)}</p><p className="mt-1 text-xs text-ink-500">Taux effectif: {fmtPct(payrollSocial.effectiveEmployerRate)}</p></div>
        <div className="card p-5"><p className="text-xs text-ink-500">Retenue CNSS</p><p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{fmtCDF(computedTaxes.payrollEmployeeWithholding)}</p><p className="mt-1 text-xs text-ink-500">Taux salarie: {fmtPct(payrollSocial.effectiveEmployeeRate)}</p></div>
        <div className="card p-5"><p className="text-xs text-ink-500">Social a reverser</p><p className="mt-2 font-display text-2xl font-extrabold text-brand-700">{fmtCDF(computedTaxes.payrollSocialDue)}</p><p className="mt-1 text-xs text-ink-500">charges patronales + CNSS salarie</p></div>
        <div className="card p-5"><p className="text-xs text-ink-500">IPR estimatif</p><p className="mt-2 font-display text-2xl font-extrabold text-warning-700">{fmtCDF(computedTaxes.estimatedIpr)}</p><p className="mt-1 text-xs text-ink-500">Base imposable: {fmtCDF(iprEstimate.taxableMonthlyBase)}</p></div>
        <div className="card p-5"><p className="text-xs text-ink-500">IBP estime</p><p className="mt-2 font-display text-2xl font-extrabold text-accent-700">{fmtCDF(computedTaxes.estimatedIbp)}</p><p className="mt-1 text-xs text-ink-500">Resultat net: {fmtCDF(computedTaxes.estimatedResult)}</p></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><Shield size={20} /></div>
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">Pilotage fiscal et social RDC</h2>
              <p className="text-xs text-ink-500">Les declarations sont maintenant alignees sur la balance, les dettes fiscales et la paie estimee du mois.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Base salariale mensuelle</p><p className="mt-1 font-display text-xl font-extrabold text-ink-900">{fmtCDF(payrollSocial.grossPayroll)}</p></div>
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Dettes sociales ouvertes</p><p className="mt-1 font-display text-xl font-extrabold text-ink-900">{fmtCDF(Math.max(0, accounting.controls.socialDebt))}</p></div>
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Dettes fiscales ouvertes</p><p className="mt-1 font-display text-xl font-extrabold text-ink-900">{fmtCDF(Math.max(0, accounting.controls.taxDebt))}</p></div>
            <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-200"><p className="text-xs text-brand-700">Profil fiscal</p><p className="mt-1 text-sm font-semibold text-brand-900">{profile?.tax_id || profile?.siren ? 'NIF renseigne' : 'NIF manquant'}</p><p className="mt-1 text-xs text-brand-700">{profile?.rccm ? 'RCCM renseigne' : 'RCCM manquant'} - {profile?.def_device_id ? 'DEF renseigne' : 'DEF manquant'}</p></div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div><label className="label">Effectif</label><input type="number" min="1" value={employeeCount} onChange={(e) => setEmployeeCount(Math.max(1, Number(e.target.value)))} className="input" /></div>
            <div><label className="label">Nature</label><select value={companyNature} onChange={(e) => setCompanyNature(e.target.value as 'private' | 'public')} className="input"><option value="private">Privee</option><option value="public">Publique</option></select></div>
            <div><label className="label">Base expatries IERE</label><input type="number" min="0" step="100" value={expatriatePayroll} onChange={(e) => setExpatriatePayroll(Math.max(0, Number(e.target.value)))} className="input" /></div>
            <div><label className="label">Echeance mensuelle DGI</label><input value={buildMonthlyDueDate()} readOnly className="input bg-ink-50" /></div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Retenue CNSS salarie</p><p className="mt-1 font-semibold text-ink-900">{fmtCDF(iprEstimate.cnssEmployeeDeduction)}</p></div>
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Taux effectif IPR</p><p className="mt-1 font-semibold text-ink-900">{fmtPct(iprEstimate.effectiveMonthlyRate)}</p></div>
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Base IERE</p><p className="mt-1 font-semibold text-ink-900">{fmtCDF(iereEstimate.expatriateGrossPayroll)}</p></div>
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Regle appliquee</p><p className="mt-1 text-sm font-semibold text-ink-900">{iprEstimate.minimumApplied ? 'Minimum 2 500 FC actif' : iprEstimate.cappedAtThirtyPercent ? 'Plafond 30% actif' : 'Bareme progressif'}</p></div>
          </div>

          <div className="mt-4 rounded-2xl bg-ink-50 p-4 text-xs text-ink-600">
            <p>L application prepare ici les declarations internes et les montants de travail. La facture standard reste separee du flux de facture normalisee DGI, qui sera active quand les API officielles DEF/DGI seront branchees.</p>
            <p className="mt-2">Echeance mensuelle de travail retenue dans l application: le 15 du mois suivant pour la TVA et les retenues mensuelles a transmettre a la DGI.</p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-success-600" />
            <h2 className="font-display text-base font-bold text-ink-900">Etat de preparation</h2>
          </div>
          <div className="mt-4 space-y-3">
            {readinessItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-ink-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-900">{item.label}</p>
                  <Badge tone={getReadinessTone(item.ready)}>{item.ready ? 'Pret' : 'A completer'}</Badge>
                </div>
                <p className="mt-2 text-xs text-ink-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning-600" />
            <h2 className="font-display text-base font-bold text-ink-900">Points de controle comptables</h2>
          </div>
          <div className="mt-4 space-y-3">
            {accounting.closingChecks.map((check) => (
              <div key={check.id} className="rounded-xl bg-ink-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-900">{check.label}</p>
                  <Badge tone={check.status === 'ok' ? 'success' : 'warning'}>{check.status === 'ok' ? 'OK' : 'A revoir'}</Badge>
                </div>
                <p className="mt-2 text-xs text-ink-500">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-ink-900">Synthese CPCC / IBP</h2>
              <p className="text-xs text-ink-500">Pre-calculs issus des transactions et de la balance comptable.</p>
            </div>
            <button onClick={() => setViewingLiasse(cpccForm)} className="btn-ghost"><Eye size={16} /> Apercu</button>
          </div>
          <div className="mt-4 space-y-3">
            {cpccForm.lines.slice(0, 6).map((line) => (
              <div key={line.code} className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3">
                <div>
                  <p className="text-xs text-ink-500">{line.code}</p>
                  <p className="text-sm font-medium text-ink-900">{line.label}</p>
                </div>
                <p className="text-sm font-semibold text-ink-900">{fmtCDF(line.amount)}</p>
              </div>
            ))}
            <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-200">
              <p className="text-xs text-brand-700">IBP estime</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-brand-900">{fmtCDF(ibpForm.total)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">Bordereau fiscal mensuel RDC</h2>
            <p className="text-xs text-ink-500">Periode de travail: {monthlyPeriodLabel}. Echeance de travail actuelle: {fmtDate(monthlyDueDate)}.</p>
          </div>
          <Badge tone="brand">{fmtDate(monthlyDueDate)}</Badge>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {monthlyTaxSlip.map((section) => (
            <div key={section.id} className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{section.title}</p>
                  <p className="mt-1 text-xs text-ink-500">Echeance: {fmtDate(section.dueDate)}</p>
                </div>
                <Badge tone={section.tone}>{fmtCDF(section.amount)}</Badge>
              </div>
              <div className="mt-4 space-y-2">
                {section.lines.map((line) => (
                  <div key={line.label} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-ink-100">
                    <span className="text-xs text-ink-500">{line.label}</span>
                    <span className="text-sm font-semibold text-ink-900">{line.value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-ink-600">{section.reminder}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink-900">Centralisation TVA SYSCOHADA</h2>
            <p className="mt-1 text-xs text-ink-500">Virer 443 et 445 vers 444100 ou 444900 avant declaration DGI de la periode.</p>
          </div>
          <Badge tone={accounting.vatCentralization.status === 'payable' ? 'warning' : accounting.vatCentralization.status === 'credit' ? 'brand' : 'neutral'}>
            {accounting.vatCentralization.status === 'payable' ? 'TVA due' : accounting.vatCentralization.status === 'credit' ? 'Credit TVA' : 'Neutre'}
          </Badge>
        </div>
        <div className="mt-4 rounded-2xl bg-ink-50 p-4">
          <p className="text-sm font-semibold text-ink-900">{accounting.vatCentralization.targetAccount} - {accounting.vatCentralization.targetLabel}</p>
          <p className="mt-1 text-sm text-ink-600">Montant net: {fmtCDF(accounting.vatCentralization.amount)}</p>
          <p className="mt-2 text-xs text-ink-500">{accounting.vatCentralization.explanation}</p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {accounting.vatCentralization.lines.length === 0 ? (
            <div className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">Aucune ecriture de centralisation a passer sur cette periode.</div>
          ) : accounting.vatCentralization.lines.map((line, index) => (
            <div key={line.label + index} className="rounded-xl border border-ink-100 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">{line.label}</p>
              <p className="mt-1 text-xs text-ink-500">Debit: {line.debitAccount}</p>
              <p className="text-xs text-ink-500">Credit: {line.creditAccount}</p>
              <p className="mt-2 text-sm font-semibold text-ink-900">{fmtCDF(line.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-brand-700" />
          <h2 className="font-display text-base font-bold text-ink-900">Rapprochement balance / declarations</h2>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {declarationReconciliation.map((item) => {
            const balanced = Math.abs(item.gap) <= 0.01;
            return (
              <div key={item.id} className="rounded-xl bg-ink-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{item.label}</p>
                    <p className="text-xs text-ink-500">{item.detail}</p>
                  </div>
                  <Badge tone={balanced ? 'success' : 'warning'}>{balanced ? 'Rapproche' : 'Ecart'}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-ink-500 sm:grid-cols-2">
                  <MetricInline label="Attendu" value={fmtCDF(item.expected)} />
                  <MetricInline label="Balance" value={fmtCDF(item.booked)} />
                  <MetricInline label="Declare" value={fmtCDF(item.declared)} />
                  <MetricInline label="Ecart" value={fmtCDF(item.gap)} valueClassName={balanced ? 'text-success-700' : 'text-warning-700'} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {upcoming.length > 0 && <div className="card p-5"><div className="flex items-center gap-2"><Clock size={18} className="text-warning-600" /><h2 className="font-display text-base font-bold text-ink-900">A venir</h2></div><div className="mt-3 space-y-2">{upcoming.slice(0, 4).map((declaration) => { const type = typeMeta[declaration.type]; const status = statusMeta[declaration.status]; return <div key={declaration.id} className="flex items-center justify-between rounded-xl bg-ink-50 p-3"><div className="flex items-center gap-3"><Badge tone={type.tone}>{type.label}</Badge><div><p className="text-sm font-medium text-ink-900">{declaration.period_label}</p><p className="text-xs text-ink-500">Echeance : {declaration.due_date ? fmtDate(declaration.due_date) : 'Non definie'}</p></div></div><div className="flex items-center gap-3"><span className="text-sm font-semibold text-ink-900">{fmtCDF(declaration.amount)}</span><Badge tone={status.tone}>{status.label}</Badge><button onClick={() => setViewingDeclaration(declaration)} className="btn-ghost text-xs"><Eye size={14} /> Detail</button>{declaration.status === 'ready' && <button onClick={() => submitDeclaration(declaration.id)} className="btn-ghost text-xs"><Send size={14} /> Teledeclarer</button>}</div></div>; })}</div></div>}

      <div className="card overflow-hidden"><div className="border-b border-ink-100 px-5 py-4"><h2 className="font-display text-base font-bold text-ink-900">Toutes les declarations</h2></div><div className="overflow-x-auto scrollbar-thin"><table className="w-full text-sm"><thead><tr className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500"><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Periode</th><th className="px-4 py-3 font-semibold">Echeance</th><th className="px-4 py-3 text-right font-semibold">Montant</th><th className="px-4 py-3 font-semibold">Statut</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-ink-100">{loading && Array.from({ length: 4 }).map((_, index) => <tr key={index}><td colSpan={6} className="px-4 py-3"><div className="skeleton h-10" /></td></tr>)}{!loading && declarations.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-500">Aucune declaration pour le moment. Commencez par generer la TVA, les charges sociales ou l IPR.</td></tr>}{!loading && declarations.map((declaration) => { const type = typeMeta[declaration.type]; const status = statusMeta[declaration.status]; return <tr key={declaration.id} className="hover:bg-ink-50/60 transition"><td className="px-4 py-3"><Badge tone={type.tone}>{type.label}</Badge></td><td className="px-4 py-3 font-medium text-ink-900">{declaration.period_label}</td><td className="px-4 py-3 whitespace-nowrap text-ink-600">{declaration.due_date ? fmtDate(declaration.due_date) : '-'}</td><td className="px-4 py-3 text-right font-semibold text-ink-900">{fmtCDF(declaration.amount)}</td><td className="px-4 py-3"><Badge tone={status.tone}>{declaration.status === 'submitted' && <CheckCircle2 size={12} />}{status.label}</Badge></td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button onClick={() => setViewingDeclaration(declaration)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100" title="Voir le detail"><Eye size={16} /></button>{declaration.status === 'ready' && <button onClick={() => submitDeclaration(declaration.id)} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50" title="Teledeclarer"><Send size={16} /></button>}{declaration.status === 'submitted' && <button onClick={() => markDeclarationPaid(declaration.id)} className="rounded-lg p-1.5 text-success-600 hover:bg-success-50" title="Marquer comme payee"><CheckCircle2 size={16} /></button>}<button onClick={() => exportDeclaration(declaration)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100" title="Exporter"><Download size={16} /></button><button onClick={() => removeDeclaration(declaration.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600" title="Supprimer"><Trash2 size={16} /></button></div></td></tr>; })}</tbody></table></div></div>

      <CreateDeclarationModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { reload(); setCreateOpen(false); }} />
      <DeclarationPreviewModal declaration={viewingDeclaration} onClose={() => setViewingDeclaration(null)} onExport={() => viewingDeclaration && exportDeclaration(viewingDeclaration)} onMarkPaid={() => viewingDeclaration && markDeclarationPaid(viewingDeclaration.id)} />
      <LiassePreviewModal form={viewingLiasse} onClose={() => setViewingLiasse(null)} onExport={() => viewingLiasse && exportLiasseCsv(viewingLiasse)} />
    </div>
  );
}

function MetricInline({
  label,
  value,
  valueClassName = 'text-ink-900',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return <div><p className="text-xs text-ink-500">{label}</p><p className={`mt-1 font-semibold ${valueClassName}`}>{value}</p></div>;
}
function DeclarationPreviewModal({ declaration, onClose, onExport, onMarkPaid }: { declaration: Declaration | null; onClose: () => void; onExport: () => void; onMarkPaid: () => void }) {
  if (!declaration) return null;

  const type = typeMeta[declaration.type];
  const status = statusMeta[declaration.status];

  return (
    <Modal open={!!declaration} onClose={onClose} title={`Declaration ${type?.label || declaration.type}`} size="md" footer={<><button onClick={onClose} className="btn-ghost">Fermer</button>{declaration.status === 'submitted' && <button onClick={onMarkPaid} className="btn-secondary"><CheckCircle2 size={16} /> Marquer payee</button>}<button onClick={onExport} className="btn-primary"><Download size={16} /> Exporter</button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricInline label="Type" value={type?.label || declaration.type} />
          <MetricInline label="Statut" value={status?.label || declaration.status} />
          <MetricInline label="Periode" value={declaration.period_label} />
          <MetricInline label="Montant" value={fmtCDF(Number(declaration.amount || 0))} />
          <MetricInline label="Echeance" value={declaration.due_date ? fmtDate(declaration.due_date) : '-'} />
          <MetricInline label="Soumise le" value={declaration.submitted_at ? fmtDate(declaration.submitted_at) : '-'} />
        </div>
        <div className="rounded-xl bg-ink-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">Notes</p>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-800">{declaration.notes || 'Aucune note enregistree.'}</p>
        </div>
      </div>
    </Modal>
  );
}

function LiassePreviewModal({ form, onClose, onExport }: { form: LiasseForm | null; onClose: () => void; onExport: () => void }) {
  if (!form) return null;

  return (
    <Modal open={!!form} onClose={onClose} title={form.title} size="lg" footer={<><button onClick={onClose} className="btn-ghost">Fermer</button><button onClick={onExport} className="btn-primary"><Download size={16} /> Exporter CSV</button></>}>
      <div className="space-y-4"><div className="overflow-hidden rounded-xl ring-1 ring-ink-200"><table className="w-full text-sm"><thead className="bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500"><tr><th className="px-4 py-2.5 font-semibold">Code</th><th className="px-4 py-2.5 font-semibold">Libelle</th><th className="px-4 py-2.5 text-right font-semibold">Montant</th></tr></thead><tbody className="divide-y divide-ink-100">{form.lines.map((line) => <tr key={line.code} className="hover:bg-ink-50/60"><td className="px-4 py-3 font-mono text-xs text-ink-600">{line.code}</td><td className="px-4 py-3 text-ink-900">{line.label}</td><td className="px-4 py-3 text-right font-semibold text-ink-900">{fmtCDF(line.amount)}</td></tr>)}</tbody><tfoot className="bg-brand-50"><tr><td className="px-4 py-3" colSpan={2}><span className="font-display font-bold text-brand-800">{form.type === 'liasse_2065' ? 'Impot a payer' : 'Resultat net'}</span></td><td className="px-4 py-3 text-right font-display text-lg font-extrabold text-brand-800">{fmtCDF(form.total)}</td></tr></tfoot></table></div><div className="flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-xs text-ink-500"><Eye size={14} />Apercu genere a partir des transactions categorisees de l annee {new Date().getFullYear()}.</div></div>
    </Modal>
  );
}

function CreateDeclarationModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [type, setType] = useState<DeclarationType>('tva');
  const [periodLabel, setPeriodLabel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');

  const save = async () => {
    if (!user) return;
    if (!periodLabel.trim()) {
      toast({ kind: 'error', message: 'La periode est requise.' });
      return;
    }

    try {
      await insertDeclaration({ user_id: user.id, type, period_label: periodLabel.trim(), amount: Number(amount) || 0, status: 'draft', due_date: dueDate || null });
      toast({ kind: 'success', message: 'Declaration creee.' });
      setPeriodLabel(''); setDueDate(''); setAmount(''); onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle declaration" footer={<><button onClick={onClose} className="btn-ghost">Annuler</button><button onClick={save} className="btn-primary">Creer</button></>}>
      <div className="space-y-4"><div><label className="label">Type</label><select value={type} onChange={(e) => setType(e.target.value as DeclarationType)} className="input">{Object.entries(typeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></div><div><label className="label">Periode</label><input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} className="input" placeholder="Ex : juillet 2026" /></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Echeance</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" /></div><div><label className="label">Montant</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" /></div></div></div>
    </Modal>
  );
}











