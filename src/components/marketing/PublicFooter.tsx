import { Link } from '../../lib/router';
import { Logo } from '../ui/Logo';

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo withText />
            <p className="mt-3 text-sm text-ink-500 max-w-xs">
              La plateforme tout-en-un pour automatiser votre comptabilité, vos factures et vos
              déclarations fiscales.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Produit</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-500">
              <li><Link to="/features" className="hover:text-brand-700">Fonctionnalités</Link></li>
              <li><Link to="/pricing" className="hover:text-brand-700">Tarifs</Link></li>
              <li><Link to="/faq" className="hover:text-brand-700">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Entreprise</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-500">
              <li><a className="hover:text-brand-700" href="#/legal">Mentions légales</a></li>
              <li><a className="hover:text-brand-700" href="#/legal">CGU</a></li>
              <li><a className="hover:text-brand-700" href="#/legal">Confidentialité</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-ink-500">
              <li>support@tenzo.fr</li>
              <li>Du lundi au vendredi, 9h–18h</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-ink-100 pt-6 sm:flex-row">
          <p className="text-xs text-ink-400">© {new Date().getFullYear()} Tenzo. Tous droits réservés.</p>
          <p className="text-xs text-ink-400">Conçu en France · Conforme RGPD</p>
        </div>
      </div>
    </footer>
  );
}
