import type { Category, Transaction } from './types';

export interface AccountEntry {
  date: string;
  label: string;
  debit: number;
  credit: number;
  categoryLabel: string;
  categoryKind: string;
  accountNumber: string;
  accountName: string;
  journalCode: string;
  journalLabel: string;
  syscohadaClass: string;
}

export interface AccountBalance {
  categoryLabel: string;
  categoryKind: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  solde: number;
  count: number;
}

export interface ProfitAndLoss {
  income: { label: string; amount: number }[];
  expenses: { label: string; amount: number }[];
  operatingIncome: number;
  operatingExpenses: number;
  financialIncome: number;
  financialExpenses: number;
  taxAndSocialExpenses: number;
  personnelExpenses: number;
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
}

export interface BalanceSheet {
  assets: { label: string; amount: number }[];
  liabilities: { label: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
}

export interface JournalSummary {
  code: string;
  label: string;
  lines: number;
  debit: number;
  credit: number;
}

export interface AccountClassSummary {
  classCode: string;
  label: string;
  debit: number;
  credit: number;
  solde: number;
  accountsCount: number;
}

export interface DueBalanceDetail {
  bucket: 'payroll' | 'social' | 'tax' | 'vat_credit' | 'vat_payable';
  bucketLabel: string;
  accountNumber: string;
  accountName: string;
  amount: number;
}

export interface LiabilityBreakdownLine {
  family: '42' | '43' | '44';
  familyLabel: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  status: 'debit' | 'credit' | 'settled';
}
export interface ClosingCheck {
  id: string;
  label: string;
  status: 'ok' | 'warning';
  detail: string;
}

export interface RecommendedEntry {
  id: string;
  label: string;
  journalCode: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  rationale: string;
}

export interface PreClosingAction {
  id: string;
  label: string;
  priority: 'high' | 'medium';
  timing: string;
  amount: number;
  detail: string;
  debitAccount: string;
  creditAccount: string;
}

export interface CutoffSignal {
  id: string;
  family: 'fnp' | 'cap' | 'fae' | 'social_fiscal';
  label: string;
  amount: number;
  priority: 'high' | 'medium';
  detail: string;
  debitAccount: string;
  creditAccount: string;
}

export interface ComplianceSignal {
  id: string;
  severity: 'warning' | 'info';
  label: string;
  detail: string;
  count: number;
}

export interface ClosingCycleReview {
  id: string;
  label: string;
  status: 'ok' | 'warning';
  amount: number;
  count: number;
  detail: string;
  checkpoints: string[];
  focusAccounts: string[];
}

export interface YearEndAdjustment {
  id: string;
  family: 'amortization' | 'provision' | 'risk_charge' | 'inventory_depreciation' | 'cca' | 'pca';
  label: string;
  amount: number;
  basisCount: number;
  priority: 'high' | 'medium';
  detail: string;
  debitAccount: string;
  creditAccount: string;
}

export interface OpenItem {
  id: string;
  side: 'client' | 'supplier';
  accountNumber: string;
  accountName: string;
  reference: string;
  oldestDate: string;
  newestDate: string;
  grossAmount: number;
  settledAmount: number;
  residualAmount: number;
  count: number;
  ageDays: number;
  status: 'recent' | 'attention' | 'overdue';
  matchingStatus: 'open' | 'partial' | 'closed';
}

export interface AccountingControls {
  treasury: number;
  receivables: number;
  payables: number;
  payrollDebt: number;
  socialDebt: number;
  taxDebt: number;
  vatCollected: number;
  vatDeductible: number;
  vatPayable: number;
  vatCredit: number;
  netResult: number;
  uncategorizedTransactions: number;
  imbalance: number;
}

export interface AccountingReport {
  entries: AccountEntry[];
  balances: AccountBalance[];
  pnl: ProfitAndLoss;
  balanceSheet: BalanceSheet;
  journals: JournalSummary[];
  classSummaries: AccountClassSummary[];
  dueDetails: DueBalanceDetail[];
  liabilityBreakdown: LiabilityBreakdownLine[];
  openItems: OpenItem[];
  controls: AccountingControls;
  alerts: string[];
  closingChecks: ClosingCheck[];
  recommendedEntries: RecommendedEntry[];
  preClosingActions: PreClosingAction[];
  cutoffSignals: CutoffSignal[];
  journalSignals: ComplianceSignal[];
  vatSignals: ComplianceSignal[];
  cycleReviews: ClosingCycleReview[];
  yearEndAdjustments: YearEndAdjustment[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    income: number;
    expenses: number;
    vatCollected: number;
    vatDeductible: number;
  };
}

function getSyscohadaClassLabel(classCode: string) {
  const labels: Record<string, string> = {
    '1': 'Capitaux et ressources stables',
    '2': 'Actif immobilise',
    '3': 'Stocks et en-cours',
    '4': 'Tiers',
    '5': 'Tresorerie',
    '6': 'Charges',
    '7': 'Produits',
    '8': 'Comptes speciaux',
  };
  return labels[classCode] || `Classe ${classCode}`;
}

interface AccountDefinition {
  accountNumber: string;
  accountName: string;
  syscohadaClass: string;
  categoryKind: string;
}

type LiabilityNature = 'supplier' | 'payroll' | 'social' | 'tax';

function normalizeLabel(label: string) {
  return (label || '').toLowerCase();
}

function buildSearchText(categoryLabel: string, transactionLabel: string, bankLabel?: string | null) {
  return `${normalizeLabel(categoryLabel)} ${normalizeLabel(transactionLabel)} ${normalizeLabel(bankLabel || '')}`.trim();
}

function matches(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function differenceInDays(from: string, to: Date) {
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((to.getTime() - start.getTime()) / 86400000));
}

function buildReference(label: string) {
  return (label || 'Sans reference').replace(/\s+/g, ' ').trim();
}

function buildMatchingKey(label: string) {
  return normalizeLabel(label)
    .replace(/paiement|reglement|reversement|virement|versement|facture|invoice|client|fournisseur/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'sans-reference';
}

function getTransactionRaw(transaction: Transaction) {
  return transaction.raw && typeof transaction.raw === 'object' ? transaction.raw as Record<string, unknown> : null;
}

function getTransactionRawString(transaction: Transaction, key: string) {
  const raw = getTransactionRaw(transaction);
  const value = raw?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isInvoicePaymentTransaction(transaction: Transaction) {
  return getTransactionRawString(transaction, 'accounting_event') === 'invoice_payment';
}

function isCreditNoteTransaction(transaction: Transaction) {
  return getTransactionRawString(transaction, 'accounting_event') === 'credit_note_issue';
}

function isCreditNoteRefundTransaction(transaction: Transaction) {
  return getTransactionRawString(transaction, 'accounting_event') === 'credit_note_refund';
}

function getTransactionReference(transaction: Transaction) {
  return getTransactionRawString(transaction, 'source_invoice_number') || getTransactionRawString(transaction, 'invoice_number') || buildReference(transaction.label);
}

function getTransactionMatchingKey(transaction: Transaction) {
  return normalizeLabel(getTransactionRawString(transaction, 'source_invoice_number') || getTransactionRawString(transaction, 'invoice_number') || '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || buildMatchingKey(transaction.label);
}

function getTreasuryAccount(transaction: Transaction): AccountDefinition {
  const label = normalizeLabel(transaction.bank_account_label || transaction.label);

  if (matches(label, ['caisse', 'cash', 'especes'])) {
    return { accountNumber: '571100', accountName: 'Caisse siege', syscohadaClass: '57', categoryKind: 'treasury' };
  }
  if (matches(label, ['mobile money', 'mpesa', 'm-pesa', 'orange money', 'airtel money'])) {
    return { accountNumber: '521300', accountName: 'Portefeuille mobile', syscohadaClass: '52', categoryKind: 'treasury' };
  }
  if (matches(label, ['usd', 'dollar'])) {
    return { accountNumber: '521200', accountName: 'Banque en devises', syscohadaClass: '52', categoryKind: 'treasury' };
  }

  return { accountNumber: '521100', accountName: 'Banques locales', syscohadaClass: '52', categoryKind: 'treasury' };
}

function resolveOperationalAccount(transaction: Transaction, categoryLabel: string): AccountDefinition {
  const text = buildSearchText(categoryLabel, transaction.label, transaction.bank_account_label);

  if (transaction.direction === 'in') {
    if (matches(text, ['service', 'prestation', 'conseil', 'honoraire', 'abonnement'])) {
      return { accountNumber: '706100', accountName: 'Prestations de services', syscohadaClass: '70', categoryKind: 'income' };
    }
    if (matches(text, ['vente', 'marchandise', 'produit', 'boutique', 'stock'])) {
      return { accountNumber: '707100', accountName: 'Ventes de marchandises', syscohadaClass: '70', categoryKind: 'income' };
    }
    if (matches(text, ['interet', 'gain de change', 'placement', 'escompte obtenu'])) {
      return { accountNumber: '778100', accountName: 'Produits financiers', syscohadaClass: '77', categoryKind: 'income' };
    }
    return { accountNumber: '707900', accountName: 'Autres produits d exploitation', syscohadaClass: '70', categoryKind: 'income' };
  }

  if (matches(text, ['achat', 'marchandise', 'stock', 'matiere premiere', 'matiere'])) {
    return { accountNumber: '601100', accountName: 'Achats de marchandises', syscohadaClass: '60', categoryKind: 'expense' };
  }
  if (matches(text, ['fourniture', 'bureau', 'consommable', 'impression'])) {
    return { accountNumber: '605100', accountName: 'Autres achats', syscohadaClass: '60', categoryKind: 'expense' };
  }
  if (matches(text, ['internet', 'telephone', 'orange', 'airtel', 'vodacom', 'communication'])) {
    return { accountNumber: '626100', accountName: 'Frais de telecommunications', syscohadaClass: '62', categoryKind: 'expense' };
  }
  if (matches(text, ['transport', 'carburant', 'mission', 'deplacement', 'uber', 'voyage'])) {
    return { accountNumber: '624100', accountName: 'Transports et deplacements', syscohadaClass: '62', categoryKind: 'expense' };
  }
  if (matches(text, ['loyer', 'location', 'coworking', 'bail'])) {
    return { accountNumber: '622200', accountName: 'Locations', syscohadaClass: '62', categoryKind: 'expense' };
  }
  if (matches(text, ['eau', 'electricite', 'energie', 'snel', 'regideso'])) {
    return { accountNumber: '627100', accountName: 'Services exterieurs lies aux utilites', syscohadaClass: '62', categoryKind: 'expense' };
  }
  if (matches(text, ['salaire', 'personnel', 'prime', 'paie', 'remuneration'])) {
    return { accountNumber: '661100', accountName: 'Remunerations du personnel', syscohadaClass: '66', categoryKind: 'expense' };
  }
  if (matches(text, ['cnss', 'inpp', 'onem', 'cotisation sociale', 'charge sociale'])) {
    return { accountNumber: '664100', accountName: 'Charges sociales patronales', syscohadaClass: '66', categoryKind: 'expense' };
  }
  if (matches(text, ['ipr', 'ibp', 'iere', 'dgi', 'impot', 'taxe', 'patente', 'redevance'])) {
    return { accountNumber: '646000', accountName: 'Impots et taxes', syscohadaClass: '64', categoryKind: 'expense' };
  }
  if (matches(text, ['banque', 'bancaire', 'commission', 'agios', 'frais bancaires'])) {
    return { accountNumber: '671100', accountName: 'Frais financiers', syscohadaClass: '67', categoryKind: 'expense' };
  }
  if (matches(text, ['amortissement', 'depreciation'])) {
    return { accountNumber: '681100', accountName: 'Dotations aux amortissements', syscohadaClass: '68', categoryKind: 'expense' };
  }

  return { accountNumber: '625800', accountName: 'Autres charges externes', syscohadaClass: '62', categoryKind: 'expense' };
}

function getPayableAccount(text: string): AccountDefinition {
  if (matches(text, ['salaire', 'personnel', 'prime', 'paie', 'remuneration'])) {
    return { accountNumber: '422100', accountName: 'Personnel - Remunerations dues', syscohadaClass: '42', categoryKind: 'liability' };
  }
  if (matches(text, ['cnss'])) {
    return { accountNumber: '431100', accountName: 'CNSS a payer', syscohadaClass: '43', categoryKind: 'liability' };
  }
  if (matches(text, ['inpp'])) {
    return { accountNumber: '431200', accountName: 'INPP a payer', syscohadaClass: '43', categoryKind: 'liability' };
  }
  if (matches(text, ['onem'])) {
    return { accountNumber: '431300', accountName: 'ONEM a payer', syscohadaClass: '43', categoryKind: 'liability' };
  }
  if (matches(text, ['ipr'])) {
    return { accountNumber: '442100', accountName: 'IPR a reverser', syscohadaClass: '44', categoryKind: 'liability' };
  }
  if (matches(text, ['ibp'])) {
    return { accountNumber: '442200', accountName: 'IBP a payer', syscohadaClass: '44', categoryKind: 'liability' };
  }
  if (matches(text, ['iere'])) {
    return { accountNumber: '442300', accountName: 'IERE a payer', syscohadaClass: '44', categoryKind: 'liability' };
  }
  if (matches(text, ['impot', 'taxe', 'patente', 'redevance', 'dgi'])) {
    return { accountNumber: '442800', accountName: 'Autres impots et taxes a payer', syscohadaClass: '44', categoryKind: 'liability' };
  }

  return { accountNumber: '401100', accountName: 'Fournisseurs', syscohadaClass: '40', categoryKind: 'liability' };
}

function getLiabilityNature(account: AccountDefinition): LiabilityNature {
  if (account.accountNumber.startsWith('422')) return 'payroll';
  if (account.accountNumber.startsWith('43')) return 'social';
  if (account.accountNumber.startsWith('44')) return 'tax';
  return 'supplier';
}

function isExplicitSettlement(text: string) {
  return matches(text, ['paiement', 'reglement', 'versement', 'virement', 'reversement']);
}

function getSettlementAccount(transaction: Transaction, categoryLabel: string): AccountDefinition {
  if (transaction.reconciliated) {
    return getTreasuryAccount(transaction);
  }

  if (transaction.direction === 'in') {
    return { accountNumber: '411100', accountName: 'Clients', syscohadaClass: '41', categoryKind: 'asset' };
  }

  return getPayableAccount(buildSearchText(categoryLabel, transaction.label, transaction.bank_account_label));
}

function getJournalMeta(transaction: Transaction, categoryLabel: string, settlementAccount: AccountDefinition) {
  const text = buildSearchText(categoryLabel, transaction.label, transaction.bank_account_label);

  if (isInvoicePaymentTransaction(transaction) || isCreditNoteRefundTransaction(transaction)) {
    if (settlementAccount.accountNumber.startsWith('57')) {
      return { code: 'CA', label: 'Journal de caisse' };
    }
    return { code: 'BQ', label: 'Journal de banque' };
  }
  if (transaction.direction === 'in') {
    return { code: 'VE', label: 'Journal des ventes' };
  }
  if (settlementAccount.accountNumber.startsWith('57')) {
    return { code: 'CA', label: 'Journal de caisse' };
  }
  if (transaction.reconciliated) {
    return { code: 'BQ', label: 'Journal de banque' };
  }
  if (matches(text, ['salaire', 'personnel', 'prime', 'paie', 'remuneration', 'cnss', 'inpp', 'onem', 'ipr', 'ibp', 'iere', 'impot', 'taxe', 'dgi'])) {
    return { code: 'OD', label: 'Operations diverses' };
  }
  return { code: 'AC', label: 'Journal des achats' };
}

function buildEntry(transaction: Transaction, categoryLabel: string, journalCode: string, journalLabel: string, account: AccountDefinition, debit: number, credit: number): AccountEntry {
  return {
    date: transaction.date,
    label: transaction.label,
    debit,
    credit,
    categoryLabel,
    categoryKind: account.categoryKind,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    journalCode,
    journalLabel,
    syscohadaClass: account.syscohadaClass,
  };
}

function pushBalance(balanceMap: Map<string, AccountBalance>, entry: AccountEntry) {
  const key = entry.accountNumber;
  const current = balanceMap.get(key) || { categoryLabel: entry.categoryLabel, categoryKind: entry.categoryKind, accountNumber: entry.accountNumber, accountName: entry.accountName, debit: 0, credit: 0, solde: 0, count: 0 };
  current.debit += entry.debit;
  current.credit += entry.credit;
  current.solde = current.debit - current.credit;
  current.count += 1;
  balanceMap.set(key, current);
}

function pushJournal(journalMap: Map<string, JournalSummary>, entry: AccountEntry) {
  const key = entry.journalCode;
  const current = journalMap.get(key) || { code: entry.journalCode, label: entry.journalLabel, lines: 0, debit: 0, credit: 0 };
  current.lines += 1;
  current.debit += entry.debit;
  current.credit += entry.credit;
  journalMap.set(key, current);
}

function sumBalance(balances: AccountBalance[], prefixes: string[], side: 'debit' | 'credit' | 'solde') {
  return balances.filter((balance) => prefixes.some((prefix) => balance.accountNumber.startsWith(prefix))).reduce((sum, balance) => sum + balance[side], 0);
}

function buildClosingChecks(controls: AccountingControls): ClosingCheck[] {
  return [
    { id: 'balance-equilibre', label: 'Equilibre debit / credit', status: controls.imbalance <= 0.01 ? 'ok' : 'warning', detail: controls.imbalance <= 0.01 ? 'La balance est equilibree.' : `Un ecart de ${controls.imbalance.toFixed(2)} subsiste dans la balance.` },
    { id: 'categorisation', label: 'Categorisation des operations', status: controls.uncategorizedTransactions === 0 ? 'ok' : 'warning', detail: controls.uncategorizedTransactions === 0 ? 'Toutes les operations sont categories.' : `${controls.uncategorizedTransactions} operation(s) restent a classer.` },
    { id: 'clients', label: 'Suivi des creances clients', status: controls.receivables <= 0 ? 'ok' : 'warning', detail: controls.receivables <= 0 ? 'Aucune creance client ouverte.' : `Des creances clients de ${controls.receivables.toFixed(2)} restent a lettrer.` },
    { id: 'fournisseurs', label: 'Suivi des dettes fournisseurs', status: controls.payables <= 0 ? 'ok' : 'warning', detail: controls.payables <= 0 ? 'Aucune dette fournisseur ouverte.' : `Des dettes fournisseurs de ${controls.payables.toFixed(2)} restent a rapprocher.` },
    { id: 'social-fiscal', label: 'Dettes sociales et fiscales', status: controls.socialDebt + controls.taxDebt + controls.payrollDebt <= 0 ? 'ok' : 'warning', detail: controls.socialDebt + controls.taxDebt + controls.payrollDebt <= 0 ? 'Aucune dette sociale, fiscale ou salariale ouverte.' : `Dettes ouvertes: personnel ${controls.payrollDebt.toFixed(2)}, social ${controls.socialDebt.toFixed(2)}, fiscal ${controls.taxDebt.toFixed(2)}.` },
  ];
}

function buildJournalSignals(transactions: Transaction[], categories: Category[]): ComplianceSignal[] {
  const salesWithoutInvoiceRef = transactions.filter((transaction) => {
    if (transaction.direction !== 'in' || isInvoicePaymentTransaction(transaction)) return false;
    const reference = getTransactionRawString(transaction, 'invoice_number') || getTransactionRawString(transaction, 'source_invoice_number');
    return !reference;
  }).length;

  const reconciledSupplierExpenses = transactions.filter((transaction) => {
    if (transaction.direction !== 'out' || !transaction.reconciliated) return false;
    const category = categories.find((item) => item.id === transaction.category_id);
    const categoryLabel = category?.label || 'Non categorise';
    const payableAccount = getPayableAccount(buildSearchText(categoryLabel, transaction.label, transaction.bank_account_label));
    return payableAccount.accountNumber.startsWith('401');
  }).length;

  const manualTreasuryOperations = transactions.filter((transaction) => {
    if (!transaction.reconciliated || transaction.direction !== 'out') return false;
    const category = categories.find((item) => item.id === transaction.category_id);
    const categoryLabel = category?.label || 'Non categorise';
    const text = buildSearchText(categoryLabel, transaction.label, transaction.bank_account_label);
    return isExplicitSettlement(text);
  }).length;

  return [
    salesWithoutInvoiceRef > 0 ? {
      id: 'journal-sales-reference',
      severity: 'warning',
      label: 'Ventes sans reference facture',
      detail: 'Certaines recettes ne portent pas de numero de facture ou de piece source, ce qui affaiblit la piste d audit et la preparation a la facture normalisee.',
      count: salesWithoutInvoiceRef,
    } : null,
    reconciledSupplierExpenses > 0 ? {
      id: 'journal-supplier-cash',
      severity: 'info',
      label: 'Achats regles immediatement',
      detail: 'Des charges fournisseurs sont payees directement en tresorerie. Verifier la piece justificative, le journal utilise et le rattachement correct du fournisseur.',
      count: reconciledSupplierExpenses,
    } : null,
    manualTreasuryOperations > 0 ? {
      id: 'journal-manual-treasury',
      severity: 'info',
      label: 'Reglements manuels detectes',
      detail: 'Des libelles ressemblent a des paiements ou reversements. Un rapprochement avec le journal de banque ou de caisse est conseille avant cloture.',
      count: manualTreasuryOperations,
    } : null,
  ].filter((signal): signal is ComplianceSignal => Boolean(signal));
}

function buildVatSignals(transactions: Transaction[], categories: Category[]): ComplianceSignal[] {
  let taxableSalesWithoutVat = 0;
  let deductiblePurchasesWithoutVat = 0;
  let suspiciousVatAmounts = 0;

  for (const transaction of transactions) {
    const category = categories.find((item) => item.id === transaction.category_id);
    const categoryVatRate = Number(category?.vat_rate || 0);
    const vatAmount = Number(transaction.vat_amount || 0);
    const amount = Number(transaction.amount || 0);
    const isCommercialSale = transaction.direction === 'in' && !isInvoicePaymentTransaction(transaction);
    const isCommercialPurchase = transaction.direction === 'out' && !isCreditNoteTransaction(transaction) && !isCreditNoteRefundTransaction(transaction);

    if (amount > 0 && vatAmount - amount > 0.01) suspiciousVatAmounts += 1;
    if (categoryVatRate > 0 && vatAmount <= 0.01 && isCommercialSale) taxableSalesWithoutVat += 1;
    if (categoryVatRate > 0 && vatAmount <= 0.01 && isCommercialPurchase) deductiblePurchasesWithoutVat += 1;
  }

  return [
    taxableSalesWithoutVat > 0 ? {
      id: 'vat-sales-missing',
      severity: 'warning',
      label: 'TVA absente sur des ventes taxables',
      detail: 'Des ventes rattachees a des categories taxables ne comportent pas de TVA. Verifier les lignes de facture, le calcul HT/TTC et la declaration DGI.',
      count: taxableSalesWithoutVat,
    } : null,
    deductiblePurchasesWithoutVat > 0 ? {
      id: 'vat-purchases-missing',
      severity: 'info',
      label: 'TVA deductible manquante sur certaines charges',
      detail: 'Certaines depenses associees a des categories taxables n embarquent pas de TVA. Verifier si la facture fournisseur ouvre reellement droit a deduction.',
      count: deductiblePurchasesWithoutVat,
    } : null,
    suspiciousVatAmounts > 0 ? {
      id: 'vat-amount-suspicious',
      severity: 'warning',
      label: 'Montants de TVA incoherents',
      detail: 'Au moins une operation porte une TVA superieure au montant total saisi. Il faut controler le parametrage ou la saisie avant declaration.',
      count: suspiciousVatAmounts,
    } : null,
  ].filter((signal): signal is ComplianceSignal => Boolean(signal));
}

function buildClassSummaries(balances: AccountBalance[]): AccountClassSummary[] {
  const map = new Map<string, AccountClassSummary>();

  for (const balance of balances) {
    const classCode = balance.accountNumber.slice(0, 1) || '0';
    const current = map.get(classCode) || {
      classCode,
      label: getSyscohadaClassLabel(classCode),
      debit: 0,
      credit: 0,
      solde: 0,
      accountsCount: 0,
    };

    current.debit += balance.debit;
    current.credit += balance.credit;
    current.solde += balance.solde;
    current.accountsCount += 1;
    map.set(classCode, current);
  }

  return Array.from(map.values()).sort((a, b) => a.classCode.localeCompare(b.classCode));
}

function buildDueDetails(balances: AccountBalance[]): DueBalanceDetail[] {
  const details: DueBalanceDetail[] = [];

  for (const balance of balances) {
    const debtAmount = balance.credit - balance.debit;
    const assetAmount = balance.debit - balance.credit;

    if (balance.accountNumber.startsWith('422') && debtAmount > 0.01) {
      details.push({ bucket: 'payroll', bucketLabel: 'Personnel', accountNumber: balance.accountNumber, accountName: balance.accountName, amount: debtAmount });
      continue;
    }
    if (balance.accountNumber.startsWith('43') && debtAmount > 0.01) {
      details.push({ bucket: 'social', bucketLabel: 'Social', accountNumber: balance.accountNumber, accountName: balance.accountName, amount: debtAmount });
      continue;
    }
    if (balance.accountNumber.startsWith('443') && debtAmount > 0.01) {
      details.push({ bucket: 'vat_payable', bucketLabel: 'TVA a payer', accountNumber: balance.accountNumber, accountName: balance.accountName, amount: debtAmount });
      continue;
    }
    if (balance.accountNumber.startsWith('445') && assetAmount > 0.01) {
      details.push({ bucket: 'vat_credit', bucketLabel: 'Credit TVA', accountNumber: balance.accountNumber, accountName: balance.accountName, amount: assetAmount });
      continue;
    }
    if (balance.accountNumber.startsWith('44') && !balance.accountNumber.startsWith('443') && !balance.accountNumber.startsWith('445') && debtAmount > 0.01) {
      details.push({ bucket: 'tax', bucketLabel: 'Fiscal', accountNumber: balance.accountNumber, accountName: balance.accountName, amount: debtAmount });
    }
  }

  return details.sort((a, b) => a.bucketLabel.localeCompare(b.bucketLabel) || a.accountNumber.localeCompare(b.accountNumber));
}

function buildLiabilityBreakdown(balances: AccountBalance[]): LiabilityBreakdownLine[] {
  return balances
    .filter((balance) => ['42', '43', '44'].some((prefix) => balance.accountNumber.startsWith(prefix)))
    .map((balance): LiabilityBreakdownLine => {
      const family = balance.accountNumber.slice(0, 2) as '42' | '43' | '44';
      const signedBalance = balance.credit - balance.debit;
      const status: LiabilityBreakdownLine['status'] = Math.abs(signedBalance) <= 0.01 ? 'settled' : signedBalance > 0 ? 'credit' : 'debit';
      return {
        family,
        familyLabel: family === '42' ? 'Personnel' : family === '43' ? 'Organismes sociaux' : 'Etat et fiscalite',
        accountNumber: balance.accountNumber,
        accountName: balance.accountName,
        debit: balance.debit,
        credit: balance.credit,
        balance: Math.abs(signedBalance) <= 0.01 ? 0 : signedBalance,
        status,
      };
    })
    .sort((a, b) => a.family.localeCompare(b.family) || a.accountNumber.localeCompare(b.accountNumber));
}
function buildRecommendedEntries(controls: AccountingControls): RecommendedEntry[] {
  const entries: RecommendedEntry[] = [];

  if (controls.payrollDebt > 0) {
    entries.push({
      id: 'reglement-personnel',
      label: 'Regler les remunerations dues',
      journalCode: 'BQ',
      debitAccount: '422100 - Personnel - Remunerations dues',
      creditAccount: '521100 - Banques locales',
      amount: controls.payrollDebt,
      rationale: 'Apurer les salaires, acomptes ou avances restant dus au personnel avant cloture.',
    });
  }

  if (controls.socialDebt > 0) {
    entries.push({
      id: 'reglement-social',
      label: 'Regler les cotisations sociales',
      journalCode: 'BQ',
      debitAccount: '431xxx - CNSS / INPP / ONEM',
      creditAccount: '521100 - Banques locales',
      amount: controls.socialDebt,
      rationale: 'Apurer les dettes sociales constatees et rapprocher les bordereaux de paiement.',
    });
  }

  if (controls.vatPayable > 0) {
    entries.push({
      id: 'reglement-tva',
      label: 'Regler la TVA due a la DGI',
      journalCode: 'BQ',
      debitAccount: '443100 - TVA a decaisser',
      creditAccount: '521100 - Banques locales',
      amount: controls.vatPayable,
      rationale: 'Constater le paiement de la TVA nette declaree a la DGI sur la periode.',
    });
  }

  const nonVatTaxDebt = Math.max(0, controls.taxDebt - controls.vatPayable);
  if (nonVatTaxDebt > 0) {
    entries.push({
      id: 'reglement-fiscal-hors-tva',
      label: 'Regler les dettes fiscales hors TVA',
      journalCode: 'BQ',
      debitAccount: '44xxxx - Etat / DGI / IPR / IBP',
      creditAccount: '521100 - Banques locales',
      amount: nonVatTaxDebt,
      rationale: 'Apurer les dettes fiscales ouvertes hors TVA et verifier leur coherence avec les declarations DGI.',
    });
  }

  if (controls.vatCredit > 0) {
    entries.push({
      id: 'suivi-credit-tva',
      label: 'Suivre le credit TVA a reporter',
      journalCode: 'OD',
      debitAccount: '445600 - Credit TVA',
      creditAccount: '443100 - TVA a regulariser',
      amount: controls.vatCredit,
      rationale: 'Verifier le report du credit TVA sur la declaration suivante et conserver les justificatifs.',
    });
  }

  if (controls.receivables > 0) {
    entries.push({
      id: 'relance-clients',
      label: 'Suivre les creances clients',
      journalCode: 'OD',
      debitAccount: '491xxx / 659xxx - Provision clients',
      creditAccount: '411100 - Clients',
      amount: controls.receivables,
      rationale: 'Verifier le lettrage, les encaissements manquants et les provisions pour creances douteuses.',
    });
  }

  if (controls.treasury < 0) {
    entries.push({
      id: 'analyse-tresorerie-negative',
      label: 'Analyser la tresorerie negative',
      journalCode: 'OD',
      debitAccount: '521100 / 571100 - Tresorerie',
      creditAccount: 'Compte d attente ou dette court terme a identifier',
      amount: Math.abs(controls.treasury),
      rationale: 'Un solde de tresorerie negatif signale un risque de mauvaise imputation, decouvert ou regularisation manquante.',
    });
  }

  return entries;
}

function buildPreClosingActions(controls: AccountingControls, openItems: OpenItem[]): PreClosingAction[] {
  const actions: PreClosingAction[] = [];
  const overdueClients = openItems.filter((item) => item.side === 'client' && item.status === 'overdue');
  const overdueSuppliers = openItems.filter((item) => item.side === 'supplier' && item.status === 'overdue');
  const attentionClients = openItems.filter((item) => item.side === 'client' && item.status === 'attention');
  const attentionSuppliers = openItems.filter((item) => item.side === 'supplier' && item.status === 'attention');
  const overdueClientAmount = overdueClients.reduce((sum, item) => sum + item.residualAmount, 0);
  const overdueSupplierAmount = overdueSuppliers.reduce((sum, item) => sum + item.residualAmount, 0);
  const attentionClientAmount = attentionClients.reduce((sum, item) => sum + item.residualAmount, 0);
  const attentionSupplierAmount = attentionSuppliers.reduce((sum, item) => sum + item.residualAmount, 0);
  const socialAndFiscalAmount = controls.payrollDebt + controls.socialDebt + controls.taxDebt;

  if (controls.uncategorizedTransactions > 0) {
    actions.push({
      id: 'preclose-categorisation',
      label: 'Finaliser la categorisation avant cloture',
      priority: 'high',
      timing: 'Avant balance definitive',
      amount: controls.uncategorizedTransactions,
      detail: `${controls.uncategorizedTransactions} operation(s) restent sans classement et peuvent fausser les etats SYSCOHADA.`,
      debitAccount: 'A determiner selon la piece',
      creditAccount: 'A determiner selon la piece',
    });
  }

  if (Math.abs(controls.imbalance) > 0.01) {
    actions.push({
      id: 'preclose-imbalance',
      label: 'Corriger l ecart debit-credit',
      priority: 'high',
      timing: 'Avant edition du journal et de la balance',
      amount: Math.abs(controls.imbalance),
      detail: 'Un ecart comptable subsiste entre debit et credit. Les ecritures doivent etre reprises avant cloture.',
      debitAccount: 'Compte a identifier',
      creditAccount: 'Contrepartie a identifier',
    });
  }

  if (overdueClientAmount > 0) {
    actions.push({
      id: 'preclose-clients-overdue',
      label: 'Apurer ou provisionner les creances anciennes',
      priority: 'high',
      timing: 'Avant cloture clients',
      amount: overdueClientAmount,
      detail: `${overdueClients.length} creance(s) client en retard doivent etre relancees, lettrees ou provisionnees.`,
      debitAccount: '659xxx / 491xxx - Provisions ou pertes',
      creditAccount: '411100 - Clients',
    });
  }

  if (attentionClientAmount > 0) {
    actions.push({
      id: 'preclose-clients-cutoff',
      label: 'Verifier les creances a echeance proche',
      priority: 'medium',
      timing: 'Avant arrete des comptes tiers',
      amount: attentionClientAmount,
      detail: `${attentionClients.length} creance(s) client sont a suivre pour lettrage, relance ou rattachement correct a la bonne periode.`,
      debitAccount: '411100 - Clients',
      creditAccount: '706100 / 707100 - Produits',
    });
  }

  if (overdueSupplierAmount > 0) {
    actions.push({
      id: 'preclose-fournisseurs-overdue',
      label: 'Rapprocher les dettes fournisseurs anciennes',
      priority: 'medium',
      timing: 'Avant validation fournisseurs',
      amount: overdueSupplierAmount,
      detail: `${overdueSuppliers.length} dette(s) fournisseur doivent etre rapprochees avec les pieces et les reglements.`,
      debitAccount: '401100 - Fournisseurs',
      creditAccount: '521100 / 571100 - Tresorerie',
    });
  }

  if (attentionSupplierAmount > 0) {
    actions.push({
      id: 'preclose-fournisseurs-cutoff',
      label: 'Verifier les charges a payer fournisseurs',
      priority: 'medium',
      timing: 'Avant inventaire des charges',
      amount: attentionSupplierAmount,
      detail: `${attentionSuppliers.length} dette(s) fournisseur recentes doivent etre revues pour charges a payer, factures non parvenues ou bon rattachement a la periode.`,
      debitAccount: '6xxxx / 408xxx - Charges a payer',
      creditAccount: '401100 - Fournisseurs',
    });
  }


  if (socialAndFiscalAmount > 0) {
    actions.push({
      id: 'preclose-social-fiscal',
      label: 'Regulariser les dettes sociales et fiscales',
      priority: 'high',
      timing: 'Avant cloture des comptes 42, 43 et 44',
      amount: socialAndFiscalAmount,
      detail: 'Verifier les comptes personnel, CNSS, INPP, ONEM, IPR et autres dettes fiscales avant fermeture de periode.',
      debitAccount: '422xxx / 43xxxx / 44xxxx',
      creditAccount: '521100 - Banques locales',
    });
  }

  if (controls.treasury < 0) {
    actions.push({
      id: 'preclose-treasury',
      label: 'Analyser la tresorerie negative',
      priority: 'high',
      timing: 'Avant cloture de caisse et banques',
      amount: Math.abs(controls.treasury),
      detail: 'Une disponibilite negative suggere un decouvert, une erreur d imputation ou un mouvement a regulariser.',
      debitAccount: '521100 / 571100 - Tresorerie',
      creditAccount: 'Compte de contrepartie a identifier',
    });
  }

  if (controls.vatPayable > 0) {
    actions.push({
      id: 'preclose-vat-payable',
      label: 'Valider la TVA nette a reverser',
      priority: 'high',
      timing: 'Avant teledeclaration TVA',
      amount: controls.vatPayable,
      detail: 'Rapprocher le compte 443, les ventes taxables et la declaration TVA du mois avant paiement a la DGI.',
      debitAccount: '443100 - TVA a decaisser',
      creditAccount: '521100 - Banques locales',
    });
  }

  if (controls.vatCredit > 0) {
    actions.push({
      id: 'preclose-vat-credit',
      label: 'Documenter le credit TVA a reporter',
      priority: 'medium',
      timing: 'Avant report sur la declaration suivante',
      amount: controls.vatCredit,
      detail: 'Conserver les justificatifs de TVA deductible et verifier le bon report du credit sur la periode suivante.',
      debitAccount: '445600 - TVA deductible',
      creditAccount: '443100 - TVA a regulariser',
    });
  }

  return actions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return b.amount - a.amount;
  });
}

function buildCycleReviews(
  controls: AccountingControls,
  openItems: OpenItem[],
  cutoffSignals: CutoffSignal[],
  journalSignals: ComplianceSignal[],
  vatSignals: ComplianceSignal[],
): ClosingCycleReview[] {
  const clientItems = openItems.filter((item) => item.side === 'client' && item.residualAmount > 0.01);
  const signalCount = (signals: Array<ComplianceSignal | CutoffSignal>) => signals.reduce((sum, signal) => sum + ('count' in signal ? signal.count : 1), 0);
  const supplierItems = openItems.filter((item) => item.side === 'supplier' && item.residualAmount > 0.01);
  const salesSignals = [
    ...journalSignals.filter((signal) => signal.id === 'journal-sales-reference'),
    ...vatSignals.filter((signal) => signal.id === 'vat-sales-missing'),
    ...cutoffSignals.filter((signal) => signal.family === 'fae'),
  ];
  const purchaseSignals = [
    ...journalSignals.filter((signal) => signal.id === 'journal-supplier-cash'),
    ...vatSignals.filter((signal) => signal.id === 'vat-purchases-missing'),
    ...cutoffSignals.filter((signal) => signal.family === 'fnp'),
  ];
  const treasurySignals = [
    ...journalSignals.filter((signal) => signal.id === 'journal-manual-treasury'),
  ];
  const socialFiscalSignals = [
    ...vatSignals.filter((signal) => signal.id === 'vat-amount-suspicious'),
    ...cutoffSignals.filter((signal) => signal.family === 'social_fiscal' || signal.family === 'cap'),
  ];

  return [
    {
      id: 'cycle-sales',
      label: 'Cycle ventes / clients',
      status: clientItems.length > 0 || salesSignals.length > 0 ? 'warning' : 'ok',
      amount: clientItems.reduce((sum, item) => sum + item.residualAmount, 0),
      count: clientItems.length + signalCount(salesSignals),
      detail: clientItems.length > 0 || salesSignals.length > 0
        ? 'Verifier le lettrage clients, les references facture, les produits a rattacher et la TVA sur les ventes.'
        : 'Le cycle ventes / clients ne montre pas d anomalie majeure de pre-cloture.',
      checkpoints: [
        'Lettrer les creances clients et relancer les echeances anciennes',
        'Verifier les references facture et la piste d audit des ventes',
        'Controler FAE / PAR et le bon rattachement des produits',
      ],
      focusAccounts: ['411100', '418100', '70xxxx', '443100'],
    },
    {
      id: 'cycle-purchases',
      label: 'Cycle achats / fournisseurs',
      status: supplierItems.length > 0 || purchaseSignals.length > 0 ? 'warning' : 'ok',
      amount: supplierItems.reduce((sum, item) => sum + item.residualAmount, 0),
      count: supplierItems.length + signalCount(purchaseSignals),
      detail: supplierItems.length > 0 || purchaseSignals.length > 0
        ? 'Verifier les dettes fournisseurs, les FNP, les charges a payer et la TVA deductible appuyee par pieces.'
        : 'Le cycle achats / fournisseurs est coherent pour la pre-cloture.',
      checkpoints: [
        'Rapprocher les soldes fournisseurs avec les factures et reglements',
        'Identifier les charges a payer et factures non parvenues',
        'Confirmer le droit a deduction de la TVA fournisseur',
      ],
      focusAccounts: ['401100', '408100', '6xxxx', '445600'],
    },
    {
      id: 'cycle-treasury',
      label: 'Cycle tresorerie',
      status: controls.treasury < 0 || treasurySignals.length > 0 ? 'warning' : 'ok',
      amount: Math.abs(Math.min(0, controls.treasury)),
      count: signalCount(treasurySignals) + (controls.treasury < 0 ? 1 : 0),
      detail: controls.treasury < 0 || treasurySignals.length > 0
        ? 'Revoir caisse, banques et paiements manuels avant cloture pour eviter les ecarts et disponibilites negatives.'
        : 'Le cycle tresorerie ne remonte pas de point bloquant a la date de lecture.',
      checkpoints: [
        'Rapprocher la banque et la caisse avec les pieces de tresorerie',
        'Verifier les reglements manuels et leurs contreparties',
        'Confirmer qu aucune disponibilite ne reste en solde anormal',
      ],
      focusAccounts: ['521100', '521200', '521300', '571100'],
    },
    {
      id: 'cycle-social-fiscal',
      label: 'Cycle social / fiscal',
      status: controls.payrollDebt + controls.socialDebt + controls.taxDebt > 0 || socialFiscalSignals.length > 0 ? 'warning' : 'ok',
      amount: controls.payrollDebt + controls.socialDebt + controls.taxDebt,
      count: signalCount(socialFiscalSignals) + (controls.payrollDebt + controls.socialDebt + controls.taxDebt > 0 ? 1 : 0),
      detail: controls.payrollDebt + controls.socialDebt + controls.taxDebt > 0 || socialFiscalSignals.length > 0
        ? 'Controler paie, CNSS, INPP, ONEM, IPR, TVA et autres dettes fiscales avant declaration et cloture.'
        : 'Le cycle social et fiscal est globalement apure pour la periode lue.',
      checkpoints: [
        'Justifier les soldes 42, 43 et 44 avec declarations et bordereaux',
        'Valider la TVA due ou le credit TVA reporte',
        'S assurer du bon rattachement des charges sociales et fiscales',
      ],
      focusAccounts: ['422xxx', '43xxxx', '44xxxx', '443100', '445600'],
    },
  ];
}

function buildYearEndAdjustments(
  transactions: Transaction[],
  categories: Category[],
  openItems: OpenItem[],
): YearEndAdjustment[] {
  const adjustments: YearEndAdjustment[] = [];
  const expenseTransactions = transactions.filter((transaction) => transaction.direction === 'out');
  const incomeTransactions = transactions.filter((transaction) => transaction.direction === 'in' && !isInvoicePaymentTransaction(transaction));

  const amortizableTransactions = expenseTransactions.filter((transaction) => {
    const category = categories.find((item) => item.id === transaction.category_id);
    const text = buildSearchText(category?.label || 'Non categorise', transaction.label, transaction.bank_account_label);
    return Number(transaction.amount || 0) >= 500 && matches(text, ['materiel', 'informatique', 'ordinateur', 'equipement', 'vehicule', 'mobilier', 'machine', 'logiciel', 'licence perpetuelle']);
  });
  const amortizationBase = amortizableTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const amortizationAmount = amortizationBase * 0.2;
  if (amortizationAmount > 0.01) {
    adjustments.push({
      id: 'yea-amortization',
      family: 'amortization',
      label: 'Dotations aux amortissements estimees',
      amount: amortizationAmount,
      basisCount: amortizableTransactions.length,
      priority: 'medium',
      detail: 'Estimation des dotations sur les investissements detectes dans les achats. A confirmer selon le registre des immobilisations et les durees d utilite.',
      debitAccount: '681100 - Dotations aux amortissements',
      creditAccount: '28xxxx - Amortissements cumules',
    });
  }

  const doubtfulReceivables = openItems.filter((item) => item.side === 'client' && item.status === 'overdue');
  const doubtfulBase = doubtfulReceivables.reduce((sum, item) => sum + item.residualAmount, 0);
  const doubtfulAmount = doubtfulBase * 0.35;
  if (doubtfulAmount > 0.01) {
    adjustments.push({
      id: 'yea-provision-clients',
      family: 'provision',
      label: 'Provision pour creances douteuses',
      amount: doubtfulAmount,
      basisCount: doubtfulReceivables.length,
      priority: 'high',
      detail: 'Provision indicative sur les creances clients anciennes. A ajuster selon les relances, dossiers contentieux et politique de provisionnement.',
      debitAccount: '659xxx - Charges sur creances',
      creditAccount: '491xxx - Provisions clients',
    });
  }

  const riskTransactions = transactions.filter((transaction) => {
    const category = categories.find((item) => item.id === transaction.category_id);
    const lookup = buildSearchText(category?.label || 'Non categorise', transaction.label, transaction.bank_account_label);
    return matches(lookup, ['litige', 'contentieux', 'penalite', 'amende', 'redressement', 'garantie', 'proces', 'risque']);
  });
  const riskBase = riskTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const riskAmount = riskBase * 0.4;
  if (riskAmount > 0.01) {
    adjustments.push({
      id: 'yea-risk-charge',
      family: 'risk_charge',
      label: 'Provision pour risques et charges',
      amount: riskAmount,
      basisCount: riskTransactions.length,
      priority: 'high',
      detail: 'Estimation d une provision pour risques, penalites, litiges ou garanties detectes dans les libelles. A confirmer avec les dossiers juridiques, fiscaux et sociaux.',
      debitAccount: '697xxx / 681500 - Dotations aux provisions',
      creditAccount: '151xxx / 19xxxx - Provisions pour risques et charges',
    });
  }

  const inventoryRiskTransactions = expenseTransactions.filter((transaction) => {
    const category = categories.find((item) => item.id === transaction.category_id);
    const lookup = buildSearchText(category?.label || 'Non categorise', transaction.label, transaction.bank_account_label);
    return matches(lookup, ['stock', 'marchandise', 'inventaire', 'produit', 'obsolete', 'casse', 'perime', 'invendu']);
  });
  const inventoryRiskBase = inventoryRiskTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const inventoryRiskAmount = inventoryRiskBase * 0.15;
  if (inventoryRiskAmount > 0.01) {
    adjustments.push({
      id: 'yea-inventory-depreciation',
      family: 'inventory_depreciation',
      label: 'Depreciation de stocks / actifs circulants',
      amount: inventoryRiskAmount,
      basisCount: inventoryRiskTransactions.length,
      priority: 'medium',
      detail: 'Estimation d une depreciation sur stocks, marchandises ou actifs circulants exposes a l obsolescence ou a la baisse de valeur. A confirmer par inventaire physique et valorisation.',
      debitAccount: '659xxx / 681700 - Dotations aux depreciations',
      creditAccount: '39xxxx / 49xxxx - Depreciations des stocks et creances',
    });
  }

  const prepaidTransactions = expenseTransactions.filter((transaction) => {
    const category = categories.find((item) => item.id === transaction.category_id);
    const text = buildSearchText(category?.label || 'Non categorise', transaction.label, transaction.bank_account_label);
    return matches(text, ['assurance', 'abonnement annuel', 'loyer annuel', 'maintenance annuelle', 'licence annuelle', 'hebergement annuel', 'nom de domaine']);
  });
  const prepaidBase = prepaidTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const prepaidAmount = prepaidBase * 0.5;
  if (prepaidAmount > 0.01) {
    adjustments.push({
      id: 'yea-cca',
      family: 'cca',
      label: 'Charges constatees d avance estimees',
      amount: prepaidAmount,
      basisCount: prepaidTransactions.length,
      priority: 'medium',
      detail: 'Estimation des charges payees couvrant une periode ulterieure. A confirmer par les contrats et periodes de couverture.',
      debitAccount: '476000 / 486000 - Charges constatees d avance',
      creditAccount: '6xxxx - Charges de la periode',
    });
  }

  const deferredIncomeTransactions = incomeTransactions.filter((transaction) => {
    const category = categories.find((item) => item.id === transaction.category_id);
    const text = buildSearchText(category?.label || 'Non categorise', transaction.label, transaction.bank_account_label);
    return matches(text, ['abonnement', 'avance client', 'maintenance', 'contrat annuel', 'service annuel', 'prestation annuelle']);
  });
  const deferredIncomeBase = deferredIncomeTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const deferredIncomeAmount = deferredIncomeBase * 0.5;
  if (deferredIncomeAmount > 0.01) {
    adjustments.push({
      id: 'yea-pca',
      family: 'pca',
      label: 'Produits constates d avance estimes',
      amount: deferredIncomeAmount,
      basisCount: deferredIncomeTransactions.length,
      priority: 'medium',
      detail: 'Estimation des produits encaisses ou factures d avance couvrant une periode suivante. A confirmer sur base des contrats et obligations de service.',
      debitAccount: '70xxxx - Produits de la periode',
      creditAccount: '487000 - Produits constates d avance',
    });
  }

  return adjustments.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return b.amount - a.amount;
  });
}

