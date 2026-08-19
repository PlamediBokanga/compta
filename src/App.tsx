import { useEffect } from 'react';
import { RouterProvider, useRouter } from './lib/router';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './components/ui/Toast';
import { PublicNav } from './components/marketing/PublicNav';
import { PublicFooter } from './components/marketing/PublicFooter';
import { HomePage } from './pages/marketing/Home';
import { FeaturesPage } from './pages/marketing/Features';
import { PricingPage } from './pages/marketing/Pricing';
import { FaqPage } from './pages/marketing/Faq';
import { LegalPage } from './pages/marketing/Legal';
import { SignInPage } from './pages/auth/SignIn';
import { SignUpPage } from './pages/auth/SignUp';
import { OnboardingPage } from './pages/auth/Onboarding';
import { ForgotPasswordPage } from './pages/auth/ForgotPassword';
import { ResetPasswordPage } from './pages/auth/ResetPassword';
import { DashboardShell } from './components/dashboard/DashboardShell';
import { DashboardPage } from './pages/app/Dashboard';
import { TransactionsPage } from './pages/app/Transactions';
import { InvoicesPage } from './pages/app/Invoices';
import { DocumentsPage } from './pages/app/Documents';
import { ReportsPage } from './pages/app/Reports';
import { SocialPage } from './pages/app/Social';
import { AdminPage } from './pages/app/Admin';
import { DeclarationsPage } from './pages/app/Declarations';
import { SettingsPage } from './pages/app/Settings';
import { TeamPage } from './pages/app/Team';
import { CategoriesPage } from './pages/app/Categories';
import { SupportPage } from './pages/app/Support';
import { CustomersPage } from './pages/app/Customers';
import { CatalogItemsPage } from './pages/app/CatalogItems';
import { ApiSettingsPage } from './pages/app/ApiSettings';
import { supabaseEnvReady } from './lib/supabase';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <PublicNav />
      {children}
      <PublicFooter />
    </div>
  );
}

function DeploymentConfigError() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-warning-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warning-700">Configuration requise</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink-950">L'application est en ligne, mais la configuration Vercel est incomplete.</h1>
        <p className="mt-4 text-sm leading-6 text-ink-600">
          Cette page remplace l'ancien ecran vide. Ajoutez ou verifiez les variables d'environnement du frontend dans Vercel, puis redeployez le projet.
        </p>
        <div className="mt-6 rounded-2xl bg-ink-50 p-4 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">Variables attendues :</p>
          <p className="mt-2 font-mono">VITE_SUPABASE_URL</p>
          <p className="mt-1 font-mono">VITE_SUPABASE_ANON_KEY</p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-ink-50 p-4">
            <p className="text-xs text-ink-500">Etape 1</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">Ouvrir Project Settings dans Vercel</p>
          </div>
          <div className="rounded-2xl bg-ink-50 p-4">
            <p className="text-xs text-ink-500">Etape 2</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">Verifier les variables et relancer un redeploy</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Routes() {
  const { path, navigate } = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const isAppRoute = path.startsWith('/app');
    const isSignInRoute = path === '/signin';
    const isSignUpRoute = path === '/signup';
    const isOnboardingRoute = path === '/onboarding';
    const isAuthRoute = isSignInRoute || isSignUpRoute || isOnboardingRoute;

    if (isAppRoute && !user) {
      navigate('/signin');
      return;
    }

    if (!user) {
      return;
    }

    if (profile) {
      if (isAuthRoute && !isSignInRoute) {
        navigate('/app');
      }
      return;
    }

    if (isAppRoute || isOnboardingRoute || isSignUpRoute) {
      navigate('/onboarding');
    }
  }, [path, user, profile, loading, navigate]);

  if (loading && (path.startsWith('/app') || path === '/onboarding')) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-ink-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (path === '/' || path === '') return <PublicLayout><HomePage /></PublicLayout>;
  if (path === '/features') return <PublicLayout><FeaturesPage /></PublicLayout>;
  if (path === '/pricing') return <PublicLayout><PricingPage /></PublicLayout>;
  if (path === '/faq') return <PublicLayout><FaqPage /></PublicLayout>;
  if (path === '/legal') return <PublicLayout><LegalPage /></PublicLayout>;

  if (path === '/signin') return <SignInPage />;
  if (path === '/signup') return <SignUpPage />;
  if (path === '/onboarding') return <OnboardingPage />;
  if (path === '/forgot-password') return <ForgotPasswordPage />;
  if (path === '/reset-password') return <ResetPasswordPage />;

  if (path.startsWith('/app')) {
    if (!user) return <SignInPage />;
    return (
      <DashboardShell>
        {path === '/app' && <DashboardPage />}
        {path === '/app/transactions' && <TransactionsPage />}
        {path === '/app/invoices' && <InvoicesPage />}
        {path === '/app/documents' && <DocumentsPage />}
        {path === '/app/reports' && <ReportsPage />}
        {path === '/app/social' && <SocialPage />}
        {path === '/app/admin' && <AdminPage />}
        {path === '/app/declarations' && <DeclarationsPage />}
        {path === '/app/settings' && <SettingsPage />}
        {path === '/app/team' && <TeamPage />}
        {path === '/app/categories' && <CategoriesPage />}
        {path === '/app/customers' && <CustomersPage />}
        {path === '/app/catalog' && <CatalogItemsPage />}
        {path === '/app/support' && <SupportPage />}
        {path === '/app/api' && <ApiSettingsPage />}
      </DashboardShell>
    );
  }

  return <PublicLayout><HomePage /></PublicLayout>;
}

function App() {
  if (!supabaseEnvReady) {
    return <DeploymentConfigError />;
  }

  return (
    <RouterProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
