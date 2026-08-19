import type { LegalStatus } from './types';

export interface SocialSimulation {
  netIncome: number;
  totalCotisations: number;
  csgCrds: number;
  incomeTax: number;
  effectiveRate: number;
  breakdown: { label: string; amount: number; rate: number }[];
}

export interface PayrollSocialSimulation {
  grossPayroll: number;
  employeeCount: number;
  companyNature: 'private' | 'public';
  cnssEmployer: number;
  cnssEmployee: number;
  inppEmployer: number;
  onemEmployer: number;
  totalEmployerCharges: number;
  totalEmployeeWithholding: number;
  totalSocialDue: number;
  totalEmployerCost: number;
  effectiveEmployerRate: number;
  effectiveEmployeeRate: number;
  periodicityHint: string;
  breakdown: { label: string; amount: number; rate: number; side: 'employer' | 'employee' }[];
}

export interface IprBracketSimulation {
  label: string;
  taxableAmount: number;
  rate: number;
  tax: number;
}

export interface IprSimulation {
  grossMonthlyPayroll: number;
  cnssEmployeeDeduction: number;
  deductibleBenefits: number;
  taxableMonthlyBase: number;
  taxableAnnualBase: number;
  annualTax: number;
  monthlyTax: number;
  effectiveMonthlyRate: number;
  minimumApplied: boolean;
  cappedAtThirtyPercent: boolean;
  bracketBreakdown: IprBracketSimulation[];
  notes: string[];
}

export interface IereSimulation {
  expatriateGrossPayroll: number;
  rate: number;
  amount: number;
}

export interface PayrollPostingLine {
  id: string;
  stage: 'constatation' | 'paiement';
  label: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  detail: string;
}

export interface PayrollPostingGuide {
  grossPayroll: number;
  netPayroll: number;
  socialRemittance: number;
  iprRemittance: number;
  iereRemittance: number;
  lines: PayrollPostingLine[];
}

const RDC_IPR_ANNUAL_BRACKETS = [
  { limit: 1944000, rate: 3, label: '0 FC a 1 944 000 FC' },
  { limit: 21600000, rate: 15, label: '1 944 001 FC a 21 600 000 FC' },
  { limit: 43200000, rate: 30, label: '21 600 001 FC a 43 200 000 FC' },
  { limit: Number.POSITIVE_INFINITY, rate: 40, label: 'Surplus au-dela de 43 200 000 FC' },
] as const;

