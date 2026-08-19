export type LegalStatus =
  | 'entreprise_individuelle'
  | 'sarl'
  | 'eurl'
  | 'sa'
  | 'sas'
  | 'sasu'
  | 'snc'
  | 'scs'
  | 'gie'
  | 'asbl';

export type VatRegime = 'franchise' | 'reel_simplifie' | 'reel_normal';

export interface Profile {
  user_id: string;
  company_name: string | null;
  legal_status: LegalStatus | null;
  siren: string | null;
  tax_id?: string | null;
  rccm?: string | null;
  tax_center?: string | null;
  def_device_id?: string | null;
  accounting_standard?: string | null;
  invoice_series?: string | null;
  country?: string | null;
  vat_regime: VatRegime | null;
  vat_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  logo_url: string | null;
  iban: string | null;
  bic: string | null;
  created_at: string;
  updated_at: string;
}

export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: string;
  user_id: string;
  label: string;
  kind: CategoryKind;
  vat_rate: number;
  color: string;
  keywords: string[];
  created_at: string;
}

export type CategorizationState = 'auto' | 'suggested' | 'manual' | 'uncategorized';
export type Direction = 'in' | 'out';

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  label: string;
  amount: number;
  direction: Direction;
  category_id: string | null;
  categorization_state: CategorizationState;
  vat_amount: number;
  vat_rate: number;
  bank_account_label: string | null;
  reconciliated: boolean;
  document_id: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
  category?: Category | null;
}

export type DocumentKind = 'receipt' | 'invoice_in' | 'invoice_out' | 'bank_statement' | 'other';
export type DocumentStatus = 'pending' | 'ocr_done' | 'matched' | 'rejected';

export interface AccountingDocument {
  id: string;
  user_id: string;
  kind: DocumentKind;
  file_name: string;
  file_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: DocumentStatus;
  ocr_data: Record<string, unknown> | null;
  transaction_id: string | null;
  amount: number | null;
  date: string | null;
  supplier: string | null;
  vat_amount: number | null;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceNormalizationStatus = 'standard' | 'ready' | 'normalized' | 'failed';
export type CatalogItemType = 'product' | 'service';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  rccm: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  item_type: CatalogItemType;
  unit_price: number;
  vat_rate: number;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id?: string | null;
  number: string;
  customer_name: string;
  customer_email: string | null;
  customer_address: string | null;
  customer_siren: string | null;
  customer_tax_id?: string | null;
  customer_rccm?: string | null;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  vat_total: number;
  total: number;
  currency: string;
  notes: string | null;
  paid_at: string | null;
  is_quote: boolean;
  reminder_count: number;
  last_reminder_at: string | null;
  payment_method?: string | null;
  normalization_status?: InvoiceNormalizationStatus | null;
  normalized_at?: string | null;
  verification_code?: string | null;
  device_id?: string | null;
  other_taxes_amount?: number | null;
  non_taxable_amount?: number | null;
  normalized_qr_payload?: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  catalog_item_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  created_at: string;
}

export type DeclarationType =
  | 'tva'
  | 'liasse_2035'
  | 'liasse_2033'
  | 'liasse_2065'
  | 'urssaf'
  | 'das2'
  | 'cfe'
  | '2042_c_pro';

export type DeclarationStatus = 'draft' | 'ready' | 'submitted' | 'paid' | 'archived';

export interface Declaration {
  id: string;
  user_id: string;
  type: DeclarationType;
  period_label: string;
  period_start: string | null;
  period_end: string | null;
  amount: number;
  status: DeclarationStatus;
  due_date: string | null;
  submitted_at: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
}

export type TaskKind = 'categorize' | 'attach_receipt' | 'declare' | 'remind' | 'review';

export interface AccountingTask {
  id: string;
  user_id: string;
  kind: TaskKind;
  title: string;
  description: string | null;
  due_date: string | null;
  done: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type TeamRole = 'owner' | 'accountant' | 'viewer';
export type TeamStatus = 'pending' | 'active' | 'revoked';

export interface TeamMember {
  id: string;
  owner_id: string;
  member_id: string | null;
  role: TeamRole;
  invited_email: string;
  status: TeamStatus;
  created_at: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  last_used_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  created_at: string;
}
