import { CheckCircle2, HelpCircle } from 'lucide-react';
import { Link } from '../../lib/router';

const plans = [
  {
    name: 'Decouverte',
    price: 0,
    currency: 'USD',
    tag: 'Pour demarrer',
    features: ['Comptabilite automatisee', 'Facturation illimitee', '1 compte bancaire', 'Categorisation par regles', 'Support e-mail'],
    cta: 'Commencer',
    highlight: false,
  },
  {
    name: 'Independant',
    price: 19,
    currency: 'USD',
    tag: 'Le plus populaire',
    features: ['Tout Decouverte, plus :', 'Declarations TVA et liasse fiscale', 'OCR illimite', 'Relances automatiques', 'Support prioritaire', 'Application mobile'],
    cta: 'Essai 14 jours',
    highlight: true,
  },
  {
    name: 'PME',
    price: 49,
    currency: 'USD',
    tag: 'Pour les equipes',
    features: ['Tout Independant, plus :', 'Multi-utilisateurs (5 sieges)', 'Multi-societes', 'Acces expert-comptable', 'API et webhooks', 'SLA 99,9%'],
    cta: 'Contacter',
    highlight: false,
  },
];

const faqs = [
  { q: 'Puis-je changer d offre ?', a: 'Oui, a tout moment depuis votre espace. Le prorata est calcule automatiquement.' },
  { q: 'Y a-t-il un engagement ?', a: 'Non. Toutes les offres sont sans engagement, resilables en un clic.' },
  { q: 'Les mises a jour sont-elles incluses ?', a: 'Oui, toutes les mises a jour reglementaires et fiscales sont incluses, sans cout supplementaire.' },
  { q: 'Que se passe-t-il a la fin de l essai ?', a: 'Vous basculez automatiquement sur l offre Decouverte gratuite. Aucune carte bancaire requise.' },
];

export function PricingPage() {
  return (
    <div className="bg-ink-50">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200">Tarifs</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-950 sm:text-5xl">
            Un prix juste, sans surprise
          </h1>
          <p className="mt-4 text-lg text-ink-600">Choisissez l offre adaptee a votre activite.</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`card relative p-6 ${plan.highlight ? 'ring-2 ring-brand-500 shadow-pop' : ''}`}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  {plan.tag}
                </span>
              )}
              <h3 className="font-display text-xl font-bold text-ink-900">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold text-ink-950">{plan.price} {plan.currency}</span>
                <span className="text-ink-500">/mois</span>
              </div>
              {!plan.highlight && <p className="mt-1 text-xs text-ink-500">{plan.tag}</p>}
              <ul className="mt-5 space-y-2.5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-ink-700">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup" className={`mt-6 w-full ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <div className="flex items-center gap-2">
            <HelpCircle size={20} className="text-brand-700" />
            <h2 className="font-display text-2xl font-bold text-ink-950">Questions frequentes</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q} className="card p-5">
                <h3 className="font-semibold text-ink-900">{faq.q}</h3>
                <p className="mt-1.5 text-sm text-ink-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
