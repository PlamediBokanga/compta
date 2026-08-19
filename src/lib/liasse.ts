import type { Category, DeclarationType, Profile, Transaction } from './types';

export interface LiasseLine {
  code: string;
  label: string;
  amount: number;
}

export interface LiasseForm {
  type: DeclarationType;
  title: string;
  lines: LiasseLine[];
  total: number;
}

interface FinancialOverview {
  incomeMap: Map<string, number>;
  expenseMap: Map<string, number>;
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  salesOfGoods: number;
  servicesRevenue: number;
  otherOperatingIncome: number;
  merchandisePurchases: number;
  externalServices: number;
  staffCosts: number;
  taxesAndDuties: number;
  financialCharges: number;
  financialIncome: number;
  depreciation: number;
  vatCollected: number;
  vatDeductible: number;
}

function aggregateByCategory(
  transactions: Transaction[],
  categories: Category[],
  direction: 'in' | 'out',
): Map<string, number> {
  const map = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.direction !== direction) continue;
    const category = categories.find((item) => item.id === transaction.category_id);
    const label = category?.label || 'Non categorise';
    map.set(label, (map.get(label) || 0) + Number(transaction.amount || 0));
  }
  return map;
}

function sumByKeywords(map: Map<string, number>, keywords: string[]): number {
  let sum = 0;
  for (const [label, amount] of map) {
    const normalizedLabel = label.toLowerCase();
    if (keywords.some((keyword) => normalizedLabel.includes(keyword.toLowerCase()))) {
      sum += amount;
    }
  }
  return sum;
}

function buildFinancialOverview(transactions: Transaction[], categories: Category[]): FinancialOverview {
  const currentYear = new Date().getFullYear();
  const yearTransactions = transactions.filter((transaction) => transaction.date.startsWith(String(currentYear)));

  const incomeMap = aggregateByCategory(yearTransactions, categories, 'in');
  const expenseMap = aggregateByCategory(yearTransactions, categories, 'out');

  const totalIncome = Array.from(incomeMap.values()).reduce((sum, amount) => sum + amount, 0);
  const totalExpenses = Array.from(expenseMap.values()).reduce((sum, amount) => sum + amount, 0);
  const netResult = totalIncome - totalExpenses;

  let vatCollected = 0;
  let vatDeductible = 0;
  for (const transaction of yearTransactions) {
    if (transaction.direction === 'in') vatCollected += Number(transaction.vat_amount || 0);
    if (transaction.direction === 'out') vatDeductible += Number(transaction.vat_amount || 0);
  }

  return {
    incomeMap,
    expenseMap,
    totalIncome,
    totalExpenses,
    netResult,
    salesOfGoods: sumByKeywords(incomeMap, ['vente', 'biens', 'marchandise']),
    servicesRevenue: sumByKeywords(incomeMap, ['prestation', 'service', 'honoraire', 'mission']),
    otherOperatingIncome: sumByKeywords(incomeMap, ['autre', 'produit', 'subvention']),
    merchandisePurchases: sumByKeywords(expenseMap, ['achat', 'marchandise', 'stock']),
    externalServices: sumByKeywords(expenseMap, ['honoraire', 'loyer', 'logiciel', 'abonnement', 'telecommunication', 'transport', 'repas', 'fourniture', 'assurance']),
    staffCosts: sumByKeywords(expenseMap, ['salaire', 'cotisation', 'cnss', 'inpp', 'onem', 'personnel', 'paie']),
    taxesAndDuties: sumByKeywords(expenseMap, ['impot', 'taxe', 'ipr', 'iere', 'ibp', 'patente', 'tva', 'dgi']),
    financialCharges: sumByKeywords(expenseMap, ['banque', 'agios', 'frais bancaire', 'interet', 'financier']),
    financialIncome: sumByKeywords(incomeMap, ['interet', 'financier']),
    depreciation: sumByKeywords(expenseMap, ['amortissement', 'provision']),
    vatCollected,
    vatDeductible,
  };
}

export function generateLiasse(
  type: DeclarationType,
  transactions: Transaction[],
  categories: Category[],
  profile: Profile | null,
): LiasseForm {
  const overview = buildFinancialOverview(transactions, categories);

  if (type === 'liasse_2035') {
    return generateOhadaStatements(overview, profile);
  }
  if (type === 'liasse_2033') {
    return generateCpccTaxSummary(overview, profile);
  }
  if (type === 'liasse_2065') {
    return generateBenefitTaxComputation(overview, profile);
  }

  return { type, title: 'Declaration', lines: [], total: 0 };
}

