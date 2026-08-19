import {
  ArrowRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  FileText,
  Receipt,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { Link } from '../../lib/router';

const features = [
  { icon: Banknote, title: 'Sync bancaire automatique', text: 'Vos transactions remontent automatiquement via des agregateurs PSD2. Plus de saisie manuelle.' },
  { icon: ScanLine, title: 'OCR des justificatifs', text: 'Photographiez un recu, Tenzo extrait montant, TVA et fournisseur, puis rapproche la transaction.' },
  { icon: Receipt, title: 'Facturation conforme', text: 'Devis et factures avec mentions legales, echeances, relances automatiques et suivi des paiements.' },
  { icon: BarChart3, title: 'Declarations auto', text: 'TVA, liasse fiscale, charges sociales et declarations prepares depuis vos donnees.' },
  { icon: TrendingUp, title: 'Pilotage temps reel', text: 'Tableau de bord tresorerie, compte de resultat et bilan mis a jour a chaque transaction.' },
  { icon: ShieldCheck, title: 'Conformite et securite', text: 'Archivage, chiffrement, controle d acces et suivi de conformite pour vos donnees.' },
];

const steps = [
  { n: '01', title: 'Creez votre compte', text: 'Choisissez votre statut juridique et renseignez vos informations legales en quelques minutes.' },
  { n: '02', title: 'Connectez votre activite', text: 'Importez vos transactions et commencez a structurer votre comptabilite.' },
  { n: '03', title: 'Laissez Tenzo travailler', text: 'Categorisation, rapprochement, facturation et declarations : vous gardez le controle sans ressaisie.' },
];

const testimonials = [
  { name: 'Camille R.', role: 'Designer freelance', text: 'Je gagne plusieurs heures par semaine. Je prends une photo du recu et tout se rapproche beaucoup plus vite.', rating: 5 },
  { name: 'Mehdi B.', role: 'SASU conseil', text: 'Ma liasse est plus lisible et mon suivi devient vraiment actionnable.', rating: 5 },
  { name: 'Studio Atelier 9', role: 'Agence 4 personnes', text: 'On suit la tresorerie en temps reel et les relances clients sont plus simples a gerer.', rating: 5 },
];

const plans = [
  { name: 'Decouverte', price: '0', period: '/mois', tag: 'Pour demarrer', features: ['Comptabilite auto', 'Facturation illimitee', '1 compte bancaire', 'Support email'], cta: 'Commencer', highlight: false },
  { name: 'Independant', price: '19', period: '/mois', tag: 'Le plus populaire', features: ['Tout Decouverte, plus :', 'Declarations et rapports', 'OCR illimite', 'Relances auto', 'Support prioritaire'], cta: 'Essai 14 jours', highlight: true },
  { name: 'PME', price: '49', period: '/mois', tag: 'Pour les equipes', features: ['Tout Independant, plus :', 'Multi-utilisateurs', 'Multi-societes', 'Acces comptable', 'API et webhooks'], cta: 'Contacter', highlight: false },
];

export function HomePage() {
  return (
    <div className="bg-ink-50">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
          <div className="absolute top-32 right-0 h-72 w-72 rounded-full bg-accent-200/30 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-in">
              <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200">
                <Sparkles size={14} /> Plateforme de gestion et comptabilite
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-950 text-balance sm:text-5xl lg:text-6xl">
                La comptabilite qui se fait <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">avec vous</span>.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
                Tenzo automatise la compta, la facturation et le suivi fiscal pour vous laisser plus de temps sur l activite.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="btn-primary px-6 py-3 text-base">
                  Demarrer gratuitement <ArrowRight size={18} />
                </Link>
                <Link to="/features" className="btn-secondary px-6 py-3 text-base">
                  Voir les fonctionnalites
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-ink-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-success-600" /> Sans carte bancaire</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-success-600" /> Conforme RGPD</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-success-600" /> Parametrable RDC</span>
              </div>
            </div>

            <div className="relative animate-scale-in">
              <div className="card overflow-hidden p-0 shadow-pop">
                <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-danger-500/70" />
                    <div className="h-3 w-3 rounded-full bg-warning-500/70" />
                    <div className="h-3 w-3 rounded-full bg-success-500/70" />
                  </div>
                  <span className="ml-2 text-xs font-medium text-ink-400">app.tenzo.local/dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: 'Tresorerie', value: '24 580', trend: '+12%', tone: 'text-success-600' },
                    { label: 'CA du mois', value: '8 320', trend: '+5%', tone: 'text-success-600' },
                    { label: 'TVA due', value: '1 240', trend: 'Q1', tone: 'text-ink-500' },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
                      <p className="text-xs text-ink-500">{c.label}</p>
                      <p className="mt-1 font-display text-lg font-bold text-ink-900">{c.value}</p>
                      <p className={`text-xs font-medium ${c.tone}`}>{c.trend}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink-800">Tresorerie (6 mois)</p>
                      <span className="chip bg-success-50 text-success-700"><TrendingUp size={12} /> +18%</span>
                    </div>
                    <div className="mt-4 flex h-24 items-end gap-2">
                      {[42, 56, 48, 62, 58, 78].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand-500 to-brand-300" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-200">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Zap size={16} /></div>
                    <p className="text-sm text-brand-800"><span className="font-semibold">3 transactions</span> a categoriser | <span className="font-semibold">2 recus</span> a rapprocher</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 hidden rotate-3 rounded-xl bg-white p-3 shadow-pop ring-1 ring-ink-200 sm:block">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-100 text-accent-700"><FileText size={18} /></div>
                  <div>
                    <p className="text-xs text-ink-500">Facture #1024</p>
                    <p className="text-sm font-semibold text-ink-900">Payee | 1 200</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-ink-400">
            Ils nous font confiance
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-ink-400">
            {['Independants', 'Studio Atelier 9', 'PME locales', 'Cabinets', 'Finance ops'].map((b) => (
              <span key={b} className="font-display text-lg font-bold opacity-70">{b}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl text-balance">
            Tout ce qu il faut pour gerer votre compta
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            Un produit unique, concu pour suivre l activite, la fiscalite et la documentation comptable.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card group p-6 transition-all hover:-translate-y-0.5 hover:shadow-pop">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-200 transition group-hover:bg-brand-600 group-hover:text-white">
                <f.icon size={22} />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
              Comment ca marche
            </h2>
            <p className="mt-4 text-lg text-ink-600">Trois etapes pour reprendre la main sur votre gestion.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl bg-ink-50 p-6 ring-1 ring-ink-100">
                <span className="font-display text-5xl font-extrabold text-brand-200">{s.n}</span>
                <h3 className="mt-3 font-display text-xl font-bold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
            Ils ont arrete de perdre du temps
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="card p-6">
              <div className="flex gap-0.5 text-accent-400">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <span key={i}>*</span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-700">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                  <p className="text-xs text-ink-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
              Des tarifs transparents
            </h2>
            <p className="mt-4 text-lg text-ink-600">Sans engagement. Annulable en un clic.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={`card relative p-6 ${p.highlight ? 'ring-2 ring-brand-500 shadow-pop' : ''}`}>
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    {p.tag}
                  </span>
                )}
                <h3 className="font-display text-xl font-bold text-ink-900">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-ink-950">{p.price}</span>
                  <span className="text-ink-500">{p.period}</span>
                </div>
                {!p.highlight && <p className="mt-1 text-xs text-ink-500">{p.tag}</p>}
                <ul className="mt-5 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-ink-700">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`mt-6 w-full ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-14 text-center sm:px-12">
          <div className="absolute inset-0 -z-10 opacity-20">
            <div className="absolute -top-20 left-1/3 h-72 w-72 rounded-full bg-accent-400 blur-3xl" />
          </div>
          <Wallet className="mx-auto text-brand-200" size={40} />
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl text-balance">
            Pret a automatiser votre comptabilite ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-100">
            Rejoignez les entreprises qui veulent une gestion plus claire et plus rapide.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="btn bg-white px-6 py-3 text-base text-brand-800 hover:bg-brand-50">
              Demarrer gratuitement <ArrowRight size={18} />
            </Link>
            <Link to="/pricing" className="btn px-6 py-3 text-base text-white ring-1 ring-white/40 hover:bg-white/10">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
