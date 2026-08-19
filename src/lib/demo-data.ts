import type { Transaction } from './types';

// Generate realistic demo transactions for the last 6 months
export function generateDemoTransactions(userId: string): Omit<Transaction, 'id' | 'created_at' | 'category_id' | 'categorization_state' | 'vat_amount' | 'vat_rate' | 'reconciliated' | 'document_id' | 'raw'>[] {
  const rows: Array<Omit<Transaction, 'id' | 'created_at' | 'category_id' | 'categorization_state' | 'vat_amount' | 'vat_rate' | 'reconciliated' | 'document_id' | 'raw'>> = [];
  const now = new Date();

  const incomeTemplates = [
    { label: 'Virement Studio Atelier 9 - Prestation design', amount: 2400, direction: 'in' as const },
    { label: 'Virement client - Mission conseil', amount: 1800, direction: 'in' as const },
    { label: 'Virement client - Abonnement mensuel', amount: 650, direction: 'in' as const },
    { label: 'Stripe - Paiement en ligne', amount: 320, direction: 'in' as const },
    { label: 'Virement client - Refacturation frais', amount: 180, direction: 'in' as const },
  ];

  const expenseTemplates = [
    { label: 'Achat materiel informatique - Apple Store', amount: 1290, direction: 'out' as const },
    { label: 'Abonnement Adobe Creative Cloud', amount: 59.99, direction: 'out' as const },
    { label: 'Abonnement Notion', amount: 24, direction: 'out' as const },
    { label: 'Facture Orange Business - Internet', amount: 42.99, direction: 'out' as const },
    { label: 'Course Uber - Deplacement client', amount: 28.5, direction: 'out' as const },
    { label: 'Repas business - Le Bistrot Parisien', amount: 45, direction: 'out' as const },
    { label: 'Carburant - Station Total', amount: 68, direction: 'out' as const },
    { label: 'Fournitures de bureau - Office Depot', amount: 89, direction: 'out' as const },
    { label: 'Cotisation sociale patronale', amount: 410, direction: 'out' as const },
    { label: 'Loyer coworking - WeWork', amount: 380, direction: 'out' as const },
    { label: 'Assurance professionnelle - HISCOX', amount: 120, direction: 'out' as const },
    { label: 'Frais bancaires - Banque commerciale', amount: 14.9, direction: 'out' as const },
    { label: 'Achat marchandises - Fournisseur ABC', amount: 540, direction: 'out' as const },
    { label: 'Logiciel Figma - Abonnement annuel', amount: 144, direction: 'out' as const },
  ];

  for (let i = 0; i < 6; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

    const incomeCount = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < incomeCount; j++) {
      const t = incomeTemplates[Math.floor(Math.random() * incomeTemplates.length)];
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      rows.push({
        user_id: userId,
        date: new Date(month.getFullYear(), month.getMonth(), day).toISOString().slice(0, 10),
        label: t.label,
        amount: t.amount,
        direction: t.direction,
        bank_account_label: 'Compte pro - Banque',
      });
    }

    const expenseCount = 6 + Math.floor(Math.random() * 5);
    for (let j = 0; j < expenseCount; j++) {
      const t = expenseTemplates[Math.floor(Math.random() * expenseTemplates.length)];
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      rows.push({
        user_id: userId,
        date: new Date(month.getFullYear(), month.getMonth(), day).toISOString().slice(0, 10),
        label: t.label,
        amount: t.amount,
        direction: t.direction,
        bank_account_label: 'Compte pro - Banque',
      });
    }
  }

  return rows;
}