export function simulateSocial(
  grossRevenue: number,
  legalStatus: LegalStatus,
  vatRegime: 'franchise' | 'reel_simplifie' | 'reel_normal',
): SocialSimulation {
  if (legalStatus === 'entreprise_individuelle' || legalStatus === 'snc' || legalStatus === 'gie' || legalStatus === 'asbl') {
    const netTaxable = grossRevenue * 0.71;
    const totalCotisations = netTaxable * 0.219;
    const csgCrds = netTaxable * 0.097;
    const netIncome = grossRevenue - totalCotisations - csgCrds;
    const incomeTax = Math.max(0, (netTaxable - 10000) * 0.11);
    void vatRegime;
    return {
      netIncome,
      totalCotisations,
      csgCrds,
      incomeTax,
      effectiveRate: grossRevenue > 0 ? ((totalCotisations + csgCrds) / grossRevenue) * 100 : 0,
      breakdown: [
        { label: 'Cotisations sociales estimees', amount: totalCotisations, rate: 21.9 },
        { label: 'Charges sociales complementaires', amount: csgCrds, rate: 9.7 },
        { label: 'Impot estime', amount: incomeTax, rate: 0 },
      ],
    };
  }

  if (legalStatus === 'sa' || legalStatus === 'sas' || legalStatus === 'sasu') {
    const netTaxable = grossRevenue;
    const plafondSS = 46392;
    const tranche1 = Math.min(netTaxable, plafondSS);
    const tranche2 = Math.max(0, Math.min(netTaxable, plafondSS * 4) - plafondSS);
    const tranche3 = Math.max(0, netTaxable - plafondSS * 4);
    const maladieMaternite = tranche1 * 0.13 + tranche2 * 0.13;
    const vieillesseBase = tranche1 * 0.069 + tranche2 * 0.069;
    const vieillesseCompl = tranche2 * 0.0855 + tranche3 * 0.0855;
    const chomage = tranche1 * 0.0405 + tranche2 * 0.0405;
    const csgCrds = netTaxable * 0.097;
    const totalCotisations = maladieMaternite + vieillesseBase + vieillesseCompl + chomage;
    const netIncome = netTaxable - csgCrds;
    const incomeTax = Math.max(0, (netTaxable - 11497) * 0.11);
    void vatRegime;
    return {
      netIncome,
      totalCotisations,
      csgCrds,
      incomeTax,
      effectiveRate: netTaxable > 0 ? (totalCotisations / netTaxable) * 100 : 0,
      breakdown: [
        { label: 'Charges dirigeant estimees', amount: maladieMaternite, rate: 13 },
        { label: 'Vieillesse de base', amount: vieillesseBase, rate: 6.9 },
        { label: 'Retraite complementaire', amount: vieillesseCompl, rate: 8.55 },
        { label: 'Autres charges sociales', amount: chomage, rate: 4.05 },
        { label: 'Charges sociales complementaires', amount: csgCrds, rate: 9.7 },
        { label: 'Impot estime', amount: incomeTax, rate: 0 },
      ],
    };
  }

  if (legalStatus === 'sarl' || legalStatus === 'eurl' || legalStatus === 'scs') {
    const netTaxable = grossRevenue * 0.71;
    const totalCotisations = netTaxable * 0.219;
    const csgCrds = netTaxable * 0.097;
    const netIncome = grossRevenue - totalCotisations - csgCrds;
    const incomeTax = Math.max(0, (netTaxable - 10000) * 0.11);
    return {
      netIncome,
      totalCotisations,
      csgCrds,
      incomeTax,
      effectiveRate: grossRevenue > 0 ? ((totalCotisations + csgCrds) / grossRevenue) * 100 : 0,
      breakdown: [
        { label: 'Cotisations sociales estimees', amount: totalCotisations, rate: 21.9 },
        { label: 'Charges sociales complementaires', amount: csgCrds, rate: 9.7 },
        { label: 'Impot estime', amount: incomeTax, rate: 0 },
      ],
    };
  }

  const netTaxable = grossRevenue * 0.71;
  const totalCotisations = netTaxable * 0.219;
  const csgCrds = netTaxable * 0.097;
  const netIncome = grossRevenue - totalCotisations - csgCrds;
  const incomeTax = Math.max(0, (netTaxable - 10000) * 0.11);
  return {
    netIncome,
    totalCotisations,
    csgCrds,
    incomeTax,
    effectiveRate: grossRevenue > 0 ? ((totalCotisations + csgCrds) / grossRevenue) * 100 : 0,
    breakdown: [
      { label: 'Cotisations sociales estimees', amount: totalCotisations, rate: 21.9 },
      { label: 'Charges sociales complementaires', amount: csgCrds, rate: 9.7 },
      { label: 'Impot estime', amount: incomeTax, rate: 0 },
    ],
  };
}

export function getInppRate(employeeCount: number, companyNature: 'private' | 'public') {
  if (companyNature === 'public') return 3;
  if (employeeCount <= 50) return 3;
  if (employeeCount <= 300) return 2;
  return 1;
}

