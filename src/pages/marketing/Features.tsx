import {
  Banknote,
  BarChart3,
  FileText,
  Receipt,
  ScanLine,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from '../../lib/router';

const groups = [
  {
    title: 'Comptabilite automatisee',
    icon: Zap,
    items: [
      { icon: Banknote, title: 'Synchronisation bancaire', text: 'Transactions remontees automatiquement depuis vos flux et rapprochees plus vite.' },
      { icon: ScanLine, title: 'OCR des justificatifs', text: 'Extraction du montant, de la TVA et du fournisseur avec aide au rapprochement.' },
      { icon: BarChart3, title: 'Categorisation intelligente', text: 'Regles et suggestions pour accelerer la tenue comptable.' },
      { icon: Receipt, title: 'Calcul TVA auto', text: 'Suivi de la TVA collectee et deductible a partir des operations saisies.' },
    ],
  },
  {
    title: 'Facturation et devis',
    icon: FileText,
    items: [
      { icon: FileText, title: 'Factures et devis personnalises', text: 'Identite entreprise, echeances, mentions legales et suivi de paiement.' },
      { icon: Receipt, title: 'Facture standard puis normalisation', text: 'La facture peut etre preparee puis normalisee lorsque le connecteur DGI sera branche.' },
      { icon: Zap, title: 'Relances automatiques', text: 'Rappels par e-mail avant et apres echeance avec suivi des paiements.' },
    ],
  },
  {
    title: 'Declarations et rapports',
    icon: BarChart3,
    items: [
      { icon: BarChart3, title: 'Declarations preparees', text: 'TVA, IPR, charges sociales, synthese CPCC et resultats fiscaux.' },
      { icon: FileText, title: 'Exports comptables', text: 'Journal, grand livre, balance et syntheses pour le suivi comptable.' },
      { icon: BarChart3, title: 'Pilotage temps reel', text: 'Bilan, compte de resultat, tresorerie et lecture fiscale actualises en continu.' },
    ],
  },
  {
    title: 'Securite et conformite',
    icon: ShieldCheck,
    items: [
      { icon: ShieldCheck, title: 'Archivage et tracabilite', text: 'Conservation documentaire, journalisation des actions et suivi de conformite.' },
      { icon: Users, title: 'Multi-utilisateurs et roles', text: 'Client, comptable, administrateur et acces adaptes selon le profil.' },
      { icon: ShieldCheck, title: 'Protection des donnees', text: 'Chiffrement, controle des acces et sauvegardes pour vos informations sensibles.' },
    ],
  },
];

export function FeaturesPage() {
  return (
    <div className="bg-ink-50">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200">Fonctionnalites</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-950 sm:text-5xl text-balance">
            Une plateforme complete, pas un empilement d outils
          </h1>
          <p className="mt-4 text-lg text-ink-600">
            Comptabilite, facturation, suivi fiscal et documents de gestion sont regroupes au meme endroit.
          </p>
        </div>

        <div className="mt-16 space-y-16">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
                  <g.icon size={20} />
                </div>
                <h2 className="font-display text-2xl font-bold text-ink-950">{g.title}</h2>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((it) => (
                  <div key={it.title} className="card p-5">
                    <it.icon className="text-brand-700" size={22} />
                    <h3 className="mt-3 font-semibold text-ink-900">{it.title}</h3>
                    <p className="mt-1.5 text-sm text-ink-600">{it.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl bg-white p-8 text-center ring-1 ring-ink-200">
          <h2 className="font-display text-2xl font-bold text-ink-950">Pret a essayer ?</h2>
          <p className="mt-2 text-ink-600">Sans carte bancaire. Annulable a tout moment.</p>
          <Link to="/signup" className="btn-primary mt-5">Demarrer gratuitement</Link>
        </div>
      </section>
    </div>
  );
}
