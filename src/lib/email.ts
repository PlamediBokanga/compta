import { supabase } from './supabase';
import type { Invoice, Profile } from './types';
import { fmtDate, fmtMoney } from './format';

export async function sendEmail(to: string, subject: string, html: string, fromName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const session = await supabase.auth.getSession();
    if (session.data.session?.access_token) {
      headers.Authorization = `Bearer ${session.data.session.access_token}`;
    }
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      headers.apikey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, subject, html, from_name: fromName }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `Email failed (${response.status}): ${body}` };
    }

    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function invoiceHtml(invoice: Invoice, profile: Profile | null, isReminder: boolean, reminderCount: number): string {
  const currency = (invoice.currency || 'CDF') as 'CDF' | 'USD';
  const items = (invoice.items ?? [])
    .map(
      (item) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #eceef2;">${item.description}</td>
      <td style="padding:8px;border-bottom:1px solid #eceef2;text-align:right;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eceef2;text-align:right;">${fmtMoney(item.unit_price, currency)}</td>
      <td style="padding:8px;border-bottom:1px solid #eceef2;text-align:right;">${item.vat_rate}%</td>
      <td style="padding:8px;border-bottom:1px solid #eceef2;text-align:right;font-weight:600;">${fmtMoney(item.line_total, currency)}</td>
    </tr>`,
    )
    .join('');

  const reminderBanner = isReminder
    ? `<div style="background:#fff8eb;border:1px solid #ffd988;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;color:#7c3c11;font-weight:600;">Relance n${reminderCount} - Facture ${invoice.number} en attente de paiement</p>
        <p style="margin:4px 0 0;color:#9a4a0d;font-size:14px;">Echeance depassee depuis le ${fmtDate(invoice.due_date)}. Merci de regulariser sous 8 jours.</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;font-family:Inter,system-ui,sans-serif;color:#1f2330;background:#f6f7f9;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(31,35,48,0.06);">
      <div style="background:#0f7155;padding:24px 32px;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">${isReminder ? 'Relance' : invoice.is_quote ? 'Devis' : 'Facture'} ${invoice.number || ''}</h1>
        <p style="margin:4px 0 0;color:#b0eed5;font-size:14px;">${profile?.company_name || 'Mon activite'}</p>
      </div>
      <div style="padding:32px;">
        ${reminderBanner}
        <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
          <div>
            <p style="margin:0;color:#67748d;font-size:12px;text-transform:uppercase;">${invoice.is_quote ? 'Devis pour' : 'Facture a'}</p>
            <p style="margin:4px 0 0;font-weight:600;color:#1f2330;">${invoice.customer_name}</p>
            ${invoice.customer_email ? `<p style="margin:2px 0 0;color:#67748d;font-size:14px;">${invoice.customer_email}</p>` : ''}
            ${invoice.customer_address ? `<p style="margin:2px 0 0;color:#67748d;font-size:14px;">${invoice.customer_address}</p>` : ''}
          </div>
          <div style="text-align:right;">
            <p style="margin:0;color:#67748d;font-size:12px;text-transform:uppercase;">${invoice.is_quote ? 'Validite' : 'Echeance'}</p>
            <p style="margin:4px 0 0;font-weight:600;color:#1f2330;">${fmtDate(invoice.due_date)}</p>
            <p style="margin:4px 0 0;color:#67748d;font-size:12px;text-transform:uppercase;">Devise</p>
            <p style="margin:4px 0 0;font-weight:600;color:#1f2330;">${currency}</p>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f6f7f9;">
              <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#67748d;">Description</th>
              <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase;color:#67748d;">Qte</th>
              <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase;color:#67748d;">Prix unit.</th>
              <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase;color:#67748d;">TVA</th>
              <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase;color:#67748d;">Total</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>
        <div style="margin-top:16px;text-align:right;">
          <p style="margin:4px 0;color:#67748d;">Sous-total HT : <strong>${fmtMoney(invoice.subtotal, currency)}</strong></p>
          <p style="margin:4px 0;color:#67748d;">TVA : <strong>${fmtMoney(invoice.vat_total, currency)}</strong></p>
          <p style="margin:8px 0 0;font-size:20px;font-weight:800;color:#1f2330;">Total TTC : ${fmtMoney(invoice.total, currency)}</p>
        </div>
        ${invoice.notes ? `<div style="margin-top:24px;padding:16px;background:#f6f7f9;border-radius:8px;"><p style="margin:0;font-weight:600;color:#434b5e;">Notes</p><p style="margin:4px 0 0;color:#67748d;font-size:14px;">${invoice.notes}</p></div>` : ''}
        ${profile?.iban ? `<div style="margin-top:24px;padding:16px;background:#eefcf6;border-radius:8px;"><p style="margin:0;font-weight:600;color:#0f7155;">Paiement</p><p style="margin:4px 0 0;color:#0f493a;font-size:14px;font-family:monospace;">IBAN : ${profile.iban}</p>${profile.bic ? `<p style="margin:2px 0 0;color:#0f493a;font-size:14px;font-family:monospace;">BIC : ${profile.bic}</p>` : ''}</div>` : ''}
      </div>
      <div style="padding:16px 32px;background:#f6f7f9;text-align:center;">
        <p style="margin:0;color:#8693ab;font-size:12px;">Facture emise via Tenzo | ${profile?.company_name || 'Mon activite'}${profile?.siren ? ` | SIREN ${profile.siren}` : ''}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendInvoiceEmail(invoice: Invoice, profile: Profile | null): Promise<{ success: boolean; error?: string }> {
  if (!invoice.customer_email) {
    return { success: false, error: 'Aucune adresse e-mail client.' };
  }
  const subject = `${invoice.is_quote ? 'Devis' : 'Facture'} ${invoice.number} - ${profile?.company_name || 'Mon activite'}`;
  const html = invoiceHtml(invoice, profile, false, 0);
  return sendEmail(invoice.customer_email, subject, html, profile?.company_name || 'Tenzo');
}

export async function sendReminderEmail(invoice: Invoice, profile: Profile | null, reminderCount: number): Promise<{ success: boolean; error?: string }> {
  if (!invoice.customer_email) {
    return { success: false, error: 'Aucune adresse e-mail client.' };
  }
  const subject = `Relance n${reminderCount} - Facture ${invoice.number} en attente`;
  const html = invoiceHtml(invoice, profile, true, reminderCount);
  return sendEmail(invoice.customer_email, subject, html, profile?.company_name || 'Tenzo');
}