function buildCutoffSignals(controls: AccountingControls, openItems: OpenItem[]): CutoffSignal[] {
  const signals: CutoffSignal[] = [];
  const attentionSuppliers = openItems.filter((item) => item.side === 'supplier' && item.status === 'attention');
  const overdueSuppliers = openItems.filter((item) => item.side === 'supplier' && item.status === 'overdue');
  const attentionClients = openItems.filter((item) => item.side === 'client' && item.status === 'attention');
  const overdueClients = openItems.filter((item) => item.side === 'client' && item.status === 'overdue');

  const supplierCutoffAmount = [...attentionSuppliers, ...overdueSuppliers].reduce((sum, item) => sum + item.residualAmount, 0);
  const clientCutoffAmount = [...attentionClients, ...overdueClients].reduce((sum, item) => sum + item.residualAmount, 0);
  const socialFiscalAmount = controls.payrollDebt + controls.socialDebt + controls.taxDebt;

  if (supplierCutoffAmount > 0) {
    signals.push({
      id: 'cutoff-suppliers',
      family: 'fnp',
      label: 'Charges a payer / factures non parvenues',
      amount: supplierCutoffAmount,
      priority: overdueSuppliers.length > 0 ? 'high' : 'medium',
      detail: `${attentionSuppliers.length + overdueSuppliers.length} ligne(s) fournisseur peuvent exiger un rattachement en FNP ou charges a payer sur la bonne periode.`,
      debitAccount: '6xxxx / 408100 - Charges a payer / FNP',
      creditAccount: '401100 - Fournisseurs',
    });
  }

  if (clientCutoffAmount > 0) {
    signals.push({
      id: 'cutoff-clients',
      family: 'fae',
      label: 'Produits a recevoir / factures a etablir',
      amount: clientCutoffAmount,
      priority: overdueClients.length > 0 ? 'high' : 'medium',
      detail: `${attentionClients.length + overdueClients.length} ligne(s) client ouvertes doivent etre revues pour FAE, PAR ou bon rattachement des produits.`,
      debitAccount: '418100 - Clients, produits a recevoir',
      creditAccount: '70xxxx - Produits a rattacher',
    });
  }

  if (socialFiscalAmount > 0) {
    signals.push({
      id: 'cutoff-social-fiscal',
      family: 'social_fiscal',
      label: 'Dettes sociales et fiscales a rattacher',
      amount: socialFiscalAmount,
      priority: 'high',
      detail: 'Les comptes 42, 43 et 44 portent encore des soldes qui doivent etre rapproches avec la paie, la DGI et les organismes sociaux avant cloture.',
      debitAccount: '66xxxx / 64xxxx - Charges de periode',
      creditAccount: '42xxxx / 43xxxx / 44xxxx',
    });
  }

  if (controls.vatCredit > 0) {
    signals.push({
      id: 'cutoff-vat-credit',
      family: 'cap',
      label: 'Credit TVA a justifier et reporter',
      amount: controls.vatCredit,
      priority: 'medium',
      detail: 'Le credit TVA doit etre documente, conserve en pieces et correctement reporte sur la periode fiscale suivante.',
      debitAccount: '445600 - TVA deductible',
      creditAccount: '443100 - TVA a regulariser',
    });
  }

  return signals.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return b.amount - a.amount;
  });
}
function buildOpenItems(transactions: Transaction[], categories: Category[]): OpenItem[] {
  const now = new Date();
  const map = new Map<string, OpenItem>();

  for (const transaction of transactions) {
    const category = categories.find((item) => item.id === transaction.category_id);
    const categoryLabel = category?.label || 'Non categorise';
    const text = buildSearchText(categoryLabel, transaction.label, transaction.bank_account_label);
    const matchingKey = getTransactionMatchingKey(transaction);
    const reference = getTransactionReference(transaction);

    if (transaction.direction === 'in') {
      const key = `client-${matchingKey}`;
      const amount = Number(transaction.amount || 0);
      const ageDays = differenceInDays(transaction.date, now);
      const current = map.get(key) || { id: key, side: 'client' as const, accountNumber: '411100', accountName: 'Clients', reference, oldestDate: transaction.date, newestDate: transaction.date, grossAmount: 0, settledAmount: 0, residualAmount: 0, count: 0, ageDays: 0, status: 'recent' as const, matchingStatus: 'open' as const };
      current.reference = reference;
      if (isInvoicePaymentTransaction(transaction)) current.settledAmount += amount;
      else current.grossAmount += amount;
      if (!isInvoicePaymentTransaction(transaction) && transaction.reconciliated) current.settledAmount += amount;
      current.count += 1;
      if (transaction.date < current.oldestDate) current.oldestDate = transaction.date;
      if (transaction.date > current.newestDate) current.newestDate = transaction.date;
      current.ageDays = Math.max(current.ageDays, ageDays);
      current.status = current.ageDays > 60 ? 'overdue' : current.ageDays > 30 ? 'attention' : 'recent';
      current.residualAmount = Math.max(0, current.grossAmount - current.settledAmount);
      current.matchingStatus = current.residualAmount <= 0.01 ? 'closed' : current.settledAmount > 0 ? 'partial' : 'open';
      map.set(key, current);
      continue;
    }

    if (isCreditNoteTransaction(transaction)) {
      const key = `client-${matchingKey}`;
      const amount = Number(transaction.amount || 0);
      const ageDays = differenceInDays(transaction.date, now);
      const current = map.get(key) || { id: key, side: 'client' as const, accountNumber: '411100', accountName: 'Clients', reference, oldestDate: transaction.date, newestDate: transaction.date, grossAmount: 0, settledAmount: 0, residualAmount: 0, count: 0, ageDays: 0, status: 'recent' as const, matchingStatus: 'open' as const };
      current.reference = reference;
      current.grossAmount = Math.max(0, current.grossAmount - amount);
      current.count += 1;
      if (transaction.date < current.oldestDate) current.oldestDate = transaction.date;
      if (transaction.date > current.newestDate) current.newestDate = transaction.date;
      current.ageDays = Math.max(current.ageDays, ageDays);
      current.status = current.ageDays > 60 ? 'overdue' : current.ageDays > 30 ? 'attention' : 'recent';
      current.residualAmount = Math.max(0, current.grossAmount - current.settledAmount);
      current.matchingStatus = current.residualAmount <= 0.01 ? 'closed' : current.settledAmount > 0 ? 'partial' : 'open';
      map.set(key, current);
      continue;
    }

    if (isCreditNoteRefundTransaction(transaction)) {
      continue;
    }

    const payableAccount = getPayableAccount(text);
    if (!payableAccount.accountNumber.startsWith('401')) continue;
    const key = `supplier-${matchingKey}`;
    const amount = Number(transaction.amount || 0);
    const ageDays = differenceInDays(transaction.date, now);
    const current = map.get(key) || { id: key, side: 'supplier' as const, accountNumber: '401100', accountName: 'Fournisseurs', reference, oldestDate: transaction.date, newestDate: transaction.date, grossAmount: 0, settledAmount: 0, residualAmount: 0, count: 0, ageDays: 0, status: 'recent' as const, matchingStatus: 'open' as const };
    current.grossAmount += amount;
    if (transaction.reconciliated) current.settledAmount += amount;
    current.count += 1;
    if (transaction.date < current.oldestDate) current.oldestDate = transaction.date;
    if (transaction.date > current.newestDate) current.newestDate = transaction.date;
    current.ageDays = Math.max(current.ageDays, ageDays);
    current.status = current.ageDays > 60 ? 'overdue' : current.ageDays > 30 ? 'attention' : 'recent';
    current.residualAmount = Math.max(0, current.grossAmount - current.settledAmount);
    current.matchingStatus = current.residualAmount <= 0.01 ? 'closed' : current.settledAmount > 0 ? 'partial' : 'open';
    map.set(key, current);
  }

  return Array.from(map.values())
    .filter((item) => item.grossAmount > 0)
    .sort((a, b) => (a.matchingStatus === b.matchingStatus ? b.ageDays - a.ageDays || b.residualAmount - a.residualAmount : a.matchingStatus.localeCompare(b.matchingStatus)));
}

