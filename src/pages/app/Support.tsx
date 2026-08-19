import { useState } from 'react';
import {
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Send,
  Clock,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';

const faqs = [
  {
    q: 'Comment importer mes transactions bancaires ?',
    a: 'Rendez-vous dans Transactions > Sync banque pour importer automatiquement vos operations, ou utilisez l\'import CSV pour importer un fichier exporte depuis votre banque.',
  },
  {
    q: 'Comment generer une declaration de TVA ?',
    a: 'Dans Declarations > Generer TVA. Le montant est calcule automatiquement a partir de vos transactions categorisees (TVA collectee - TVA deductible).',
  },
  {
    q: 'Comment inviter mon expert-comptable ?',
    a: 'Allez dans Equipe > Inviter un membre, saisissez l\'e-mail de votre comptable et choisissez le role "Expert-comptable". Il aura acces en lecture + export.',
  },
  {
    q: 'Comment fonctionne la categorisation automatique ?',
    a: 'Tenzo analyse le libelle de chaque transaction et la compare aux mots-cles de vos categories. Plus vous categorisez de transactions, plus le systeme devient precis.',
  },
  {
    q: 'Mes donnees sont-elles securisees ?',
    a: 'Toutes les donnees sont chiffrees et hebergees en France (Supabase, RGPD). L\'authentification multi-facteurs (MFA) est disponible dans Reglages > Securite.',
  },
  {
    q: 'Comment exporter mes ecritures comptables ?',
    a: 'Dans Rapports, vous pouvez exporter au format FEC (Fichier des Ecritures Comptables), SIE, ou CSV. Ces formats sont compatibles avec tous les logiciels comptables.',
  },
];

export function SupportPage() {
  const toast = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({ kind: 'error', message: 'Sujet et message requis.' });
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setSubject('');
    setMessage('');
    toast({ kind: 'success', message: 'Message envoye. Notre equipe vous repond sous 24h.' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950">Aide & support</h1>
        <p className="mt-1 text-sm text-ink-500">Ressources, FAQ et contact avec notre equipe.</p>
      </div>

      {/* Contact cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Mail size={20} />
          </div>
          <h2 className="mt-3 font-display text-base font-bold text-ink-900">E-mail</h2>
          <p className="mt-1 text-xs text-ink-500">Reponse sous 24h ouvrees</p>
          <a href="mailto:support@tenzo.fr" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
            support@tenzo.fr <ExternalLink size={12} />
          </a>
        </div>
        <div className="card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-success-50 text-success-700">
            <MessageSquare size={20} />
          </div>
          <h2 className="mt-3 font-display text-base font-bold text-ink-900">Chat en direct</h2>
          <p className="mt-1 text-xs text-ink-500">Lun-Ven, 9h-18h</p>
          <button
            onClick={() => toast({ kind: 'info', message: 'Le chat en direct sera disponible prochainement.' })}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Demarrer une conversation
          </button>
        </div>
        <div className="card p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-50 text-accent-700">
            <Phone size={20} />
          </div>
          <h2 className="mt-3 font-display text-base font-bold text-ink-900">Telephone</h2>
          <p className="mt-1 text-xs text-ink-500">Pour les offres PME</p>
          <a href="tel:+33180000000" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
            01 80 00 00 00
          </a>
        </div>
      </div>

      {/* Contact form */}
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <LifeBuoy size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Contacter l'equipe</h2>
            <p className="text-xs text-ink-500">Decrivez votre probleme, nous vous repondons par e-mail.</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="label">Sujet</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="Ex : Probleme d'import de transactions"
            />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input min-h-[120px]"
              placeholder="Decrivez votre demande en detail..."
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <Clock size={14} /> Reponse sous 24h
            </div>
            <button type="submit" disabled={sending} className="btn-primary">
              {sending ? <Send size={16} className="animate-pulse" /> : <Send size={16} />}
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </form>
      </div>

      {/* FAQ */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-4">
          <BookOpen size={18} className="text-brand-700" />
          <h2 className="font-display text-base font-bold text-ink-900">Questions frequentes</h2>
        </div>
        <div className="divide-y divide-ink-100">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-ink-50/60 transition"
              >
                <span className="text-sm font-medium text-ink-900">{faq.q}</span>
                {openFaq === i ? <ChevronDown size={16} className="text-ink-400" /> : <ChevronRight size={16} className="text-ink-400" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-ink-600">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-success-600" />
            <div>
              <p className="text-sm font-semibold text-ink-900">Tous les systemes operationnels</p>
              <p className="text-xs text-ink-500">Derniere verification : il y a 2 minutes</p>
            </div>
          </div>
          <Badge tone="success">Disponible</Badge>
        </div>
      </div>
    </div>
  );
}




