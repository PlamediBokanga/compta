import type { Declaration, Invoice, InvoiceNormalizationStatus, Profile, Transaction } from './types';

export const RDC_STANDARD_VAT_RATE = 16;

function toBase36Hash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).toUpperCase();
}

export function buildVerificationCode(invoice: Partial<Invoice>, profile: Partial<Profile> | null): string {
  const seed = [
    profile?.tax_id || profile?.siren || 'NO-NIF',
    profile?.def_device_id || 'NO-DEF',
    invoice.number || 'NO-NUM',
    invoice.issue_date || 'NO-DATE',
    Number(invoice.total || 0).toFixed(2),
  ].join('|');
  return `DGI-${toBase36Hash(seed).padStart(10, '0').slice(0, 10)}`;
}

export function buildInvoiceQrPayload(invoice: Partial<Invoice>, profile: Partial<Profile> | null): string {
  return [
    `issuer=${encodeURIComponent(profile?.company_name || 'Entreprise')}`,
    `nif=${encodeURIComponent(profile?.tax_id || profile?.siren || '')}`,
    `rccm=${encodeURIComponent(profile?.rccm || '')}`,
    `def=${encodeURIComponent(profile?.def_device_id || '')}`,
    `invoice=${encodeURIComponent(invoice.number || '')}`,
    `date=${encodeURIComponent(invoice.issue_date || '')}`,
    `total=${Number(invoice.total || 0).toFixed(2)}`,
    `vat=${Number(invoice.vat_total || 0).toFixed(2)}`,
    `code=${encodeURIComponent(buildVerificationCode(invoice, profile))}`,
  ].join('&');
}

export function getInvoiceComplianceChecks(invoice: Partial<Invoice>, profile: Partial<Profile> | null) {
  const checks = [
    { label: 'Nom de l entreprise', ok: Boolean(profile?.company_name) },
    { label: 'NIF / identifiant fiscal', ok: Boolean(profile?.tax_id || profile?.siren) },
    { label: 'RCCM', ok: Boolean(profile?.rccm) },
    { label: 'Dispositif e-UF / e-MCF / DEF', ok: Boolean(profile?.def_device_id) },
    { label: 'Numero de facture', ok: Boolean(invoice.number) },
    { label: 'Client identifie', ok: Boolean(invoice.customer_name) },
    { label: 'Montant TTC', ok: Number(invoice.total || 0) > 0 },
    { label: 'Code d authentification', ok: Boolean(buildVerificationCode(invoice, profile)) },
    { label: 'QR de verification', ok: Boolean(buildInvoiceQrPayload(invoice, profile)) },
  ];

  const passed = checks.filter((check) => check.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  return { checks, score };
}

export function getInvoiceNormalizationStatus(invoice: Partial<Invoice>, profile: Partial<Profile> | null): InvoiceNormalizationStatus {
  if (invoice.normalization_status === 'normalized' || invoice.normalized_at) {
    return 'normalized';
  }
  if (!invoice.is_quote && profile?.tax_id && profile?.rccm && profile?.def_device_id) {
    return invoice.normalization_status === 'failed' ? 'failed' : 'ready';
  }
  return 'standard';
}

export function getInvoiceNormalizationLabel(status: InvoiceNormalizationStatus) {
  return {
    standard: 'Facture standard',
    ready: 'Pret a normaliser',
    normalized: 'Facture normalisee',
    failed: 'Normalisation en echec',
  }[status];
}

export function canNormalizeInvoice(invoice: Partial<Invoice>, profile: Partial<Profile> | null) {
  return !invoice.is_quote && Boolean(invoice.number) && Boolean(profile?.tax_id) && Boolean(profile?.rccm) && Boolean(profile?.def_device_id);
}

export function computeRdcComplianceOverview(
  profile: Profile | null,
  invoices: Invoice[],
  declarations: Declaration[],
  transactions: Transaction[],
) {
  const latestInvoice = invoices.find((invoice) => !invoice.is_quote) ?? invoices[0] ?? null;
  const invoiceCompliance = latestInvoice ? getInvoiceComplianceChecks(latestInvoice, profile) : { checks: [], score: 0 };

  const uncategorizedTransactions = transactions.filter((transaction) => !transaction.category_id).length;
  const pendingDeclarations = declarations.filter((declaration) => declaration.status === 'ready' || declaration.status === 'draft').length;
  const normalizedInvoices = invoices.filter((invoice) => getInvoiceNormalizationStatus(invoice, profile) === 'normalized').length;
  const missingProfileFields = [
    { key: 'company_name', label: 'Nom commercial', ok: Boolean(profile?.company_name) },
    { key: 'tax_id', label: 'NIF', ok: Boolean(profile?.tax_id || profile?.siren) },
    { key: 'rccm', label: 'RCCM', ok: Boolean(profile?.rccm) },
    { key: 'tax_center', label: 'Centre des impots', ok: Boolean(profile?.tax_center) },
    { key: 'def_device_id', label: 'Reference dispositif fiscal', ok: Boolean(profile?.def_device_id) },
    { key: 'address', label: 'Adresse', ok: Boolean(profile?.address) },
  ].filter((item) => !item.ok);

  const scoreBase = [
    profile?.company_name,
    profile?.tax_id || profile?.siren,
    profile?.rccm,
    profile?.tax_center,
    profile?.def_device_id,
  ].filter(Boolean).length;

  const score = Math.max(0, Math.min(100, Math.round(((scoreBase / 5) * 40) + (invoiceCompliance.score * 0.3) + (normalizedInvoices > 0 ? 10 : 0) + (pendingDeclarations === 0 ? 10 : 0) + (uncategorizedTransactions === 0 ? 10 : 0))));

  return {
    score,
    latestInvoice,
    invoiceCompliance,
    uncategorizedTransactions,
    pendingDeclarations,
    normalizedInvoices,
    missingProfileFields,
    recommendations: [
      missingProfileFields.length > 0 ? 'Completer le profil fiscal RDC (NIF, RCCM, centre des impots, DEF).' : null,
      normalizedInvoices === 0 ? 'Preparer le flux de normalisation DGI sur au moins une facture envoyee.' : null,
      pendingDeclarations > 0 ? 'Traiter les declarations fiscales pretes ou en brouillon.' : null,
      uncategorizedTransactions > 0 ? 'Categoriser les operations pour produire un reporting SYSCOHADA propre.' : null,
    ].filter(Boolean),
  };
}

export function getSyscohadaExportLabel() {
  return 'Export comptable SYSCOHADA / CPCC';
}
