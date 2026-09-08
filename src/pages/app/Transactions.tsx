import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useCategories, useTransactions } from '../../lib/hooks';
import { computeVat, suggestCategory } from '../../lib/categorize';
import { insertTransactions, updateTransaction } from '../../lib/api';
import { generateDemoTransactions } from '../../lib/demo-data';
import { parseCsv } from '../../lib/csv';
import { fmtDate, fmtCDF } from '../../lib/format';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import type { CategorizationState, Direction, Transaction } from '../../lib/types';

const stateLabel: Record<CategorizationState, string> = {
  auto: 'Auto',
  suggested: 'Suggere',
  manual: 'Manuel',
  uncategorized: 'A categoriser',
};

const stateTone: Record<CategorizationState, 'brand' | 'warning' | 'neutral' | 'accent'> = {
  auto: 'brand',
  suggested: 'warning',
  manual: 'neutral',
  uncategorized: 'accent',
};

type GuidedOperationKind =
  | 'overdraft_credit'
  | 'overdraft_fee'
  | 'subsidy_operating_award'
  | 'subsidy_operating_collection'
  | 'subsidy_balance_award'
  | 'subsidy_balance_collection'
  | 'investment_advance_payment'
  | 'investment_invoice_current_received'
  | 'investment_invoice_noncurrent_received'
  | 'investment_invoice_payment_current'
  | 'investment_invoice_payment_noncurrent'
  | 'software_internal_purchase'
  | 'investment_subsidy_award'
  | 'investment_subsidy_capitalization'
  | 'investment_subsidy_hao'
  | 'selfproduced_asset_in_progress'
  | 'selfproduced_asset_complete'
  | 'selfproduced_software_in_progress'
  | 'selfproduced_software_complete'
  | 'investment_purchase'
  | 'investment_disposal'
  | 'asset_amortization'
  | 'software_amortization'
  | 'declining_amortization'
  | 'exceptional_amortization'
  | 'derogatory_amortization'
  | 'derogatory_reversal'
  | 'decomposed_amortization'
  | 'asset_impairment'
  | 'asset_impairment_reversal'
  | 'asset_disposal_nbv'
  | 'treasury_equity_acquisition'
  | 'treasury_equity_additional_release'
  | 'treasury_bond_acquisition_immobilized'
  | 'treasury_bond_acquisition_placement'
  | 'treasury_security_acquisition_fees'
  | 'treasury_dividend_income'
  | 'treasury_coupon_immobilized'
  | 'treasury_coupon_placement'
  | 'treasury_placement_subscription'
  | 'treasury_placement_interest'
  | 'treasury_placement_redemption'
  | 'treasury_placement_sale_gain'
  | 'treasury_placement_sale_loss'
  | 'treasury_investment_sale_gain'
  | 'treasury_investment_sale_loss'
  | 'treasury_security_impairment'
  | 'treasury_security_impairment_reversal'
  | 'term_deposit_opening'
  | 'term_deposit_interest'
  | 'term_deposit_closing'
  | 'subsidiary_advance_disbursement'
  | 'subsidiary_advance_interest'
  | 'subsidiary_advance_repayment'
  | 'customer_fx_loss_closing'
  | 'customer_fx_gain_closing'
  | 'supplier_fx_loss_closing'
  | 'supplier_fx_gain_closing'
  | 'stock_opening_cancel'
  | 'stock_closing_recognition'
  | 'doubtful_customer_transfer'
  | 'doubtful_customer_impairment'
  | 'doubtful_customer_reversal'
  | 'bad_debt_writeoff'
  | 'inventory_depreciation'
  | 'inventory_depreciation_reversal'
  | 'operating_provision_charge'
  | 'operating_provision_reversal'
  | 'prepaid_expense'
  | 'accrued_expense'
  | 'accrued_income'
  | 'deferred_income'
  | 'profit_allocation_reserve'
  | 'dividends_declared'
  | 'dividend_payment'
  | 'loan_receipt'
  | 'loan_principal_repayment'
  | 'loan_interest_payment'
  | 'loan_accrued_interest'
  | 'loan_installment_payment'
  | 'lease_security_deposit'
  | 'lease_contract_signature'
  | 'lease_rent_payment'
  | 'lease_option_exercise'
  | 'lease_asset_amortization'
  | 'investment_grant_award'
  | 'investment_grant_collection'
  | 'investment_grant_asset_purchase'
  | 'capital_contribution_cash'
  | 'capital_contribution_in_kind'
  | 'capital_call'
  | 'capital_call_payment'
  | 'capital_unpaid_call'
  | 'capital_increase'
  | 'capital_debt_conversion'
  | 'capital_reserve_incorporation'
  | 'capital_reduction'
  | 'capital_reduction_payment'
  | 'capital_formation_fees'
  | 'external_contribution'
  | 'vat_liquidation_payable'
  | 'vat_liquidation_credit'
  | 'vat_payment'
  | 'ibp_accrual'
  | 'ibp_advance_payment'
  | 'ibp_settlement'
  | 'dgi_tax_payment'
  | 'payroll_advance'
  | 'payroll_garnishment'
  | 'payroll_loan'
  | 'payroll_gross'
  | 'payroll_withholding'
  | 'payroll_ipr'
  | 'payroll_social_employee'
  | 'payroll_social_employer'
  | 'payroll_net_payment'
  | 'payroll_external_staff'
  | 'payroll_social_payment'
  | 'payroll_bonus'
  | 'payroll_benefit';

