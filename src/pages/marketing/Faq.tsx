import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from '../../lib/router';

const sections = [
  {
    title: 'Comptabilité',
    items: [
      { q: 'Tenzo remplace-il mon expert-comptable ?', a: 'Tenzo automatise la saisie, la catégorisation et la production des déclarations. Vous pouvez garder un expert-comptable pour le conseil et le contrôle : Tenzo lui donne un accès sécurisé à votre dossier.' },
      { q: 'Comment fonctionne la synchronisation bancaire ?', a: 'Via des agrégateurs agréés PSD2 (Budget Insight, Plaid). Vous vous authentifiez une fois, vos transactions remontent automatiquement de manière sécurisée.' },
      { q: 'Tenzo gère-t-il la franchise en base de TVA ?', a: 'Oui. Vous choisissez votre régime (franchise, réel simplifié, réel normal) à l\'onboarding. Le calcul de TVA s\'adapte automatiquement.' },
    ],
  },
  {
    title: 'Facturation',
    items: [
      { q: 'Les factures sont-elles conformes à la réforme 2026 ?', a: 'Oui. Tenzo génère des factures avec toutes les mentions légales obligatoires et est compatible avec la facturation électronique et les plateformes agréées.' },
      { q: 'Puis-je personnaliser mes factures ?', a: 'Oui : logo, couleurs, mentions, conditions de paiement, numérotation automatique, modèles de devis.' },
      { q: 'Les relances sont-elles automatiques ?', a: 'Oui. Vous paramétrez les rappels (avant échéance, J+3, J+10…) et Tenzo envoie les e-mails de relance automatiquement.' },
    ],
  },
  {
    title: 'Sécurité & conformité',
    items: [
      { q: 'Mes données sont-elles protégées ?', a: 'Chiffrement TLS 1.2+ en transit, AES-256 au repos, MFA obligatoire, backups chiffrés, hébergement en France.' },
      { q: 'Combien de temps mes données sont-elles conservées ?', a: 'Conformément à la loi française : 10 ans pour les factures et la comptabilité. Vous pouvez exporter ou supprimer vos données à tout moment.' },
      { q: 'Tenzo est-il conforme au RGPD ?', a: 'Oui. Registre des traitements, droits d\'accès et de rectification, consentement explicite, sous-traitance encadrée.' },
    ],
  },
];

export function FaqPage() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="bg-ink-50">
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200">FAQ</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-950 sm:text-5xl">
            Questions fréquentes
          </h1>
          <p className="mt-4 text-lg text-ink-600">Tout ce que vous devez savoir avant de vous lancer.</p>
        </div>

        <div className="mt-12 space-y-10">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="font-display text-xl font-bold text-ink-900">{s.title}</h2>
              <div className="mt-3 space-y-2">
                {s.items.map((it) => {
                  const key = `${s.title}-${it.q}`;
                  const isOpen = open === key;
                  return (
                    <div key={key} className="card overflow-hidden">
                      <button
                        onClick={() => setOpen(isOpen ? null : key)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                      >
                        <span className="font-medium text-ink-900">{it.q}</span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm leading-relaxed text-ink-600 animate-fade-in">
                          {it.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-white p-8 text-center ring-1 ring-ink-200">
          <h2 className="font-display text-xl font-bold text-ink-950">Une autre question ?</h2>
          <p className="mt-2 text-sm text-ink-600">Notre équipe répond sous 24h ouvrées.</p>
          <Link to="/signup" className="btn-primary mt-4">Démarrer gratuitement</Link>
        </div>
      </section>
    </div>
  );
}
