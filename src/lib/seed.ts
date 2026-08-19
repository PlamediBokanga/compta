import { supabase } from './supabase';
import type { Category } from './types';

const defaultCategories: Omit<Category, 'id' | 'user_id' | 'created_at'>[] = [
  { label: 'Ventes de biens', kind: 'income', vat_rate: 16, color: 'brand', keywords: ['vente', 'recette', 'encaissement'] },
  { label: 'Prestations de services', kind: 'income', vat_rate: 16, color: 'brand', keywords: ['prestation', 'honoraires', 'mission'] },
  { label: 'Achats de marchandises', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['achat', 'marchandise', 'stock'] },
  { label: 'Fournitures de bureau', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['fourniture', 'bureau', 'papeterie'] },
  { label: 'Logiciels & abonnements', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['logiciel', 'saas', 'abonnement', 'subscription'] },
  { label: 'Telecommunications', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['telecom', 'internet', 'forfait', 'airtel', 'orange', 'vodacom', 'africell'] },
  { label: 'Frais de repas', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['repas', 'restaurant', 'dejeuner'] },
  { label: 'Transport & deplacements', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['transport', 'train', 'avion', 'taxi', 'uber'] },
  { label: 'Carburant', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['carburant', 'essence', 'total', 'shell'] },
  { label: 'Loyer & charges', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['loyer', 'charge', 'bail'] },
  { label: 'Assurances', kind: 'expense', vat_rate: 0, color: 'accent', keywords: ['assurance', 'mutuelle', 'prevoyance'] },
  { label: 'Honoraires externes', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['avocat', 'expert', 'comptable', 'consultant'] },
  { label: 'Banque & frais', kind: 'expense', vat_rate: 0, color: 'accent', keywords: ['frais bancaire', 'commission', 'agios', 'rawbank', 'equity', 'bcdc'] },
  { label: 'Salaires & cotisations', kind: 'expense', vat_rate: 0, color: 'accent', keywords: ['salaire', 'remuneration', 'cotisation', 'cnss', 'inpp', 'onem'] },
  { label: 'Impots & taxes', kind: 'expense', vat_rate: 0, color: 'accent', keywords: ['impot', 'taxe', 'ipr', 'iere', 'ibp', 'patente', 'tva', 'dgi'] },
  { label: 'Materiel & equipement', kind: 'expense', vat_rate: 16, color: 'accent', keywords: ['materiel', 'ordinateur', 'equipement', 'apple', 'dell'] },
];

export async function seedCategories(userId: string) {
  const rows = defaultCategories.map((c) => ({ ...c, user_id: userId }));
  const { error } = await supabase.from('categories').insert(rows);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('seed categories failed', error.message);
  }
}
