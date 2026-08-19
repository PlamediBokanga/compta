import { useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Receipt,
  Sparkles,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { insertNotification, updateTask } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { computeStats, effectiveInvoiceStatus } from '../../lib/analytics';
import { fmtDate, fmtCDF, fmtCDFShort } from '../../lib/format';
import { useDeclarations, useInvoices, useTasks, useTransactions } from '../../lib/hooks';
import { Link } from '../../lib/router';
import { computeRdcComplianceOverview } from '../../lib/rdc';
import { supabase } from '../../lib/supabase';

const taskKindIcon = {
  categorize: TrendingDown,
  attach_receipt: Receipt,
  declare: Calendar,
  remind: FileText,
  review: Sparkles,
} as const;

export function DashboardPage() {
  const { profile, user } = useAuth();
  const { items: transactions, loading: txLoading } = useTransactions();
  const { items: invoices } = useInvoices();
  const { items: tasks, reload: reloadTasks } = useTasks();
  const { items: declarations } = useDeclarations();

  const stats = useMemo(() => computeStats(transactions, invoices), [transactions, invoices]);
  const complianceOverview = useMemo(() => computeRdcComplianceOverview(profile, invoices, declarations, transactions), [profile, invoices, declarations, transactions]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const overdueInvoices = invoices.filter((invoice) => !invoice.is_quote && effectiveInvoiceStatus(invoice) === 'overdue');
      for (const invoice of overdueInvoices.slice(0, 3)) {
        const { data: existing } = await supabase.from('notifications').select('id').eq('user_id', user.id).ilike('title', `%${invoice.number}%`).maybeSingle();
        if (!existing) {
          await insertNotification({
            user_id: user.id,
            type: 'danger',
            title: `Facture en retard : ${invoice.number}`,
            message: `${invoice.customer_name} - ${fmtCDF(Number(invoice.total))} - Echeance ${fmtDate(invoice.due_date)}`,
            link: '/app/invoices',
          });
        }
      }

      const dueDeclarations = declarations.filter((declaration) => declaration.status === 'ready' || declaration.status === 'draft');
      for (const declaration of dueDeclarations.slice(0, 3)) {
        const { data: existing } = await supabase.from('notifications').select('id').eq('user_id', user.id).ilike('title', `%${declaration.period_label}%`).maybeSingle();
        if (!existing) {
          await insertNotification({
            user_id: user.id,
            type: 'warning',
            title: `Declaration a venir : ${declaration.period_label}`,
            message: `Echeance : ${declaration.due_date ? fmtDate(declaration.due_date) : 'non definie'} - ${fmtCDF(Number(declaration.amount))}`,
            link: '/app/declarations',
          });
        }
      }
    })();
  }, [user, invoices, declarations]);

  const openTasks = tasks.filter((task) => !task.done).slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);
  const recentTransactions = transactions.slice(0, 6);
  const overdueInvoices = invoices.filter((invoice) => !invoice.is_quote && effectiveInvoiceStatus(invoice) === 'overdue');
  const draftInvoices = invoices.filter((invoice) => !invoice.is_quote && effectiveInvoiceStatus(invoice) === 'draft');
  const unpaidInvoices = invoices.filter((invoice) => !invoice.is_quote && ['sent', 'overdue'].includes(effectiveInvoiceStatus(invoice)));
  const currentFlowSteps = [
    {
      id: 'invoice',
      title: '1. Facturer',
      detail: draftInvoices.length > 0 ? `${draftInvoices.length} brouillon(s) a envoyer` : invoices.length > 0 ? 'Vos factures sont deja lancees' : 'Creez votre premiere facture',
      tone: draftInvoices.length > 0 ? 'warning' : invoices.length > 0 ? 'success' : 'neutral',
      cta: draftInvoices.length > 0 ? 'Finaliser les factures' : 'Aller aux factures',
      link: '/app/invoices',
    },
    {
      id: 'cash',
      title: '2. Encaisser et suivre',
      detail: overdueInvoices.length > 0 ? `${overdueInvoices.length} facture(s) en retard` : unpaidInvoices.length > 0 ? `${unpaidInvoices.length} facture(s) a suivre` : 'Aucun retard de paiement detecte',
      tone: overdueInvoices.length > 0 ? 'danger' : unpaidInvoices.length > 0 ? 'warning' : 'success',
      cta: 'Suivre les paiements',
      link: '/app/invoices',
    },
    {
      id: 'book',
      title: '3. Comptabiliser',
      detail: complianceOverview.uncategorizedTransactions > 0 ? `${complianceOverview.uncategorizedTransactions} operation(s) non categorisee(s)` : 'Balance exploitable pour la cloture',
      tone: complianceOverview.uncategorizedTransactions > 0 ? 'warning' : 'success',
      cta: 'Verifier la comptabilite',
      link: '/app/reports',
    },
    {
      id: 'declare',
      title: '4. Declarer',
      detail: complianceOverview.pendingDeclarations > 0 ? `${complianceOverview.pendingDeclarations} declaration(s) a traiter` : 'Declarations a jour',
      tone: complianceOverview.pendingDeclarations > 0 ? 'warning' : 'success',
      cta: 'Ouvrir les declarations',
      link: '/app/declarations',
    },
  ];
  const maxSeries = Math.max(1, ...stats.monthSeries.flatMap((month) => [month.in, month.out]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Bonjour</h1>
        <p className="mt-1 text-sm text-ink-500">Voici un apercu de votre activite{profile?.company_name ? ` - ${profile.company_name}` : ''}.</p>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Parcours principal</h2>
            <p className="mt-1 text-xs text-ink-500">Comme un Indy congolais: peu d ecrans, un ordre simple, et les obligations RDC au bon moment.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/app/invoices" className="btn-primary"><FileText size={16} /> Nouvelle facture</Link>
            <Link to="/app/declarations" className="btn-secondary"><Calendar size={16} /> Mes declarations</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          {currentFlowSteps.map((step) => <div key={step.id} className="rounded-2xl border border-ink-100 bg-ink-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink-900">{step.title}</p><p className="mt-2 text-xs text-ink-500">{step.detail}</p></div><Badge tone={step.tone === 'danger' ? 'danger' : step.tone === 'warning' ? 'warning' : step.tone === 'success' ? 'success' : 'neutral'}>{step.tone === 'danger' ? 'Urgent' : step.tone === 'warning' ? 'A suivre' : step.tone === 'success' ? 'OK' : 'A lancer'}</Badge></div><Link to={step.link} className="mt-4 inline-flex text-sm font-medium text-brand-700 hover:text-brand-800">{step.cta}</Link></div>)}
        </div>
        <div className="mt-4 rounded-2xl border border-ink-100 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
            <span className="font-semibold text-ink-900">Acces rapides :</span>
            <Link to="/app/customers" className="rounded-full bg-ink-100 px-3 py-1 text-ink-700 hover:bg-ink-200">Clients</Link>
            <Link to="/app/catalog" className="rounded-full bg-ink-100 px-3 py-1 text-ink-700 hover:bg-ink-200">Articles et services</Link>
            <Link to="/app/documents" className="rounded-full bg-ink-100 px-3 py-1 text-ink-700 hover:bg-ink-200">Justificatifs</Link>
            <Link to="/app/categories" className="rounded-full bg-ink-100 px-3 py-1 text-ink-700 hover:bg-ink-200">Categories</Link>
            <Link to="/app/social" className="rounded-full bg-ink-100 px-3 py-1 text-ink-700 hover:bg-ink-200">Social</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Wallet} tone="brand" label="Tresorerie nette" value={fmtCDF(stats.net)} hint={`Encaisse ${fmtCDFShort(stats.cashIn)} - Decaisse ${fmtCDFShort(stats.cashOut)}`} />
        <KpiCard icon={ArrowUpRight} tone="success" label="Encaissements" value={fmtCDF(stats.cashIn)} hint="Total cumule" />
        <KpiCard icon={ArrowDownRight} tone="danger" label="Decaissements" value={fmtCDF(stats.cashOut)} hint="Total cumule" />
        <KpiCard icon={Receipt} tone="accent" label="TVA nette" value={fmtCDF(stats.vatDue)} hint={`Collectee ${fmtCDFShort(stats.vatCollected)} - Deductible ${fmtCDFShort(stats.vatDeductible)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">Centre de conformite RDC</h2>
              <p className="text-xs text-ink-500">Facture DGI, fiscalite RDC et preparation SYSCOHADA / CPCC.</p>
            </div>
            <Badge tone={complianceOverview.score >= 80 ? 'success' : complianceOverview.score >= 60 ? 'warning' : 'danger'}>Score {complianceOverview.score}%</Badge>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Champs societe manquants</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-950">{complianceOverview.missingProfileFields.length}</p></div>
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Declarations a traiter</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-950">{complianceOverview.pendingDeclarations}</p></div>
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Operations non categorisees</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-950">{complianceOverview.uncategorizedTransactions}</p></div>
            <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Factures normalisees</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-950">{complianceOverview.normalizedInvoices}</p></div>
          </div>
          <div className="mt-5 space-y-2">
            {complianceOverview.recommendations.length === 0 && <div className="rounded-xl bg-success-50 p-4 text-sm text-success-700">Les prerequis prioritaires sont en bon etat pour le pilote.</div>}
            {complianceOverview.recommendations.map((recommendation) => <div key={recommendation} className="rounded-xl bg-ink-50 p-3 text-sm text-ink-700">{recommendation}</div>)}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-bold text-ink-900">Controle facture DGI</h2>
          <div className="mt-4 space-y-2">
            {complianceOverview.latestInvoice ? complianceOverview.invoiceCompliance.checks.map((check) => <div key={check.label} className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-sm"><span className="text-ink-700">{check.label}</span><Badge tone={check.ok ? 'success' : 'warning'}>{check.ok ? 'OK' : 'a completer'}</Badge></div>) : <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">Creez une premiere facture pour lancer le controle de conformite DGI.</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">Tresorerie (6 mois)</h2>
              <p className="text-xs text-ink-500">Encaissements vs decaissements</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Entrees</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ink-300" /> Sorties</span>
            </div>
          </div>
          <div className="mt-6 flex h-48 items-end gap-3">
            {stats.monthSeries.map((month, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div className="w-1/2 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all" style={{ height: `${Math.max(2, (month.in / maxSeries) * 100)}%` }} title={`Entrees: ${fmtCDF(month.in)}`} />
                  <div className="w-1/2 rounded-t-md bg-ink-300 transition-all" style={{ height: `${Math.max(2, (month.out / maxSeries) * 100)}%` }} title={`Sorties: ${fmtCDF(month.out)}`} />
                </div>
                <span className="text-xs text-ink-500">{month.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink-900">A faire</h2>
            <Badge tone={openTasks.length ? 'warning' : 'success'}>{openTasks.length} en attente</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {openTasks.length === 0 && <div className="rounded-xl bg-ink-50 p-6 text-center text-sm text-ink-500"><CheckCircle2 size={28} className="mx-auto text-success-500" /><p className="mt-2">Tout est a jour.</p></div>}
            {openTasks.map((task) => {
              const Icon = taskKindIcon[task.kind] || Circle;
              return (
                <div key={task.id} className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-ink-100 transition hover:bg-ink-50">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon size={16} /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-900">{task.title}</p>
                    {task.description && <p className="text-xs text-ink-500">{task.description}</p>}
                    {task.due_date && <p className="mt-1 text-xs text-ink-400">Echeance : {fmtDate(task.due_date)}</p>}
                  </div>
                  <button onClick={async () => { await updateTask(task.id, { done: true }); reloadTasks(); }} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-success-600" title="Marquer comme fait"><Circle size={16} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-900">Transactions recentes</h2><Link to="/app/transactions" className="text-sm font-medium text-brand-700 hover:text-brand-800">Tout voir</Link></div>
          <div className="mt-4 divide-y divide-ink-100">
            {txLoading && <div className="space-y-2 py-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-12" />)}</div>}
            {!txLoading && recentTransactions.length === 0 && <p className="py-6 text-center text-sm text-ink-500">Aucune transaction. <Link to="/app/transactions" className="font-medium text-brand-700">Importer</Link></p>}
            {recentTransactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><div className={`grid h-9 w-9 place-items-center rounded-lg ${transaction.direction === 'in' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'}`}>{transaction.direction === 'in' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</div><div><p className="text-sm font-medium text-ink-900">{transaction.label}</p><p className="text-xs text-ink-500">{fmtDate(transaction.date)} - {transaction.category?.label || 'Non categorise'}</p></div></div><span className={`text-sm font-semibold ${transaction.direction === 'in' ? 'text-success-700' : 'text-ink-800'}`}>{transaction.direction === 'in' ? '+' : '-'}{fmtCDF(transaction.amount)}</span></div>)}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-ink-900">Factures recentes</h2><Link to="/app/invoices" className="text-sm font-medium text-brand-700 hover:text-brand-800">Tout voir</Link></div>
          <div className="mt-4 divide-y divide-ink-100">
            {recentInvoices.length === 0 && <p className="py-6 text-center text-sm text-ink-500">Aucune facture. <Link to="/app/invoices" className="font-medium text-brand-700">Creer une facture</Link></p>}
            {recentInvoices.map((invoice) => {
              const status = effectiveInvoiceStatus(invoice);
              const tone = status === 'paid' ? 'success' : status === 'overdue' ? 'danger' : status === 'sent' ? 'brand' : 'neutral';
              const label = status === 'paid' ? 'Payee' : status === 'overdue' ? 'En retard' : status === 'sent' ? 'Envoyee' : status === 'draft' ? 'Brouillon' : 'Annulee';
              return <div key={invoice.id} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-50 text-accent-700"><FileText size={16} /></div><div><p className="text-sm font-medium text-ink-900">{invoice.customer_name}</p><p className="text-xs text-ink-500">{invoice.number || '-'} - {fmtDate(invoice.issue_date)}</p></div></div><div className="flex items-center gap-3"><Badge tone={tone}>{label}</Badge><span className="text-sm font-semibold text-ink-800">{fmtCDF(invoice.total)}</span></div></div>;
            })}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-ink-900">Repartition des depenses</h2>
        {stats.topExpenseCategories.length === 0 ? <p className="mt-4 py-6 text-center text-sm text-ink-500">Pas encore de depenses enregistrees.</p> : <div className="mt-5 space-y-3">{stats.topExpenseCategories.map((category) => { const pct = Math.round((category.amount / stats.cashOut) * 100); return <div key={category.label}><div className="flex items-center justify-between text-sm"><span className="font-medium text-ink-700">{category.label}</span><span className="text-ink-500">{fmtCDF(category.amount)} - {pct}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${Math.max(3, pct)}%` }} /></div></div>; })}</div>}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, tone, label, value, hint }: { icon: LucideIcon; tone: 'brand' | 'success' | 'danger' | 'accent'; label: string; value: string; hint: string }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    success: 'bg-success-50 text-success-700 ring-success-500/30',
    danger: 'bg-danger-50 text-danger-700 ring-danger-500/30',
    accent: 'bg-accent-50 text-accent-700 ring-accent-200',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between"><span className="text-sm text-ink-500">{label}</span><div className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${tones[tone]}`}><Icon size={18} /></div></div>
      <p className="mt-3 font-display text-2xl font-extrabold text-ink-950">{value}</p>
      <p className="mt-1 text-xs text-ink-500">{hint}</p>
    </div>
  );
}