export function buildAccountingReport(transactions: Transaction[], categories: Category[]): AccountingReport {
  const entries: AccountEntry[] = [];
  const balanceMap = new Map<string, AccountBalance>();
  const journalMap = new Map<string, JournalSummary>();

  for (const transaction of transactions) {
    const category = categories.find((item) => item.id === transaction.category_id);
    const categoryLabel = category?.label || 'Non categorise';
    const text = buildSearchText(categoryLabel, transaction.label, transaction.bank_account_label);
    const operationalAccount = resolveOperationalAccount(transaction, categoryLabel);

    const payableAccount = getPayableAccount(text);
    const settlementAccount = getSettlementAccount(transaction, categoryLabel);
    const liabilityNature = getLiabilityNature(payableAccount);
    const amountTtc = Number(transaction.amount || 0);
    const vatAmount = Math.max(0, Number(transaction.vat_amount || 0));
    const amountHt = Math.max(0, amountTtc - vatAmount);
    const journalMeta = getJournalMeta(transaction, categoryLabel, settlementAccount);
    const lines: AccountEntry[] = [];

    if (transaction.direction === 'in') {
      if (isInvoicePaymentTransaction(transaction)) {
        lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, settlementAccount, amountTtc, 0));
        lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '411100', accountName: 'Clients', syscohadaClass: '41', categoryKind: 'asset' }, 0, amountTtc));
      } else {
        lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, settlementAccount, amountTtc, 0));
        if (amountHt > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, operationalAccount, 0, amountHt));
        if (vatAmount > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '443100', accountName: 'TVA facturee', syscohadaClass: '44', categoryKind: 'vat' }, 0, vatAmount));
      }
    } else if (isCreditNoteTransaction(transaction)) {
      if (amountHt > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '709100', accountName: 'Rabais, remises et ristournes accordes', syscohadaClass: '70', categoryKind: 'income' }, amountHt, 0));
      if (vatAmount > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '443100', accountName: 'TVA facturee', syscohadaClass: '44', categoryKind: 'vat' }, vatAmount, 0));
      lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '411100', accountName: 'Clients', syscohadaClass: '41', categoryKind: 'asset' }, 0, amountTtc));
    } else if (isCreditNoteRefundTransaction(transaction)) {
      lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '411100', accountName: 'Clients', syscohadaClass: '41', categoryKind: 'asset' }, amountTtc, 0));
      lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, settlementAccount, 0, amountTtc));
    } else if (!transaction.reconciliated) {
      if (amountHt > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, operationalAccount, amountHt, 0));
      if (vatAmount > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '445600', accountName: 'TVA deductible', syscohadaClass: '44', categoryKind: 'asset' }, vatAmount, 0));
      lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, payableAccount, 0, amountTtc));
    } else if (liabilityNature !== 'supplier') {
      const immediateRecognition = !isExplicitSettlement(text);
      if (immediateRecognition) {
        if (amountHt > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, operationalAccount, amountHt, 0));
        if (vatAmount > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '445600', accountName: 'TVA deductible', syscohadaClass: '44', categoryKind: 'asset' }, vatAmount, 0));
        lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, payableAccount, 0, amountTtc));
      }
      lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, payableAccount, amountTtc, 0));
      lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, settlementAccount, 0, amountTtc));
    } else {
      if (amountHt > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, operationalAccount, amountHt, 0));
      if (vatAmount > 0) lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, { accountNumber: '445600', accountName: 'TVA deductible', syscohadaClass: '44', categoryKind: 'asset' }, vatAmount, 0));
      lines.push(buildEntry(transaction, categoryLabel, journalMeta.code, journalMeta.label, settlementAccount, 0, amountTtc));
    }

    for (const line of lines) {
      entries.push(line);
      pushBalance(balanceMap, line);
      pushJournal(journalMap, line);
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date) || a.accountNumber.localeCompare(b.accountNumber) || a.label.localeCompare(b.label));
  const balances = Array.from(balanceMap.values()).sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
  const journals = Array.from(journalMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  const classSummaries = buildClassSummaries(balances);
  const dueDetails = buildDueDetails(balances);
  const liabilityBreakdown = buildLiabilityBreakdown(balances);
  const openItems = buildOpenItems(transactions, categories);
  const totalDebit = balances.reduce((sum, balance) => sum + balance.debit, 0);
  const totalCredit = balances.reduce((sum, balance) => sum + balance.credit, 0);
  const income = balances.filter((balance) => balance.categoryKind === 'income').map((balance) => ({ label: `${balance.accountNumber} - ${balance.accountName}`, amount: balance.credit - balance.debit })).sort((a, b) => b.amount - a.amount);
  const expenses = balances.filter((balance) => balance.categoryKind === 'expense').map((balance) => ({ label: `${balance.accountNumber} - ${balance.accountName}`, amount: balance.debit - balance.credit })).sort((a, b) => b.amount - a.amount);
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const vatCollected = balances.filter((balance) => balance.accountNumber.startsWith('443')).reduce((sum, balance) => sum + (balance.credit - balance.debit), 0);
  const vatDeductible = balances.filter((balance) => balance.accountNumber.startsWith('445')).reduce((sum, balance) => sum + (balance.debit - balance.credit), 0);
  const treasury = sumBalance(balances, ['52', '57'], 'solde');
  const receivables = sumBalance(balances, ['411'], 'solde');
  const payables = balances.filter((balance) => balance.accountNumber.startsWith('401')).reduce((sum, balance) => sum + (balance.credit - balance.debit), 0);
  const payrollDebt = balances.filter((balance) => balance.accountNumber.startsWith('422')).reduce((sum, balance) => sum + (balance.credit - balance.debit), 0);
  const socialDebt = balances.filter((balance) => balance.accountNumber.startsWith('43')).reduce((sum, balance) => sum + (balance.credit - balance.debit), 0);
  const taxDebt = balances.filter((balance) => balance.accountNumber.startsWith('44')).reduce((sum, balance) => sum + (balance.credit - balance.debit), 0);
  const vatPayable = Math.max(0, vatCollected - vatDeductible);
  const vatCredit = Math.max(0, vatDeductible - vatCollected);
  const netResult = totalIncome - totalExpenses;
  const uncategorizedTransactions = transactions.filter((transaction) => !transaction.category_id).length;
  const imbalance = Math.abs(totalDebit - totalCredit);
  const controls: AccountingControls = { treasury, receivables, payables, payrollDebt, socialDebt, taxDebt, vatCollected, vatDeductible, vatPayable, vatCredit, netResult, uncategorizedTransactions, imbalance };
  const preClosingActions = buildPreClosingActions(controls, openItems);
  const cutoffSignals = buildCutoffSignals(controls, openItems);
  const journalSignals = buildJournalSignals(transactions, categories);
  const vatSignals = buildVatSignals(transactions, categories);
  const cycleReviews = buildCycleReviews(controls, openItems, cutoffSignals, journalSignals, vatSignals);
  const yearEndAdjustments = buildYearEndAdjustments(transactions, categories, openItems);
  const nonVatTaxDebt = Math.max(0, taxDebt - vatPayable);
  const balanceSheet: BalanceSheet = {
    assets: [{ label: '52/57 - Tresorerie et disponibilites', amount: Math.max(0, treasury) }, { label: '411 - Creances clients', amount: Math.max(0, receivables) }, { label: '445 - Credit de TVA', amount: vatCredit }].filter((line) => line.amount > 0),
    liabilities: [{ label: '401 - Dettes fournisseurs', amount: Math.max(0, payables) }, { label: '422 - Personnel remuneration due', amount: Math.max(0, payrollDebt) }, { label: '431 - Dettes sociales', amount: Math.max(0, socialDebt) }, { label: '443 - TVA a decaisser', amount: vatPayable }, { label: '44 - Dettes fiscales hors TVA', amount: nonVatTaxDebt }].filter((line) => line.amount > 0),
    totalAssets: Math.max(0, treasury) + Math.max(0, receivables) + vatCredit,
    totalLiabilities: Math.max(0, payables) + Math.max(0, payrollDebt) + Math.max(0, socialDebt) + vatPayable + nonVatTaxDebt,
    equity: netResult,
  };
  const alerts: string[] = [];
  if (uncategorizedTransactions > 0) alerts.push(`${uncategorizedTransactions} operation(s) restent non categorisees, ce qui fragilise la balance et les etats SYSCOHADA.`);
  if (imbalance > 0.01) alerts.push(`Le total debit et le total credit ne sont pas parfaitement equilibres (${imbalance.toFixed(2)}).`);
  if (Math.max(0, receivables) > 0) alerts.push('Des creances clients restent ouvertes et doivent etre suivies dans le lettrage.');
  if (Math.max(0, payables) > 0) alerts.push('Des dettes fournisseurs restent ouvertes et doivent etre rapprochees avec les pieces.');
  if (Math.max(0, payrollDebt) > 0) alerts.push('Des remunerations restent dues au personnel: verifier la paie et les ecritures de reglement.');
  if (Math.max(0, socialDebt) > 0) alerts.push('Des cotisations sociales restent a reverser: suivre CNSS, INPP et ONEM.');
  if (nonVatTaxDebt > 0) alerts.push('Des impots hors TVA restent dus: rapprocher les montants DGI et les declarations.');
  if (vatPayable > 0) alerts.push('La TVA collectee nette est positive: verifier la declaration et l echeance DGI correspondante.');
  journalSignals.forEach((signal) => alerts.push(`${signal.label}: ${signal.count} element(s) a verifier.`));
  vatSignals.forEach((signal) => alerts.push(`${signal.label}: ${signal.count} element(s) a verifier.`));

  return { entries, balances, journals, classSummaries, dueDetails, liabilityBreakdown, openItems, controls, alerts, closingChecks: buildClosingChecks(controls), recommendedEntries: buildRecommendedEntries(controls), preClosingActions, cutoffSignals, journalSignals, vatSignals, cycleReviews, yearEndAdjustments, pnl: { income, expenses, operatingIncome: balances.filter((balance) => ['70', '71', '72', '73'].some((prefix) => balance.accountNumber.startsWith(prefix))).reduce((sum, balance) => sum + (balance.credit - balance.debit), 0), operatingExpenses: balances.filter((balance) => ['60', '61', '62', '63', '64', '65', '66', '68'].some((prefix) => balance.accountNumber.startsWith(prefix))).reduce((sum, balance) => sum + (balance.debit - balance.credit), 0), financialIncome: balances.filter((balance) => balance.accountNumber.startsWith('77')).reduce((sum, balance) => sum + (balance.credit - balance.debit), 0), financialExpenses: balances.filter((balance) => balance.accountNumber.startsWith('67')).reduce((sum, balance) => sum + (balance.debit - balance.credit), 0), taxAndSocialExpenses: balances.filter((balance) => ['64', '664'].some((prefix) => balance.accountNumber.startsWith(prefix))).reduce((sum, balance) => sum + (balance.debit - balance.credit), 0), personnelExpenses: balances.filter((balance) => balance.accountNumber.startsWith('66')).reduce((sum, balance) => sum + (balance.debit - balance.credit), 0), totalIncome, totalExpenses, netResult }, balanceSheet, totals: { totalDebit, totalCredit, income: totalIncome, expenses: totalExpenses, vatCollected, vatDeductible } };
}