type TreasuryLabel = 'Banque locale (CDF)' | 'Banque en devises (USD)' | 'Caisse' | 'Mobile Money';

const TREASURY_OPTIONS: TreasuryLabel[] = ['Banque locale (CDF)', 'Banque en devises (USD)', 'Caisse', 'Mobile Money'];

const GUIDED_OPERATION_CONFIG: Array<{
  kind: GuidedOperationKind;
  label: string;
  description: string;
  direction: Direction;
  reconciliated: boolean;
  treasuryLabel: TreasuryLabel;
  defaultVatRate: number;
}> = [
  { kind: 'overdraft_credit', label: 'Decouvert bancaire recu', description: 'Constater une mise a disposition de tresorerie court terme par la banque.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'overdraft_fee', label: 'Agios et commissions de decouvert', description: 'Comptabiliser les prelevements bancaires lies au decouvert.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'subsidy_operating_award', label: 'Attribution subvention exploitation', description: 'Constater la subvention d exploitation a recevoir.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'subsidy_operating_collection', label: 'Encaissement subvention exploitation', description: 'Enregistrer l encaissement de la subvention d exploitation.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'subsidy_balance_award', label: 'Attribution subvention d equilibre', description: 'Constater la subvention d equilibre a recevoir.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'subsidy_balance_collection', label: 'Encaissement subvention d equilibre', description: 'Enregistrer l encaissement de la subvention d equilibre.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_advance_payment', label: 'Acompte sur immobilisation', description: 'Verser une avance ou un acompte sur une immobilisation incorporelle ou corporelle.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_invoice_current_received', label: 'Facture immobilisation courante', description: 'Reception d une facture d acquisition courante d immobilisation.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 16 },
  { kind: 'investment_invoice_noncurrent_received', label: 'Facture immobilisation non courante', description: 'Reception d une facture d acquisition non courante d immobilisation.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 16 },
  { kind: 'investment_invoice_payment_current', label: 'Reglement facture immobilisation courante', description: 'Regler une dette fournisseur sur acquisition courante d immobilisation.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_invoice_payment_noncurrent', label: 'Reglement facture immobilisation non courante', description: 'Regler une dette fournisseur d investissement non courant.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'software_internal_purchase', label: 'Logiciel acquis usage interne', description: 'Entrer un logiciel autonome acquis pour usage interne.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_subsidy_award', label: 'Attribution subvention d investissement', description: 'Constater une subvention d investissement a recevoir.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_subsidy_capitalization', label: 'Subvention d investissement significative', description: 'Rattacher une subvention significative a l immobilisation concernee.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_subsidy_hao', label: 'Produit HAO sur immobilisation gratuite', description: 'Constater un produit HAO lorsque la valeur n est pas significative.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'selfproduced_asset_in_progress', label: 'Immobilisation corporelle en cours', description: 'Constater une immobilisation corporelle non achevee a la cloture.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'selfproduced_asset_complete', label: 'Production immobilisee corporelle', description: 'Constater une immobilisation corporelle produite par l entite pour elle-meme.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 16 },
  { kind: 'selfproduced_software_in_progress', label: 'Logiciel cree en cours', description: 'Constater un logiciel produit par l entite et non acheve a la cloture.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'selfproduced_software_complete', label: 'Logiciel cree acheve', description: 'Constater un logiciel produit par l entite pour elle-meme.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 16 },
  { kind: 'investment_purchase', label: 'Acquisition d immobilisation', description: 'Saisir un investissement ou achat d immobilisation.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 16 },
  { kind: 'investment_disposal', label: 'Cession d immobilisation', description: 'Enregistrer le produit de cession d une immobilisation.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'asset_amortization', label: 'Amortissement comptable immobilisation', description: 'Constater la dotation aux amortissements d une immobilisation corporelle.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'software_amortization', label: 'Amortissement logiciel', description: 'Constater la dotation aux amortissements d un logiciel.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'declining_amortization', label: 'Amortissement degressif fiscal', description: 'Constater une annuite d amortissement degressif.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'exceptional_amortization', label: 'Amortissement exceptionnel', description: 'Constater un amortissement exceptionnel selon les conditions fiscales.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'derogatory_amortization', label: 'Dotation derogatoire', description: 'Constater la dotation aux provisions reglementees liee a l amortissement derogatoire.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'derogatory_reversal', label: 'Reprise derogatoire', description: 'Constater la reprise de provision reglementee.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'decomposed_amortization', label: 'Amortissement immobilisation decompos�e', description: 'Constater l amortissement d une structure et de son composant.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'asset_impairment', label: 'Depreciation d immobilisation', description: 'Constater une depreciation d immobilisation corporelle ou incorporelle.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'asset_impairment_reversal', label: 'Reprise de depreciation', description: 'Constater la reprise ulterieure d une depreciation d immobilisation.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'asset_disposal_nbv', label: 'VNC de cession d immobilisation', description: 'Sortir la valeur nette comptable lors de la cession courante d immobilisation.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_equity_acquisition', label: 'Acquisition d actions', description: 'Constater l acquisition de titres ou actions.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_equity_additional_release', label: 'Liberation ulterieure de titres', description: 'Enregistrer les versements restants a effectuer sur titres.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_bond_acquisition_immobilized', label: 'Acquisition d obligations immobilisees', description: 'Constater l acquisition d obligations en titres immobilises.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_bond_acquisition_placement', label: 'Acquisition d obligations de placement', description: 'Constater l acquisition d obligations en titres de placement.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_security_acquisition_fees', label: 'Frais d acquisition sur titres', description: 'Comptabiliser les frais sur achat de titres.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 16 },
  { kind: 'treasury_dividend_income', label: 'Revenus sur titres', description: 'Constater les dividendes ou revenus sur titres.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_coupon_immobilized', label: 'Coupons sur obligations immobilisees', description: 'Constater l encaissement des interets sur obligations immobilisees.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_coupon_placement', label: 'Coupons sur titres de placement', description: 'Constater l encaissement des interets sur titres de placement.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_placement_subscription', label: 'Souscription de placement', description: 'Constater une mise en placement ou un titre de placement.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_placement_interest', label: 'Produit de placement', description: 'Enregistrer les interets ou produits financiers recus sur placement.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_placement_redemption', label: 'Remboursement de placement', description: 'Constater le remboursement ou rachat du placement.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_placement_sale_gain', label: 'Plus-value sur titres de placement', description: 'Constater le gain de cession sur titres de placement.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_placement_sale_loss', label: 'Moins-value sur titres de placement', description: 'Constater la perte de cession sur titres de placement.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_investment_sale_gain', label: 'Plus-value sur titres immobilises', description: 'Constater le gain de cession sur titres immobilises.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_investment_sale_loss', label: 'Moins-value sur titres immobilises', description: 'Constater la perte de cession sur titres immobilises.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_security_impairment', label: 'Depreciation sur titres', description: 'Constater une depreciation de portefeuille a la cloture.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'treasury_security_impairment_reversal', label: 'Reprise de depreciation sur titres', description: 'Constater une reprise ulterieure de depreciation sur titres.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'term_deposit_opening', label: 'Ouverture compte a terme', description: 'Constater l ouverture d un depot a terme.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'term_deposit_interest', label: 'Interets sur compte a terme', description: 'Constater les interets encaisses sur compte a terme.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'term_deposit_closing', label: 'Cloture compte a terme', description: 'Constater le solde du depot a terme a l echeance.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'subsidiary_advance_disbursement', label: 'Avance a la filiale', description: 'Constater une avance accordee a une filiale.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'subsidiary_advance_interest', label: 'Interets sur avance a la filiale', description: 'Constater les interets encaisses sur avance a la filiale.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'subsidiary_advance_repayment', label: 'Remboursement avance a la filiale', description: 'Constater le remboursement de l avance par la filiale.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'customer_fx_loss_closing', label: 'Perte latente client en devise', description: 'Constater un ecart de conversion actif sur une creance client a la cloture.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'customer_fx_gain_closing', label: 'Gain latent client en devise', description: 'Constater un ecart de conversion passif sur une creance client a la cloture.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'supplier_fx_loss_closing', label: 'Perte latente fournisseur en devise', description: 'Constater un ecart de conversion actif sur une dette fournisseur a la cloture.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'supplier_fx_gain_closing', label: 'Gain latent fournisseur en devise', description: 'Constater un ecart de conversion passif sur une dette fournisseur a la cloture.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'stock_opening_cancel', label: 'Annulation stock initial', description: 'Constater l annulation des stocks initiaux en inventaire intermittent.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'stock_closing_recognition', label: 'Constatation stock final', description: 'Constater les stocks finaux a la cloture.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'doubtful_customer_transfer', label: 'Transfert client douteux', description: 'Reclasser une creance client en compte client douteux.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'doubtful_customer_impairment', label: 'Provision client douteux', description: 'Constater une depreciation sur creance douteuse.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'doubtful_customer_reversal', label: 'Reprise client douteux', description: 'Constater une reprise de depreciation sur creance douteuse.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'bad_debt_writeoff', label: 'Creance irrecouvrable', description: 'Passer en perte une creance devenue irrecouvrable.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'inventory_depreciation', label: 'Depreciation de stocks', description: 'Constater une depreciation de stocks ou actifs circulants.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'inventory_depreciation_reversal', label: 'Reprise depreciation stocks', description: 'Constater la reprise d une depreciation de stocks.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'operating_provision_charge', label: 'Dotation provision risques', description: 'Constater une dotation aux provisions pour risques et charges.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'operating_provision_reversal', label: 'Reprise provision risques', description: 'Constater la reprise d une provision pour risques et charges.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'prepaid_expense', label: 'Charge constatee d avance', description: 'Reclasser une charge constatee d avance a la cloture.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'accrued_expense', label: 'Charge a payer', description: 'Constater une charge a payer a la cloture.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'accrued_income', label: 'Produit a recevoir', description: 'Constater un produit a recevoir a la cloture.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'deferred_income', label: 'Produit constate d avance', description: 'Reclasser un produit constate d avance a la cloture.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'profit_allocation_reserve', label: 'Affectation en reserve', description: 'Affecter une partie du resultat en reserve.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'dividends_declared', label: 'Dividendes declares', description: 'Constater la part du resultat affectee aux dividendes.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'dividend_payment', label: 'Paiement des dividendes', description: 'Regler les dividendes aux associes.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'loan_receipt', label: 'Reception d un emprunt', description: 'Constater la mise a disposition d un emprunt a moyen ou long terme.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'loan_principal_repayment', label: 'Remboursement du principal', description: 'Rembourser le principal d un emprunt.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'loan_interest_payment', label: 'Paiement des interets d emprunt', description: 'Comptabiliser les interets verses sur un emprunt.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'loan_accrued_interest', label: 'Interets courus non echus emprunt', description: 'Constater les interets courus a la cloture.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'loan_installment_payment', label: 'Paiement d une annuite', description: 'Enregistrer une echeance comprenant principal et interets.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'lease_security_deposit', label: 'Depot de garantie credit bail', description: 'Verser le depot de garantie lie a un contrat de credit-bail.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'lease_contract_signature', label: 'Signature contrat credit bail', description: 'Constater la dette de location-acquisition a la signature du contrat.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'lease_rent_payment', label: 'Paiement redevance credit bail', description: 'Regler une redevance ou un loyer de credit-bail.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'lease_option_exercise', label: 'Levee option credit bail', description: 'Constater la levee de l option et l acquisition du bien.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'lease_asset_amortization', label: 'Amortissement bien credit bail', description: 'Constater l amortissement du bien acquis par credit-bail.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_grant_award', label: 'Attribution subvention investissement', description: 'Constater une subvention d investissement a recevoir.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_grant_collection', label: 'Encaissement subvention investissement', description: 'Enregistrer l encaissement de la subvention d investissement.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'investment_grant_asset_purchase', label: 'Achat du bien subventionne', description: 'Enregistrer l acquisition du bien finance par une subvention.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 16 },
  { kind: 'capital_contribution_cash', label: 'Apport en numeraire', description: 'Enregistrer un apport en numeraire au capital.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_contribution_in_kind', label: 'Apport en nature', description: 'Enregistrer un apport en nature au capital.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_call', label: 'Appel du capital', description: 'Constater l appel d une fraction du capital souscrit.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_call_payment', label: 'Liberation du capital appele', description: 'Enregistrer le versement du capital appele.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_unpaid_call', label: 'Capital appele non verse', description: 'Constater la fraction de capital appelee restant a verser.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_increase', label: 'Augmentation de capital', description: 'Constater une augmentation de capital.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_debt_conversion', label: 'Conversion de dette en capital', description: 'Convertir une dette en actions ou parts sociales.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_reserve_incorporation', label: 'Incorporation de reserves', description: 'Incorporer des reserves au capital social.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_reduction', label: 'Reduction de capital', description: 'Constater une reduction du capital social.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_reduction_payment', label: 'Remboursement reduction capital', description: 'Regler le remboursement lie a une reduction de capital.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'capital_formation_fees', label: 'Frais de constitution', description: 'Enregistrer les frais de constitution ou d augmentation de capital.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'external_contribution', label: 'Apport externe', description: 'Enregistrer un apport externe au financement de l entreprise.', direction: 'in', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'vat_liquidation_payable', label: 'Liquidation TVA a payer', description: 'Centraliser la TVA collectee et deductible pour faire ressortir la TVA due.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'vat_liquidation_credit', label: 'Liquidation TVA credit', description: 'Constater un credit de TVA a reporter.', direction: 'in', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'vat_payment', label: 'Paiement TVA DGI', description: 'Regler la TVA due a la DGI.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'ibp_accrual', label: 'Constatation IBP', description: 'Constater l impot sur les benefices a payer.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'ibp_advance_payment', label: 'Acompte IBP', description: 'Enregistrer un acompte verse a la DGI au titre de l IBP.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'ibp_settlement', label: 'Solde IBP DGI', description: 'Regler le solde de l impot sur les benefices.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'dgi_tax_payment', label: 'Paiement autre impot DGI', description: 'Regler une dette fiscale aupres de la DGI.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_advance', label: 'Avance au personnel', description: 'Verser une avance sur salaire au personnel.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_garnishment', label: 'Opposition sur salaire', description: 'Constater une retenue ou opposition sur salaire.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_loan', label: 'Pret au personnel', description: 'Accorder un pret au personnel.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_gross', label: 'Salaire brut', description: 'Constater la remuneration brute du personnel.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_withholding', label: 'Retenues salariales', description: 'Constater les retenues sur remuneration.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_ipr', label: 'IPR retenu', description: 'Constater l IPR retenu sur les salaires pour declaration DGI.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_social_employee', label: 'CNSS part salariale', description: 'Constater la retenue CNSS salariale.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_social_employer', label: 'Charges sociales patronales', description: 'Constater les charges patronales CNSS, INPP et ONEM.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_net_payment', label: 'Paiement salaire net', description: 'Regler le salaire net au personnel.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_external_staff', label: 'Remuneration personnel exterieur', description: 'Constater une remuneration de personnel exterieur.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_social_payment', label: 'Paiement cotisations sociales', description: 'Regler CNSS, INPP et ONEM.', direction: 'out', reconciliated: true, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_bonus', label: 'Prime et gratification', description: 'Constater une prime ou gratification au personnel.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
  { kind: 'payroll_benefit', label: 'Avantage en nature', description: 'Constater un avantage en nature attribue au personnel.', direction: 'out', reconciliated: false, treasuryLabel: 'Banque locale (CDF)', defaultVatRate: 0 },
];

const getGuidedOperationConfig = (kind: GuidedOperationKind) => GUIDED_OPERATION_CONFIG.find((item) => item.kind === kind) || GUIDED_OPERATION_CONFIG[0];

export function TransactionsPage() {
  const { user } = useAuth();
  const { items: transactions, loading, reload } = useTransactions();
  const { items: categories } = useCategories();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<Direction | 'all'>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [reconciliationFilter, setReconciliationFilter] = useState<'all' | 'reconciled' | 'pending'>('all');
  const [importing, setImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 25;

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      if (dirFilter !== 'all' && transaction.direction !== dirFilter) return false;
      if (catFilter === 'uncategorized' && transaction.category_id) return false;
      if (catFilter !== 'all' && catFilter !== 'uncategorized' && transaction.category_id !== catFilter) return false;
      if (reconciliationFilter === 'reconciled' && !transaction.reconciliated) return false;
      if (reconciliationFilter === 'pending' && transaction.reconciliated) return false;
      if (search && !transaction.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, search, dirFilter, catFilter, reconciliationFilter]);

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const transaction of filtered) {
      if (transaction.direction === 'in') income += Number(transaction.amount);
      else expenses += Number(transaction.amount);
    }
    return { income, expenses };
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => setPage(1), [search, dirFilter, catFilter, reconciliationFilter]);

  const runImport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const rows = generateDemoTransactions(user.id);
      const enriched = rows.map((row) => {
        const { category, state } = suggestCategory(row, categories);
        const vatRate = category?.vat_rate ?? 0;
        return {
          ...row,
          category_id: category?.id ?? null,
          categorization_state: state,
          vat_rate: vatRate,
          vat_amount: computeVat(Number(row.amount), vatRate),
        };
      });
      await insertTransactions(enriched);
      reload();
      toast({ kind: 'success', message: `${enriched.length} transactions importees et categorisees.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Import echoue' });
    } finally {
      setImporting(false);
    }
  };

  const handleCsvImport = async (file: File | undefined) => {
    if (!file || !user) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast({ kind: 'error', message: 'Aucune transaction valide trouvee dans le CSV.' });
        return;
      }
      const enriched = parsed.map((row) => {
        const { category, state } = suggestCategory(row, categories);
        const vatRate = category?.vat_rate ?? 0;
        return {
          user_id: user.id,
          date: row.date,
          label: row.label,
          amount: row.amount,
          direction: row.direction,
          category_id: category?.id ?? null,
          categorization_state: state,
          vat_rate: vatRate,
          vat_amount: computeVat(row.amount, vatRate),
          bank_account_label: 'Import CSV',
        };
      });
      await insertTransactions(enriched);
      reload();
      toast({ kind: 'success', message: `${enriched.length} transactions importees depuis le CSV.` });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Import CSV echoue' });
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const categorize = async (transaction: Transaction, categoryId: string | null) => {
    const category = categories.find((item) => item.id === categoryId);
    const vatRate = category?.vat_rate ?? 0;
    const vatAmount = computeVat(Number(transaction.amount), vatRate);
    await updateTransaction(transaction.id, {
      category_id: categoryId,
      categorization_state: categoryId ? 'manual' : 'uncategorized',
      vat_rate: vatRate,
      vat_amount: vatAmount,
    });
    reload();
  };

  const toggleReconciliation = async (transaction: Transaction) => {
    try {
      await updateTransaction(transaction.id, { reconciliated: !transaction.reconciliated });
      reload();
      toast({ kind: 'success', message: transaction.reconciliated ? 'Mouvement remis a controler.' : 'Mouvement marque comme rapproche.' });
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Mise a jour impossible.' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Banque et tresorerie</h1>
          <p className="mt-1 text-sm text-ink-500">
            {transactions.length} transactions | {transactions.filter((transaction) => !transaction.category_id).length} a categoriser
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={runImport} disabled={importing} className="btn-secondary">
            {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
            {importing ? 'Import...' : 'Importer des mouvements bancaires'}
          </button>
          <button onClick={() => csvInputRef.current?.click()} disabled={importing} className="btn-secondary">
            <FileSpreadsheet size={16} /> Import CSV
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleCsvImport(e.target.files?.[0])}
          />
          <button onClick={() => setGuidedOpen(true)} className="btn-secondary">
            <Plus size={16} /> Operations avancees
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-primary">
            <Plus size={16} /> Transaction
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Rechercher une transaction..."
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={16} className="text-ink-400" />
            <div className="flex rounded-lg bg-ink-100 p-1">
              {(['all', 'in', 'out'] as const).map((direction) => (
                <button
                  key={direction}
                  onClick={() => setDirFilter(direction)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    dirFilter === direction ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-600'
                  }`}
                >
                  {direction === 'all' ? 'Tous' : direction === 'in' ? 'Entrees' : 'Sorties'}
                </button>
              ))}
            </div>
          </div>
          <select value={reconciliationFilter} onChange={(e) => { setReconciliationFilter(e.target.value as typeof reconciliationFilter); setPage(1); }} className="input w-auto">
            <option value="all">Tous les rapprochements</option>
            <option value="pending">A rapprocher</option>
            <option value="reconciled">Rapproches</option>
          </select>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input w-auto">
            <option value="all">Toutes categories</option>
            <option value="uncategorized">Non categorisees</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-success-700">
            <ArrowUpRight size={14} /> {fmtCDF(totals.income)}
          </span>
          <span className="flex items-center gap-1.5 text-danger-700">
            <ArrowDownRight size={14} /> {fmtCDF(totals.expenses)}
          </span>
          <span className="ml-auto text-ink-500">{filtered.length} resultat(s)</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Libelle</th>
                <th className="px-4 py-3 font-semibold text-right">Montant</th>
                <th className="px-4 py-3 font-semibold text-right">Etat</th>
                <th className="px-4 py-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading && Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={5} className="px-4 py-3"><div className="skeleton h-10" /></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-500">
                    Aucune transaction. Utilisez l import de mouvements ou le CSV pour commencer.
                  </td>
                </tr>
              )}
              {!loading && paged.map((transaction) => {
                const expanded = expandedTransactionId === transaction.id;
                return (
                  <Fragment key={transaction.id}>
                    <tr className="group transition hover:bg-ink-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-600">{fmtDate(transaction.date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={transaction.direction === 'in' ? 'grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success-50 text-success-600' : 'grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-danger-50 text-danger-600'}>
                            {transaction.direction === 'in' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          </div>
                          <span className="max-w-[28rem] truncate font-medium text-ink-900">{transaction.label}</span>
                        </div>
                      </td>
                      <td className={transaction.direction === 'in' ? 'px-4 py-3 text-right font-semibold text-success-700' : 'px-4 py-3 text-right font-semibold text-ink-900'}>
                        {transaction.direction === 'in' ? '+' : '-'}{fmtCDF(transaction.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Badge tone={stateTone[transaction.categorization_state]}>
                            {transaction.categorization_state === 'auto' && <Sparkles size={12} />}
                            {stateLabel[transaction.categorization_state]}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => toggleReconciliation(transaction)}
                            title={transaction.reconciliated ? 'Remettre a controler' : 'Marquer comme rapproche'}
                          >
                            <Badge tone={transaction.reconciliated ? 'success' : 'warning'}>
                              {transaction.reconciliated ? 'Rapproche' : 'A rapprocher'}
                            </Badge>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedTransactionId(expanded ? null : transaction.id)}
                          className="inline-flex items-center gap-1 rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
                          aria-label={expanded ? 'Masquer les details' : 'Afficher les details'}
                          title={expanded ? 'Masquer les details' : 'Afficher les details'}
                        >
                          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-ink-50/70">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                            <div>
                              <label className="label">Categorie</label>
                              <select
                                value={transaction.category_id ?? ''}
                                onChange={(e) => categorize(transaction, e.target.value || null)}
                                className="input"
                              >
                                <option value="">A categoriser</option>
                                {categories
                                  .filter((category) => category.kind === (transaction.direction === 'in' ? 'income' : 'expense'))
                                  .map((category) => (
                                    <option key={category.id} value={category.id}>{category.label}</option>
                                  ))}
                              </select>
                            </div>
                            <div>
                              <p className="label">TVA suivie</p>
                              <p className="text-sm font-semibold text-ink-900">{Number(transaction.vat_amount) > 0 ? fmtCDF(transaction.vat_amount) : '-'}</p>
                            </div>
                            <div>
                              <p className="label">Compte</p>
                              <p className="text-sm font-semibold text-ink-900">{transaction.bank_account_label || 'Non renseigne'}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      <GuidedOperationsModal
        open={guidedOpen}
        onClose={() => setGuidedOpen(false)}
        onSaved={() => { reload(); setGuidedOpen(false); }}
      />
      <AddTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={categories}
        onSaved={() => { reload(); setAddOpen(false); }}
      />
    </div>
  );
}

function GuidedOperationsModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<GuidedOperationKind>('overdraft_credit');
  const [label, setLabel] = useState(getGuidedOperationConfig('overdraft_credit').label);
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState(String(getGuidedOperationConfig('overdraft_credit').defaultVatRate));
  const [treasuryLabel, setTreasuryLabel] = useState<TreasuryLabel>(getGuidedOperationConfig('overdraft_credit').treasuryLabel);

  useEffect(() => {
    const config = getGuidedOperationConfig(kind);
    setLabel(config.label);
    setVatRate(String(config.defaultVatRate));
    setTreasuryLabel(config.treasuryLabel);
  }, [kind]);

  const save = async () => {
    if (!user) return;
    const numericAmount = Number(amount);
    const numericVatRate = Number(vatRate || 0);
    if (!label.trim() || !amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast({ kind: 'error', message: 'Libelle et montant valides requis.' });
      return;
    }

    const config = getGuidedOperationConfig(kind);
    try {
      await insertTransactions([
        {
          user_id: user.id,
          date,
          label: label.trim(),
          amount: numericAmount,
          direction: config.direction,
          category_id: null,
          categorization_state: 'manual',
          vat_rate: numericVatRate,
          vat_amount: computeVat(numericAmount, numericVatRate),
          bank_account_label: config.reconciliated ? treasuryLabel : null,
          reconciliated: config.reconciliated,
          document_id: null,
          raw: {
            accounting_event: kind,
            guided_operation_kind: kind,
            treasury_label: treasuryLabel,
            source: 'transactions_module',
          },
        },
      ]);
      toast({ kind: 'success', message: 'Operation guidee enregistree.' });
      setAmount('');
      onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  const current = getGuidedOperationConfig(kind);
  const investmentMode = ['investment_purchase', 'investment_invoice_current_received', 'investment_invoice_noncurrent_received', 'selfproduced_asset_complete', 'selfproduced_software_complete'].includes(kind);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Operations avancees"
      footer={<><button onClick={onClose} className="btn-ghost">Annuler</button><button onClick={save} className="btn-primary"><Check size={16} /> Enregistrer</button></>}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">Point 2 et point 3</p>
          <p className="mt-1">Utilisez ces operations pour le decouvert, les subventions et les investissements sans passer par une facture.</p>
        </div>
        <div>
          <label className="label">Operation</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as GuidedOperationKind)} className="input">
            {GUIDED_OPERATION_CONFIG.map((item) => <option key={item.kind} value={item.kind}>{item.label}</option>)}
          </select>
          <p className="mt-1 text-xs text-ink-500">{current.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Montant TTC</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="0,00" />
          </div>
        </div>
        <div>
          <label className="label">Libelle</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Compte de tresorerie</label>
            <select value={treasuryLabel} onChange={(e) => setTreasuryLabel(e.target.value as TreasuryLabel)} className="input" disabled={!current.reconciliated}>
              {TREASURY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Taux de TVA</label>
            <input type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} className="input" disabled={!investmentMode} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AddTransactionModal({
  open,
  onClose,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: import('../../lib/types').Category[];
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<Direction>('out');
  const [categoryId, setCategoryId] = useState('');

  const reset = () => {
    setLabel('');
    setAmount('');
    setCategoryId('');
    setDirection('out');
  };

  const save = async () => {
    if (!user) return;
    if (!label.trim() || !amount) {
      toast({ kind: 'error', message: 'Libelle et montant requis.' });
      return;
    }
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) {
      toast({ kind: 'error', message: 'Montant invalide.' });
      return;
    }
    const category = categories.find((item) => item.id === categoryId) || null;
    const vatRate = category?.vat_rate ?? 0;
    try {
      await insertTransactions([
        {
          user_id: user.id,
          date,
          label: label.trim(),
          amount: numericAmount,
          direction,
          category_id: category?.id ?? null,
          categorization_state: category ? 'manual' : 'uncategorized',
          vat_rate: vatRate,
          vat_amount: computeVat(numericAmount, vatRate),
          bank_account_label: 'Saisie manuelle',
        },
      ]);
      toast({ kind: 'success', message: 'Transaction ajoutee.' });
      reset();
      onSaved();
    } catch (error) {
      toast({ kind: 'error', message: error instanceof Error ? error.message : 'Erreur' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter une transaction"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} className="btn-primary">
            <Check size={16} /> Enregistrer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Sens</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection('out')}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${direction === 'out' ? 'border-danger-500 bg-danger-50 text-danger-700' : 'border-ink-200'}`}
              >
                Depense
              </button>
              <button
                onClick={() => setDirection('in')}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${direction === 'in' ? 'border-success-500 bg-success-50 text-success-700' : 'border-ink-200'}`}
              >
                Recette
              </button>
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Libelle</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="input" placeholder="Ex : Achat fournitures" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="0,00" />
          </div>
          <div>
            <label className="label">Categorie</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
              <option value="">- Aucune -</option>
              {categories.filter((category) => category.kind === (direction === 'in' ? 'income' : 'expense')).map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

