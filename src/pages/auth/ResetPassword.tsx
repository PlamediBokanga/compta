import { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { Link, useRouter } from '../../lib/router';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../components/ui/Logo';

export function ResetPasswordPage() {
  const { navigate } = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/signin'), 2500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Link to="/" className="inline-flex"><Logo withText /></Link>
        </div>

        {done ? (
          <div className="mt-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-50">
              <CheckCircle2 size={28} className="text-success-600" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-950">Mot de passe mis à jour</h1>
            <p className="mt-2 text-sm text-ink-500">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          </div>
        ) : (
          <>
            <h1 className="mt-8 font-display text-2xl font-extrabold text-ink-950">Nouveau mot de passe</h1>
            <p className="mt-1 text-sm text-ink-500">Choisissez un nouveau mot de passe pour votre compte.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="password">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    autoFocus
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
                {loading ? 'Mise à jour…' : <>Mettre à jour <ArrowRight size={16} /></>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