export function generateFEC(transactions: Transaction[], categories: Category[], profile: { siren: string | null; company_name: string | null }): string {
  const report = buildAccountingReport(transactions, categories);
  const header = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'EcritureLib', 'Debit', 'Credit'].join('\t');
  const rows = [header];
  report.entries.forEach((entry, index) => {
    rows.push([entry.journalCode, entry.journalLabel, String(index + 1), entry.date.replace(/-/g, ''), entry.accountNumber, entry.accountName, entry.label.replace(/\t/g, ' '), entry.debit.toFixed(2), entry.credit.toFixed(2)].join('\t'));
  });
  void profile;
  return rows.join('\n');
}

export function generateSIE(report: AccountingReport, profile: { siren: string | null; company_name: string | null }): string {
  const lines = ['#SYSCOHADA#CPCC', `#ORG#${profile.company_name || 'Activite'}`, `#IDFISCAL#${profile.siren || '000000000'}`, '#SOURCE#TENZO'];
  report.balances.forEach((balance) => { lines.push(`#CPT#${balance.accountNumber}#${balance.accountName}#${balance.debit.toFixed(2)}#${balance.credit.toFixed(2)}#${balance.solde.toFixed(2)}`); });
  return lines.join('\n');
}

export function generateCSV(report: AccountingReport): string {
  const header = 'Date,Journal,Compte,Libelle,Debit,Credit,Solde';
  const rows = report.entries.map((entry) => [entry.date, `"${entry.journalCode} - ${entry.journalLabel}"`, `"${entry.accountNumber} - ${entry.accountName}"`, `"${entry.label.replace(/"/g, '""')}"`, entry.debit.toFixed(2), entry.credit.toFixed(2), (entry.debit - entry.credit).toFixed(2)].join(','));
  return [header, ...rows].join('\n');
}






