export function simulatePayrollSocial(grossPayroll: number, employeeCount: number, companyNature: 'private' | 'public'): PayrollSocialSimulation {
  const normalizedPayroll = Math.max(0, grossPayroll);
  const normalizedEmployeeCount = Math.max(1, Math.floor(employeeCount || 1));

  const cnssEmployerRate = 13.5;
  const cnssEmployeeRate = 5;
  const inppRate = getInppRate(normalizedEmployeeCount, companyNature);
  const onemRate = 0.2;

  const cnssEmployer = normalizedPayroll * (cnssEmployerRate / 100);
  const cnssEmployee = normalizedPayroll * (cnssEmployeeRate / 100);
  const inppEmployer = normalizedPayroll * (inppRate / 100);
  const onemEmployer = normalizedPayroll * (onemRate / 100);

  const totalEmployerCharges = cnssEmployer + inppEmployer + onemEmployer;
  const totalEmployeeWithholding = cnssEmployee;
  const totalSocialDue = totalEmployerCharges + totalEmployeeWithholding;
  const totalEmployerCost = normalizedPayroll + totalEmployerCharges;

  const periodicityHint = 'Declaration et paiement suivis chaque mois selon vos echeances CNSS, INPP et ONEM.';

  return {
    grossPayroll: normalizedPayroll,
    employeeCount: normalizedEmployeeCount,
    companyNature,
    cnssEmployer,
    cnssEmployee,
    inppEmployer,
    onemEmployer,
    totalEmployerCharges,
    totalEmployeeWithholding,
    totalSocialDue,
    totalEmployerCost,
    effectiveEmployerRate: normalizedPayroll > 0 ? (totalEmployerCharges / normalizedPayroll) * 100 : 0,
    effectiveEmployeeRate: normalizedPayroll > 0 ? (totalEmployeeWithholding / normalizedPayroll) * 100 : 0,
    periodicityHint,
    breakdown: [
      { label: 'CNSS part employeur', amount: cnssEmployer, rate: cnssEmployerRate, side: 'employer' },
      { label: 'CNSS part employee', amount: cnssEmployee, rate: cnssEmployeeRate, side: 'employee' },
      { label: 'INPP part employeur', amount: inppEmployer, rate: inppRate, side: 'employer' },
      { label: 'ONEM part employeur', amount: onemEmployer, rate: onemRate, side: 'employer' },
    ],
  };
}

export function estimateIprMonthly(
  grossMonthlyPayroll: number,
  options?: { cnssEmployeeDeduction?: number; deductibleBenefits?: number },
): IprSimulation {
  const normalizedGross = Math.max(0, grossMonthlyPayroll);
  const cnssEmployeeDeduction = Math.max(0, options?.cnssEmployeeDeduction ?? normalizedGross * 0.05);
  const deductibleBenefits = Math.max(0, options?.deductibleBenefits ?? 0);
  const taxableMonthlyBase = Math.max(0, normalizedGross - cnssEmployeeDeduction - deductibleBenefits);
  const taxableAnnualBase = taxableMonthlyBase * 12;

  let remaining = taxableAnnualBase;
  let previousLimit = 0;
  let annualTax = 0;
  const bracketBreakdown: IprBracketSimulation[] = [];

  for (const bracket of RDC_IPR_ANNUAL_BRACKETS) {
    if (remaining <= 0) break;
    const span = Number.isFinite(bracket.limit) ? Math.max(0, bracket.limit - previousLimit) : remaining;
    const taxableAmount = Math.min(remaining, span);
    const tax = taxableAmount * (bracket.rate / 100);
    annualTax += tax;
    bracketBreakdown.push({ label: bracket.label, taxableAmount, rate: bracket.rate, tax });
    remaining -= taxableAmount;
    previousLimit = Number.isFinite(bracket.limit) ? bracket.limit : previousLimit;
  }

  const annualCap = taxableAnnualBase * 0.3;
  const cappedAnnualTax = Math.min(annualTax, annualCap);
  const cappedAtThirtyPercent = cappedAnnualTax < annualTax;

  let monthlyTax = cappedAnnualTax / 12;
  let minimumApplied = false;

  if (taxableMonthlyBase > 0 && monthlyTax < 2500) {
    monthlyTax = 2500;
    minimumApplied = true;
  }

  monthlyTax = Math.min(monthlyTax, taxableMonthlyBase * 0.3);

  return {
    grossMonthlyPayroll: normalizedGross,
    cnssEmployeeDeduction,
    deductibleBenefits,
    taxableMonthlyBase,
    taxableAnnualBase,
    annualTax: cappedAnnualTax,
    monthlyTax,
    effectiveMonthlyRate: taxableMonthlyBase > 0 ? (monthlyTax / taxableMonthlyBase) * 100 : 0,
    minimumApplied,
    cappedAtThirtyPercent,
    bracketBreakdown,
    notes: [
      'Bareme officiel DGI : 3% jusqu a 1 944 000 FC, 15% jusqu a 21 600 000 FC, 30% jusqu a 43 200 000 FC, puis 40% au-dela.',
      'Estimation mensuelle obtenue par annualisation de la base imposable du mois, puis lissage sur 12 mois.',
      'L IPR individuel ne peut pas etre inferieur a 2 500 FC par mois lorsque la base imposable est positive.',
      'Le resultat reste un estimateur applicatif : la paie reelle doit tenir compte des avantages deductibles et de la situation salariale detaillee.',
    ],
  };
}

