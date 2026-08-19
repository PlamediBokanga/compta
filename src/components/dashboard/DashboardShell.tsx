import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  Bell,
  FileText,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Scale,
  Settings,
  Shield,
  Users,
  X,
  CheckCheck,
  Code,
  Trash2,
} from 'lucide-react';
import { Link, useRouter } from '../../lib/router';
import { useAuth } from '../../lib/auth';
import { useNotifications } from '../../lib/hooks';
import { useAccessControl } from '../../lib/access';
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from '../../lib/api';
import { Logo } from '../ui/Logo';
import { initials, fmtDate } from '../../lib/format';
import { getLegalStatusLabel } from '../../lib/legal-status';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  requires?: 'admin' | 'api' | 'team';
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { to: '/app', label: 'Accueil', icon: LayoutDashboard },
      { to: '/app/invoices', label: 'Ventes', icon: FileText },
      { to: '/app/transactions', label: 'Banque', icon: BarChart3 },
      { to: '/app/declarations', label: 'Obligations RDC', icon: Shield },
      { to: '/app/reports', label: 'Comptabilite', icon: Scale },
    ],
  },
  {
    title: 'Entreprise',
    items: [
      { to: '/app/settings', label: 'Parametres', icon: Settings },
      { to: '/app/support', label: 'Aide & support', icon: LifeBuoy },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/app/team', label: 'Equipe', icon: Users, requires: 'team' },
      { to: '/app/admin', label: 'Back-office', icon: Gauge, requires: 'admin' },
      { to: '/app/api', label: 'API & Webhooks', icon: Code, requires: 'api' },
    ],
  },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const access = useAccessControl();
  const { path, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [path]);

  const isActive = (to: string) => (to === '/app' ? path === '/app' : path.startsWith(to));
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.requires === 'admin') return access.canAccessAdmin;
        if (item.requires === 'api') return access.canAccessApi;
        if (item.requires === 'team') return access.canManageTeam;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link to="/app"><Logo withText /></Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {filteredSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`nav-link ${isActive(n.to) ? 'nav-link-active' : ''}`}
                  >
                    <n.icon size={18} /> {n.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-pop animate-fade-in">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo withText />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
              {filteredSections.map((section) => (
                <div key={section.title} className="mb-4">
                  <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">{section.title}</p>
                  <div className="space-y-1">
                    {section.items.map((n) => (
                      <Link key={n.to} to={n.to} className={`nav-link ${isActive(n.to) ? 'nav-link-active' : ''}`}>
                        <n.icon size={18} /> {n.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-100 bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-ink-900">
                {profile?.company_name || 'Mon activite'}
              </p>
              <p className="text-xs text-ink-500">
                {getLegalStatusLabel(profile?.legal_status)}
                {profile?.siren ? ` | SIREN ${profile.siren}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-ink-100"
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {initials(user?.email ?? '') || 'U'}
                </div>
                <span className="hidden text-sm font-medium text-ink-700 sm:block">
                  {user?.email?.split('@')[0] || 'Utilisateur'}
                </span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-20 w-56 card p-1.5 animate-scale-in">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-ink-900 truncate">{user?.email}</p>
                      <p className="text-xs text-ink-500">Plan Decouverte</p>
                    </div>
                    <div className="my-1 h-px bg-ink-100" />
                    <Link to="/app/settings" onClick={() => setMenuOpen(false)} className="nav-link">
                      <Settings size={16} /> Reglages
                    </Link>
                    <button
                      onClick={() => { signOut(); navigate('/'); }}
                      className="nav-link w-full text-left text-danger-700 hover:bg-danger-50"
                    >
                      <LogOut size={16} /> Deconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const { path } = useRouter();
  const { items, reload } = useNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);

  const unread = items.filter((n) => !n.read);
  const unreadCount = unread.length;

  const handleMarkAll = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      reload();
    } catch {
      // ignore
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      reload();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      reload();
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-xl text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 max-h-[28rem] w-80 overflow-y-auto card p-0 animate-scale-in scrollbar-thin">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-danger-100 px-1.5 py-0.5 text-[10px] font-bold text-danger-700">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  <CheckCheck size={14} /> Tout lire
                </button>
              )}
            </div>
            <div className="divide-y divide-ink-100">
              {items.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-ink-500">
                  <Bell size={24} className="mx-auto text-ink-300" />
                  <p className="mt-2">Aucune notification.</p>
                </div>
              )}
              {items.map((n) => {
                const toneClass = {
                  info: 'bg-brand-50 text-brand-700',
                  success: 'bg-success-50 text-success-700',
                  warning: 'bg-warning-50 text-warning-700',
                  danger: 'bg-danger-50 text-danger-700',
                }[n.type];
                return (
                  <div
                    key={n.id}
                    className={`group flex items-start gap-3 px-4 py-3 transition hover:bg-ink-50 ${!n.read ? 'bg-brand-50/40' : ''}`}
                  >
                    <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneClass}`}>
                      <Bell size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-900">{n.title}</p>
                      {n.message && <p className="mt-0.5 text-xs text-ink-500">{n.message}</p>}
                      <p className="mt-1 text-[10px] text-ink-400">{fmtDate(n.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                      {!n.read && (
                        <button
                          onClick={() => handleMarkOne(n.id)}
                          className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                          title="Marquer comme lu"
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="rounded p-1 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}




