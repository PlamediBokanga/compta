import { useState } from 'react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { Link, useRouter } from '../../lib/router';
import { useAuth } from '../../lib/auth';
import { Logo } from '../../components/ui/Logo';

export function SignUpPage() {
  const { signUp, signIn } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(email.trim(), password);
    if (err) {
      setLoading(false);
      setError(err);
      return;
    }
    // Try immediate sign-in (email confirmation is OFF)
    const { error: signInErr } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInErr) {
      navigate('/signin');
      return;
    }
    navigate('/onboarding');
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
            Rejoignez les indépendants qui ont arrêté de saisir leur compta.
          </h2>
          <ul className="mt-6 space-y-2.5 text-brand-100">
            {['Sans carte bancaire', 'Sans engagement', 'Conforme RGPD', 'Hébergé en France'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-brand-200">© {new Date().getFullYear()} Tenzo</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/" className="inline-flex"><Logo withText /></Link>
          </div>
          <h1 className="mt-8 font-display text-2xl font-extrabold text-ink-950">Créer un compte</h1>
          <p className="mt-1 text-sm text-ink-500">Gratuit. Sans carte bancaire.</p>

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
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="6 caractères minimum"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700 ring-1 ring-danger-500/30">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Création…' : <>Créer mon compte <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Déjà un compte ?{' '}
            <Link to="/signin" className="font-semibold text-brand-700 hover:text-brand-800">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