export function estimateIere(expatriateGrossPayroll: number): IereSimulation {
  const normalizedGross = Math.max(0, expatriateGrossPayroll);
  const rate = 25;
  return {
    expatriateGrossPayroll: normalizedGross,
    rate,
    amount: normalizedGross * (rate / 100),
  };
}

export function buildPayrollPostingGuide(
  payroll: PayrollSocialSimulation,
  ipr: IprSimulation,
  iere?: IereSimulation,
): PayrollPostingGuide {
  const grossPayroll = Math.max(0, payroll.grossPayroll);
  const socialRemittance = Math.max(0, payroll.totalSocialDue);
  const iprRemittance = Math.max(0, ipr.monthlyTax);
  const iereRemittance = Math.max(0, iere?.amount ?? 0);
  const netPayroll = Math.max(0, grossPayroll - payroll.cnssEmployee - iprRemittance);

  const lines: PayrollPostingLine[] = [];

  if (grossPayroll > 0) {
    lines.push({
      id: 'payroll-constatation-salaires',
      stage: 'constatation',
      label: 'Constater la paie brute et les retenues salariales',
      debitAccount: '661100 - Remunerations du personnel',
      creditAccount: '422100 - Personnel remunerations dues / 431150 - CNSS salariale / 442100 - IPR',
      amount: grossPayroll,
      detail: `Net estime ${netPayroll.toFixed(2)} | CNSS salarie ${payroll.cnssEmployee.toFixed(2)} | IPR ${iprRemittance.toFixed(2)}`,
    });
  }

  if (payroll.totalEmployerCharges > 0) {
    lines.push({
      id: 'payroll-constatation-charges',
      stage: 'constatation',
      label: 'Constater les charges sociales patronales',
      debitAccount: '664100 - Charges sociales patronales',
      creditAccount: '431100 - CNSS / 431200 - INPP / 431300 - ONEM',
      amount: payroll.totalEmployerCharges,
      detail: `CNSS employeur ${payroll.cnssEmployer.toFixed(2)} | INPP ${payroll.inppEmployer.toFixed(2)} | ONEM ${payroll.onemEmployer.toFixed(2)}`,
    });
  }

  if (netPayroll > 0) {
    lines.push({
      id: 'payroll-paiement-salaires',
      stage: 'paiement',
      label: 'Regler le net a payer au personnel',
      debitAccount: '422100 - Personnel remunerations dues',
      creditAccount: '521100 - Banques locales / 571100 - Caisse',
      amount: netPayroll,
      detail: 'Paiement du net apres retenues salariales et IPR.',
    });
  }

  if (socialRemittance > 0) {
    lines.push({
      id: 'payroll-paiement-social',
      stage: 'paiement',
      label: 'Reverser les cotisations sociales',
      debitAccount: '431100 / 431150 / 431200 / 431300 - Organismes sociaux',
      creditAccount: '521100 - Banques locales',
      amount: socialRemittance,
      detail: `Total a reverser CNSS, INPP et ONEM, y compris CNSS salarie ${payroll.cnssEmployee.toFixed(2)}.`,
    });
  }

  if (iprRemittance > 0) {
    lines.push({
      id: 'payroll-paiement-ipr',
      stage: 'paiement',
      label: 'Reverser l IPR a la DGI',
      debitAccount: '442100 - IPR a reverser',
      creditAccount: '521100 - Banques locales',
      amount: iprRemittance,
      detail: 'Paiement mensuel de l IPR retenu sur salaires selon l estimation DGI.',
    });
  }

  if (iereRemittance > 0) {
    lines.push({
      id: 'payroll-paiement-iere',
      stage: 'paiement',
      label: 'Reverser l IERE a la DGI',
      debitAccount: '442300 - IERE a reverser',
      creditAccount: '521100 - Banques locales',
      amount: iereRemittance,
      detail: 'Paiement de l impot exceptionnel sur les remunerations des expatries.',
    });
  }

  return {
    grossPayroll,
    netPayroll,
    socialRemittance,
    iprRemittance,
    iereRemittance,
    lines,
  };
}




