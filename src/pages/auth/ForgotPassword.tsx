import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { Link } from '../../lib/router';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../components/ui/Logo';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink-50 lg:grid lg:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-brand-700 to-brand-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2 text-white">
          <Logo size={36} />
          <span className="font-display text-xl font-extrabold">Tenzo</span>
        </Link>
        <div>
          <h2 className="font-display text-3xl font-extrabold leading-tight text-white text-balance">
            Réinitialisez votre mot de passe
          </h2>
          <p className="mt-3 max-w-md text-brand-100">
            Saisissez votre e-mail pour recevoir un lien de réinitialisation sécurisé.
          </p>
        </div>
        <p className="text-xs text-brand-200">© {new Date().getFullYear()} Tenzo</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/" className="inline-flex"><Logo withText /></Link>
          </div>

          {sent ? (
            <div className="mt-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-50">
                <CheckCircle2 size={28} className="text-success-600" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-950">Vérifiez votre boîte mail</h1>
              <p className="mt-2 text-sm text-ink-500">
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Cliquez sur le lien dans l'e-mail pour choisir un nouveau mot de passe.
              </p>
              <Link to="/signin" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
                <ArrowLeft size={16} /> Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mt-8 font-display text-2xl font-extrabold text-ink-950">Mot de passe oublié</h1>
              <p className="mt-1 text-sm text-ink-500">Nous vous enverrons un e-mail pour le réinitialiser.</p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="email">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-9"
                      placeholder="vous@exemple.fr"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700 ring-1 ring-danger-500/30">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Envoi…' : <>Envoyer le lien <ArrowRight size={16} /></>}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-500">
                <Link to="/signin" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800">
                  <ArrowLeft size={16} /> Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
