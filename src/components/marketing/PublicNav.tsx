import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from '../../lib/router';
import { Logo } from '../ui/Logo';

const links = [
  { to: '/features', label: 'Fonctionnalités' },
  { to: '/pricing', label: 'Tarifs' },
  { to: '/faq', label: 'FAQ' },
  { to: '/legal', label: 'Légal' },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center">
          <Logo withText />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/signin" className="btn-ghost">
            Se connecter
          </Link>
          <Link to="/signup" className="btn-primary">
            Essai gratuit
          </Link>
        </div>
        <button
          className="rounded-lg p-2 text-ink-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link to="/signin" onClick={() => setOpen(false)} className="btn-secondary flex-1">
                Se connecter
              </Link>
              <Link to="/signup" onClick={() => setOpen(false)} className="btn-primary flex-1">
                Essai gratuit
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