function generateOhadaStatements(overview: FinancialOverview, profile: Profile | null): LiasseForm {
  const operatingMargin =
    overview.totalIncome -
    overview.merchandisePurchases -
    overview.externalServices -
    overview.staffCosts -
    overview.taxesAndDuties;

  const financialResult = overview.financialIncome - overview.financialCharges;
  const resultBeforeTax = operatingMargin + financialResult - overview.depreciation;

  const lines: LiasseLine[] = [
    { code: 'OHADA-A1', label: 'Ventes de biens', amount: overview.salesOfGoods },
    { code: 'OHADA-A2', label: 'Prestations de services', amount: overview.servicesRevenue },
    { code: 'OHADA-A3', label: 'Autres produits operationnels', amount: Math.max(0, overview.totalIncome - overview.salesOfGoods - overview.servicesRevenue) },
    { code: 'OHADA-A4', label: 'Total produits des activites ordinaires', amount: overview.totalIncome },
    { code: 'OHADA-B1', label: 'Achats consommes', amount: overview.merchandisePurchases },
    { code: 'OHADA-B2', label: 'Services exterieurs', amount: overview.externalServices },
    { code: 'OHADA-B3', label: 'Charges de personnel et cotisations sociales', amount: overview.staffCosts },
    { code: 'OHADA-B4', label: 'Impots et taxes', amount: overview.taxesAndDuties },
    { code: 'OHADA-B5', label: 'Dotations et provisions estimees', amount: overview.depreciation },
    { code: 'OHADA-B6', label: 'Resultat d exploitation', amount: operatingMargin - overview.depreciation },
    { code: 'OHADA-C1', label: 'Produits financiers', amount: overview.financialIncome },
    { code: 'OHADA-C2', label: 'Charges financieres', amount: overview.financialCharges },
    { code: 'OHADA-C3', label: 'Resultat avant impot', amount: resultBeforeTax },
    { code: 'OHADA-D1', label: 'TVA collectee suivie', amount: overview.vatCollected },
    { code: 'OHADA-D2', label: 'TVA deductible suivie', amount: overview.vatDeductible },
    { code: 'OHADA-D3', label: 'TVA nette a declarer', amount: overview.vatCollected - overview.vatDeductible },
  ];

  if (profile?.legal_status === 'asbl') {
    lines.push({ code: 'OHADA-E1', label: 'Observation statut', amount: 0 });
  }

  return {
    type: 'liasse_2035',
    title: `Annexes OHADA / SYSCOHADA ${new Date().getFullYear()}`,
    lines,
    total: resultBeforeTax,
  };
}

function generateCpccTaxSummary(overview: FinancialOverview, _profile: Profile | null): LiasseForm {
  const grossMargin = overview.totalIncome - overview.merchandisePurchases;
  const valueAdded = grossMargin - overview.externalServices;
  const operatingSurplus = valueAdded - overview.staffCosts - overview.taxesAndDuties;
  const currentResult = operatingSurplus + overview.financialIncome - overview.financialCharges - overview.depreciation;
  const estimatedIbp = Math.max(0, currentResult * 0.3);

  const lines: LiasseLine[] = [
    { code: 'CPCC-01', label: 'Chiffre d affaires et produits assimiles', amount: overview.totalIncome },
    { code: 'CPCC-02', label: 'Consommations de marchandises', amount: overview.merchandisePurchases },
    { code: 'CPCC-03', label: 'Marge brute', amount: grossMargin },
    { code: 'CPCC-04', label: 'Services exterieurs', amount: overview.externalServices },
    { code: 'CPCC-05', label: 'Valeur ajoutee', amount: valueAdded },
    { code: 'CPCC-06', label: 'Charges de personnel', amount: overview.staffCosts },
    { code: 'CPCC-07', label: 'Impots, droits et taxes', amount: overview.taxesAndDuties },
    { code: 'CPCC-08', label: 'Excendent brut d exploitation estime', amount: operatingSurplus },
    { code: 'CPCC-09', label: 'Dotations et provisions', amount: overview.depreciation },
    { code: 'CPCC-10', label: 'Resultat courant avant impot', amount: currentResult },
    { code: 'CPCC-11', label: 'IBP estime a 30%', amount: estimatedIbp },
  ];

  return {
    type: 'liasse_2033',
    title: `Synthese CPCC et resultat fiscal ${new Date().getFullYear()}`,
    lines,
    total: estimatedIbp,
  };
}

function generateBenefitTaxComputation(overview: FinancialOverview, profile: Profile | null): LiasseForm {
  const accountingResult = overview.netResult;
  const nonDeductibleCharges = overview.taxesAndDuties > 0 ? overview.taxesAndDuties * 0.15 : 0;
  const taxableResult = Math.max(0, accountingResult + nonDeductibleCharges);
  const ibpRate = profile?.legal_status === 'asbl' ? 0 : 30;
  const ibpAmount = Math.max(0, taxableResult * (ibpRate / 100));

  const lines: LiasseLine[] = [
    { code: 'IBP-01', label: 'Resultat comptable avant impot', amount: accountingResult },
    { code: 'IBP-02', label: 'Reintegrations fiscales estimees', amount: nonDeductibleCharges },
    { code: 'IBP-03', label: 'Resultat fiscal imposable', amount: taxableResult },
    { code: 'IBP-04', label: `Taux IBP applique (${ibpRate}%)`, amount: ibpRate },
    { code: 'IBP-05', label: 'Impot sur les benefices estime', amount: ibpAmount },
    { code: 'IBP-06', label: 'Resultat net apres impot estime', amount: accountingResult - ibpAmount },
  ];

  return {
    type: 'liasse_2065',
    title: `Calcul de l impot sur les benefices ${new Date().getFullYear()}`,
    lines,
    total: ibpAmount,
  };
}

export function generateLiasseCSV(form: LiasseForm): string {
  const header = 'Code,Libelle,Montant';
  const rows = form.lines.map((line) => `${line.code},"${line.label.replace(/"/g, '""')}",${line.amount.toFixed(2)}`);
  return [header, ...rows].join('\n');
}
