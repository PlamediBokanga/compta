import type { LegalStatus } from './types';

export interface LegalStatusDefinition {
  value: LegalStatus;
  label: string;
  shortLabel: string;
  family: 'entreprise_individuelle' | 'societe_commerciale' | 'groupement' | 'association';
  associatesLabel: string;
  liabilityLabel: string;
  profitPurpose: 'lucratif' | 'non_lucratif' | 'cooperation';
  accountingBasis: string;
  taxOrientation: string;
  requiresRccm: boolean;
  supportsShares: boolean;
  notes: string[];
}

export const LEGAL_STATUS_DEFINITIONS: LegalStatusDefinition[] = [
  {
    value: 'entreprise_individuelle',
    label: 'Entreprise Individuelle / Etablissement',
    shortLabel: 'Entreprise Individuelle',
    family: 'entreprise_individuelle',
    associatesLabel: '1 personne physique',
    liabilityLabel: 'Responsabilite personnelle de l entrepreneur',
    profitPurpose: 'lucratif',
    accountingBasis: 'Tenue comptable simplifiee a structurer selon SYSCOHADA si activite organisee',
    taxOrientation: 'Fiscalite rattachee directement a l entrepreneur',
    requiresRccm: true,
    supportsShares: false,
    notes: [
      'Aucune separation juridique entre l entrepreneur et l activite.',
      'Convient aux petits commerces et activites individuelles.',
    ],
  },
  {
    value: 'sarl',
    label: 'SARL',
    shortLabel: 'SARL',
    family: 'societe_commerciale',
    associatesLabel: '1 ou plusieurs associes',
    liabilityLabel: 'Limitee aux apports',
    profitPurpose: 'lucratif',
    accountingBasis: 'Comptabilite commerciale complete SYSCOHADA',
    taxOrientation: 'Societe commerciale orientee impots sur les benefices',
    requiresRccm: true,
    supportsShares: false,
    notes: [
      'Forme la plus frequente pour les PME.',
      'Protection du patrimoine personnel sous reserve des garanties donnees.',
    ],
  },
  {
    value: 'eurl',
    label: 'EURL',
    shortLabel: 'EURL',
    family: 'societe_commerciale',
    associatesLabel: 'Associe unique',
    liabilityLabel: 'Limitee aux apports',
    profitPurpose: 'lucratif',
    accountingBasis: 'Comptabilite commerciale complete SYSCOHADA',
    taxOrientation: 'Variante unipersonnelle de la SARL',
    requiresRccm: true,
    supportsShares: false,
    notes: [
      'Equivalent pratique d une SARL a associe unique.',
      'Utile pour distinguer les structures a un seul proprietaire.',
    ],
  },
  {
    value: 'sa',
    label: 'SA',
    shortLabel: 'SA',
    family: 'societe_commerciale',
    associatesLabel: 'Plusieurs actionnaires',
    liabilityLabel: 'Limitee aux apports',
    profitPurpose: 'lucratif',
    accountingBasis: 'Comptabilite commerciale complete SYSCOHADA avec gouvernance formelle',
    taxOrientation: 'Structure adaptee aux capitaux importants et a une gouvernance lourde',
    requiresRccm: true,
    supportsShares: true,
    notes: [
      'Adaptee aux entreprises importantes.',
      'Fonctionne avec conseil d administration ou organisation equivalente selon les statuts.',
    ],
  },
  {
    value: 'sas',
    label: 'SAS',
    shortLabel: 'SAS',
    family: 'societe_commerciale',
    associatesLabel: '1 ou plusieurs associes',
    liabilityLabel: 'Limitee aux apports',
    profitPurpose: 'lucratif',
    accountingBasis: 'Comptabilite commerciale complete SYSCOHADA',
    taxOrientation: 'Grande souplesse statutaire et organisationnelle',
    requiresRccm: true,
    supportsShares: true,
    notes: [
      'Forme souple pour organiser la gouvernance.',
      'Permet d adapter facilement les pouvoirs dans les statuts.',
    ],
  },
  {
    value: 'sasu',
    label: 'SASU',
    shortLabel: 'SASU',
    family: 'societe_commerciale',
    associatesLabel: 'Associe unique',
    liabilityLabel: 'Limitee aux apports',
    profitPurpose: 'lucratif',
    accountingBasis: 'Comptabilite commerciale complete SYSCOHADA',
    taxOrientation: 'Variante unipersonnelle de la SAS',
    requiresRccm: true,
    supportsShares: true,
    notes: [
      'Permet d avoir la souplesse SAS avec un seul associe.',
      'Pratique pour les structures unipersonnelles evolutives.',
    ],
  },
  {
    value: 'snc',
    label: 'SNC',
    shortLabel: 'SNC',
    family: 'societe_commerciale',
    associatesLabel: 'Plusieurs associes commercants',
    liabilityLabel: 'Indefinie et solidaire',
    profitPurpose: 'lucratif',
    accountingBasis: 'Comptabilite commerciale complete SYSCOHADA',
    taxOrientation: 'Risque juridique plus eleve pour les associes',
    requiresRccm: true,
    supportsShares: false,
    notes: [
      'Tous les associes ont la qualite de commercant.',
      'Chaque associe repond des dettes sociales.',
    ],
  },
  {
    value: 'scs',
    label: 'SCS',
    shortLabel: 'SCS',
    family: 'societe_commerciale',
    associatesLabel: 'Commandites et commanditaires',
    liabilityLabel: 'Mixte : indefinie pour commandites, limitee pour commanditaires',
    profitPurpose: 'lucratif',
    accountingBasis: 'Comptabilite commerciale complete SYSCOHADA',
    taxOrientation: 'Structure mixte avec categories d associes distinctes',
    requiresRccm: true,
    supportsShares: false,
    notes: [
      'Distingue les associes gestionnaires et les associes investisseurs.',
      'Les responsabilites varient selon la categorie d associe.',
    ],
  },
  {
    value: 'gie',
    label: 'GIE',
    shortLabel: 'GIE',
    family: 'groupement',
    associatesLabel: 'Plusieurs entreprises ou personnes morales',
    liabilityLabel: 'Selon l acte constitutif et les engagements du groupement',
    profitPurpose: 'cooperation',
    accountingBasis: 'Comptabilite de groupement a articuler avec les membres',
    taxOrientation: 'Outil de mise en commun plutot que vehicule d exploitation autonome classique',
    requiresRccm: true,
    supportsShares: false,
    notes: [
      'Permet de mutualiser des moyens sans fusion des membres.',
      'A utiliser pour la cooperation economique entre structures.',
    ],
  },
  {
    value: 'asbl',
    label: 'ASBL',
    shortLabel: 'ASBL',
    family: 'association',
    associatesLabel: 'Membres fondateurs selon les statuts',
    liabilityLabel: 'Selon les textes et les statuts de l association',
    profitPurpose: 'non_lucratif',
    accountingBasis: 'Comptabilite de transparence et de suivi des ressources',
    taxOrientation: 'Regime a analyser selon l activite et l absence de partage des benefices',
    requiresRccm: false,
    supportsShares: false,
    notes: [
      'Adaptee aux activites sociales, culturelles ou humanitaires.',
      'Les benefices ne sont pas partages entre les membres.',
    ],
  },
];

export function getLegalStatusDefinition(status: LegalStatus | null | undefined) {
  return LEGAL_STATUS_DEFINITIONS.find((item) => item.value === status) || null;
}

export function getLegalStatusLabel(status: LegalStatus | null | undefined) {
  return getLegalStatusDefinition(status)?.shortLabel || 'A configurer';
}
