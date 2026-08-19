import type { Category, Transaction } from './types';

const normalize = (s: string) =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

interface Heuristic {
  keywords: string[];
  categoryMatcher: (c: Category) => boolean;
}

const expenseHeuristics: Heuristic[] = [
  {
    keywords: ['salaire', 'remuneration', 'paie', 'bulletin de paie', 'net imposable'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('salaire') || c.label.toLowerCase().includes('cotisation'),
  },
  {
    keywords: ['cnss', 'inpp', 'onem', 'cotisation sociale', 'prelevement social', 'charge sociale'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('cotisation') || c.label.toLowerCase().includes('social'),
  },
  {
    keywords: ['loyer', 'wework', 'coworking', 'bail commercial', 'quittance', 'regie'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('loyer'),
  },
  {
    keywords: ['assurance', 'mutuelle', 'prevoyance', 'hiscox', 'axa', 'generali', 'allianz', 'maaf', 'macif'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('assurance'),
  },
  {
    keywords: ['frais bancaire', 'commission', 'agios', 'rawbank', 'equity', 'bcdc', 'banque', 'tenue de compte'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('banque') || c.label.toLowerCase().includes('frais'),
  },
  {
    keywords: ['repas', 'restaurant', 'dejeuner', 'diner', 'brasserie', 'bistrot', 'traiteur'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('repas') || c.label.toLowerCase().includes('restaur'),
  },
  {
    keywords: ['transport', 'train', 'avion', 'taxi', 'uber', 'parking', 'peage', 'autoroute'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('transport') || c.label.toLowerCase().includes('deplacement'),
  },
  {
    keywords: ['carburant', 'essence', 'diesel', 'total', 'shell', 'bp ', 'elf'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('carburant') || c.label.toLowerCase().includes('essence'),
  },
  {
    keywords: ['logiciel', 'saas', 'abonnement', 'subscription', 'adobe', 'microsoft', 'google', 'notion', 'slack', 'figma', 'github', 'vercel', 'aws', 'ovh'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('logiciel') || c.label.toLowerCase().includes('abonnement') || c.label.toLowerCase().includes('saa'),
  },
  {
    keywords: ['telecom', 'internet', 'forfait', 'airtel', 'orange', 'vodacom', 'africell', 'fibre'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('telecom') || c.label.toLowerCase().includes('internet') || c.label.toLowerCase().includes('telephone'),
  },
  {
    keywords: ['fourniture', 'bureau', 'papeterie', 'stylo', 'classeur', 'ramette', 'office depot'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('fourniture') || c.label.toLowerCase().includes('bureau'),
  },
  {
    keywords: ['materiel', 'ordinateur', 'macbook', 'dell', 'hp ', 'lenovo', 'equipement', 'apple', 'acer', 'asus', 'imprimante', 'ecran', 'souris', 'clavier'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('materiel') || c.label.toLowerCase().includes('equipement'),
  },
  {
    keywords: ['avocat', 'expert', 'comptable', 'consultant', 'honoraire', 'prestation externe', 'sous-traitance', 'freelance'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('honoraire') || c.label.toLowerCase().includes('externe') || c.label.toLowerCase().includes('expert') || c.label.toLowerCase().includes('consult'),
  },
  {
    keywords: ['impot', 'taxe', 'tva', 'ipr', 'iere', 'ibp', 'patente', 'fiscal', 'dgi'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('impot') || c.label.toLowerCase().includes('taxe'),
  },
  {
    keywords: ['achat', 'marchandise', 'stock', 'fournisseur', 'grossiste'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('achat') || c.label.toLowerCase().includes('marchandise'),
  },
];

const incomeHeuristics: Heuristic[] = [
  {
    keywords: ['stripe', 'paiement', 'payment', 'encaissement', 'virement client', 'reglement client'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('prestation') || c.label.toLowerCase().includes('vente'),
  },
  {
    keywords: ['vente', 'recette', 'facture client', 'encaisse', 'reglement'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('vente') || c.label.toLowerCase().includes('recette'),
  },
  {
    keywords: ['honoraires', 'mission', 'prestation', 'facturation'],
    categoryMatcher: (c) => c.label.toLowerCase().includes('prestation') || c.label.toLowerCase().includes('honoraire'),
  },
];

export function suggestCategory(
  tx: Pick<Transaction, 'label' | 'direction' | 'amount'>,
  categories: Category[],
): { category: Category | null; state: 'auto' | 'suggested' | 'uncategorized' } {
  const label = normalize(tx.label);
  const matchingKind = tx.direction === 'in' ? 'income' : 'expense';
  const relevant = categories.filter((c) => c.kind === matchingKind);

  for (const cat of relevant) {
    if (!cat.keywords?.length) continue;
    for (const kw of cat.keywords) {
      if (kw && label.includes(normalize(kw))) {
        return { category: cat, state: 'auto' };
      }
    }
  }

  const heuristics = matchingKind === 'expense' ? expenseHeuristics : incomeHeuristics;
  for (const rule of heuristics) {
    if (rule.keywords.some((kw) => label.includes(normalize(kw)))) {
      const cat = relevant.find(rule.categoryMatcher);
      if (cat) return { category: cat, state: 'suggested' };
    }
  }

  return { category: null, state: 'uncategorized' };
}

export function computeVat(amount: number, vatRate: number): number {
  if (!vatRate) return 0;
  return Number(((amount * vatRate) / 100).toFixed(2));
}
