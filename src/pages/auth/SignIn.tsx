import { useState } from 'react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { Link, useRouter } from '../../lib/router';
import { useAuth } from '../../lib/auth';
import { Logo } from '../../components/ui/Logo';

export function SignInPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err === 'Invalid login credentials' ? 'E-mail ou mot de passe incorrect.' : err);
      return;
    }
    navigate('/app');
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
            La comptabilite qui se fait toute seule.
          </h2>
          <p className="mt-3 max-w-md text-brand-100">
            Connectez-vous pour reprendre la main sur votre temps. Sync bancaire, facturation et declarations : tout est la.
          </p>
        </div>
        <p className="text-xs text-brand-200">Copyright {new Date().getFullYear()} Tenzo</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/" className="inline-flex"><Logo withText /></Link>
          </div>
          <h1 className="mt-8 font-display text-2xl font-extrabold text-ink-950">Connexion</h1>
          <p className="mt-1 text-sm text-ink-500">Heureux de vous revoir.</p>

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
              <div className="flex items-center justify-between">
                <label className="label mb-0" htmlFor="password">Mot de passe</label>
                <Link to="/forgot-password" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                  Mot de passe oublie ?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9"
                  placeholder="........"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700 ring-1 ring-danger-500/30">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Connexion...' : <>Se connecter <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Pas encore de compte ?{' '}
            <Link to="/signup" className="font-semibold text-brand-700 hover:text-brand-800">
              Creer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
