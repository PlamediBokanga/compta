import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Inbox,
  Ticket,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useAccessControl } from '../../lib/access';
import { useInvoices, useTasks, useTransactions } from '../../lib/hooks';
import { updateTask } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { fmtDate, fmtCDF, fmtPct } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { AccessDenied } from '../../components/ui/AccessDenied';
import { effectiveInvoiceStatus } from '../../lib/analytics';
import type { AccountingDocument } from '../../lib/types';

export function AdminPage() {
  const { user } = useAuth();
  const access = useAccessControl();
  const { items: transactions } = useTransactions();
  const { items: invoices } = useInvoices();
  const { items: tasks, reload: reloadTasks } = useTasks();
  const [documents, setDocuments] = useState<AccountingDocument[]>([]);

  useEffect(() => {
    if (!access.canAccessAdmin) {
      setDocuments([]);
      return;
    }

    (async () => {
      const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
      setDocuments((data as AccountingDocument[]) ?? []);
    })();
  }, [access.canAccessAdmin]);

  const metrics = useMemo(() => {
    const categorized = transactions.filter((transaction) => transaction.category_id).length;
    const autoCategorized = transactions.filter((transaction) => transaction.categorization_state === 'auto').length;
    const automationRate = transactions.length > 0 ? (categorized / transactions.length) * 100 : 0;
    const autoRate = transactions.length > 0 ? (autoCategorized / transactions.length) * 100 : 0;
    const matchedDocs = documents.filter((document) => document.status === 'matched').length;
    const pendingDocs = documents.filter((document) => document.status === 'pending' || document.status === 'ocr_done').length;
    const docAutomation = documents.length > 0 ? (matchedDocs / documents.length) * 100 : 0;
    const openTasks = tasks.filter((task) => !task.done).length;
    const doneTasks = tasks.filter((task) => task.done).length;
    const taskCompletion = tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0;
    const paidInvoices = invoices.filter((invoice) => effectiveInvoiceStatus(invoice) === 'paid').length;
    const overdueInvoices = invoices.filter((invoice) => effectiveInvoiceStatus(invoice) === 'overdue').length;
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);

    return {
      automationRate,
      autoRate,
      matchedDocs,
      pendingDocs,
      docAutomation,
      openTasks,
      doneTasks,
      taskCompletion,
      paidInvoices,
      overdueInvoices,
      totalInvoiced,
      txTotal: transactions.length,
      docTotal: documents.length,
    };
  }, [transactions, documents, tasks, invoices]);

  const docQueue = useMemo(
    () => documents.filter((document) => document.status === 'pending' || document.status === 'ocr_done').slice(0, 8),
    [documents],
  );

  const exceptionQueue = useMemo(
    () => transactions.filter((transaction) => !transaction.category_id).slice(0, 8),
    [transactions],
  );

  if (access.loading) {
    return <div className="card p-6 text-sm text-ink-500">Verification des autorisations...</div>;
  }

  if (!access.canAccessAdmin) {
    return (
      <AccessDenied
        title="Accès restreint"
        message="Le back-office est réservé au propriétaire du compte et aux experts-comptables invités."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Back-office</h1>
        <p className="mt-1 text-sm text-ink-500">
          Pilotage opérationnel de votre activité : automatisation, file de traitement et exceptions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Bot} tone="brand" label="Taux d automatisation" value={fmtPct(metrics.automationRate)} hint={`${fmtPct(metrics.autoRate)} auto | ${metrics.txTotal} transactions`} />
        <KpiCard icon={FileText} tone="accent" label="Justificatifs rapproches" value={`${metrics.matchedDocs}/${metrics.docTotal}`} hint={`${metrics.pendingDocs} en file | ${fmtPct(metrics.docAutomation)} auto`} />
        <KpiCard icon={CheckCircle2} tone="success" label="Taches completees" value={`${metrics.doneTasks}/${metrics.doneTasks + metrics.openTasks}`} hint={`${metrics.openTasks} en attente | ${fmtPct(metrics.taskCompletion)}`} />
        <KpiCard icon={TrendingUp} tone="brand" label="CA facture" value={fmtCDF(metrics.totalInvoiced)} hint={`${metrics.paidInvoices} payees | ${metrics.overdueInvoices} en retard`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox size={18} className="text-brand-700" />
              <h2 className="font-display text-lg font-bold text-ink-900">File de traitement OCR</h2>
            </div>
            <Badge tone={metrics.pendingDocs > 0 ? 'warning' : 'success'}>{metrics.pendingDocs} en attente</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {docQueue.length === 0 && (
              <div className="rounded-xl bg-ink-50 p-6 text-center text-sm text-ink-500">
                <CheckCircle2 size={24} className="mx-auto text-success-500" />
                <p className="mt-2">File vide : tous les documents sont traites.</p>
              </div>
            )}
            {docQueue.map((document) => (
              <div key={document.id} className="flex items-center justify-between rounded-xl p-3 ring-1 ring-ink-100">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-ink-600"><FileText size={16} /></div>
                  <div>
                    <p className="max-w-[200px] truncate text-sm font-medium text-ink-900">{document.file_name}</p>
                    <p className="text-xs text-ink-500">{fmtDate(document.created_at)}</p>
                  </div>
                </div>
                <Badge tone={document.status === 'ocr_done' ? 'brand' : 'warning'}>
                  {document.status === 'ocr_done' ? <><Zap size={12} /> OCR OK</> : <><Clock size={12} /> En attente</>}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning-600" />
              <h2 className="font-display text-lg font-bold text-ink-900">Exceptions a categoriser</h2>
            </div>
            <Badge tone={exceptionQueue.length > 0 ? 'danger' : 'success'}>{exceptionQueue.length} a traiter</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {exceptionQueue.length === 0 && (
              <div className="rounded-xl bg-ink-50 p-6 text-center text-sm text-ink-500">
                <CheckCircle2 size={24} className="mx-auto text-success-500" />
                <p className="mt-2">Aucune exception : tout est categorise.</p>
              </div>
            )}
            {exceptionQueue.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between rounded-xl p-3 ring-1 ring-ink-100">
                <div>
                  <p className="max-w-[220px] truncate text-sm font-medium text-ink-900">{transaction.label}</p>
                  <p className="text-xs text-ink-500">{fmtDate(transaction.date)}</p>
                </div>
                <span className="text-sm font-semibold text-ink-900">{fmtCDF(Number(transaction.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Gauge size={18} className="text-brand-700" />
          <h2 className="font-display text-lg font-bold text-ink-900">Taches comptables</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">A faire</p><p className="mt-1 font-display text-2xl font-extrabold text-warning-700">{metrics.openTasks}</p></div>
          <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Terminees</p><p className="mt-1 font-display text-2xl font-extrabold text-success-700">{metrics.doneTasks}</p></div>
          <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-500">Taux de completion</p><p className="mt-1 font-display text-2xl font-extrabold text-brand-700">{fmtPct(metrics.taskCompletion)}</p></div>
        </div>
        <div className="mt-4 space-y-2">
          {tasks.filter((task) => !task.done).slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-xl p-3 ring-1 ring-ink-100">
              <div>
                <p className="text-sm font-medium text-ink-900">{task.title}</p>
                {task.due_date && <p className="text-xs text-ink-500">Echeance : {fmtDate(task.due_date)}</p>}
              </div>
              <button onClick={async () => { await updateTask(task.id, { done: true }); reloadTasks(); }} className="btn-ghost text-xs">
                <CheckCircle2 size={14} /> Marquer fait
              </button>
            </div>
          ))}
          {tasks.filter((task) => !task.done).length === 0 && <p className="py-4 text-center text-sm text-ink-500">Toutes les taches sont completees.</p>}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2">
          <Ticket size={18} className="text-brand-700" />
          <h2 className="font-display text-lg font-bold text-ink-900">Support</h2>
        </div>
        <p className="mt-1 text-xs text-ink-500">Contactez l'équipe ou consultez la base de connaissances.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a href="mailto:support@tenzo.fr" className="flex items-center gap-3 rounded-xl bg-ink-50 p-4 transition hover:bg-ink-100">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-100 text-brand-700"><Inbox size={18} /></div>
            <div><p className="text-sm font-semibold text-ink-900">support@tenzo.fr</p><p className="text-xs text-ink-500">Réponse sous 24h ouvrées</p></div>
          </a>
          <a href="#/faq" className="flex items-center gap-3 rounded-xl bg-ink-50 p-4 transition hover:bg-ink-100">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-100 text-accent-700"><Activity size={18} /></div>
            <div><p className="text-sm font-semibold text-ink-900">Centre d aide</p><p className="text-xs text-ink-500">FAQ, guides, tutoriels</p></div>
          </a>
        </div>
      </div>

      <p className="text-xs text-ink-400">{user?.email && `Session : ${user.email}`} | Back-office operationnel</p>
    </div>
  );
}

function KpiCard({ icon: Icon, tone, label, value, hint }: { icon: any; tone: 'brand' | 'success' | 'danger' | 'accent'; label: string; value: string; hint: string; }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    success: 'bg-success-50 text-success-700 ring-success-500/30',
    danger: 'bg-danger-50 text-danger-700 ring-danger-500/30',
    accent: 'bg-accent-50 text-accent-700 ring-accent-200',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-500">{label}</span>
        <div className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${tones[tone]}`}><Icon size={18} /></div>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold text-ink-950">{value}</p>
      <p className="mt-1 text-xs text-ink-500">{hint}</p>
    </div>
  );
}





