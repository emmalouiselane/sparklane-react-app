import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar, { ModuleId, ModuleNavItem } from './components/Sidebar';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import Homepage from './pages/homepage';
import TimeLogsPage from './pages/time-logs';
import MealPlannerPage from './pages/meal-planner';
import MonthlyBudgetPage from './pages/monthly-budget';
import AccountSettingsPage from './pages/account-settings';
import Footer from './components/Footer';
import PrivacyPolicyPage from './pages/privacy-policy';
import TermsOfServicePage from './pages/terms-of-service';
import { isOptionalModuleId, OPTIONAL_MODULES, OptionalModuleId } from './config/modules';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CustomBootstrap.css';
import './brand.css';

const ACTIVE_MODULE_STORAGE_KEY = 'sparklane_active_module';
const MODULE_NAV_ITEMS: ModuleNavItem[] = [
  { id: 'home', label: 'Home' },
  ...OPTIONAL_MODULES,
  { id: 'account-settings', label: 'Account Settings' },
];

const MODULE_COMPONENTS: Record<ModuleId, React.ComponentType> = {
  home: Homepage,
  'time-logs': TimeLogsPage,
  'monthly-budget': MonthlyBudgetPage,
  'meal-planner': MealPlannerPage,
  'account-settings': AccountSettingsPage,
};

function getStoredActiveModule(): ModuleId {
  if (typeof window === 'undefined') {
    return 'home';
  }

  const storedModule = window.localStorage.getItem(ACTIVE_MODULE_STORAGE_KEY);

  if (storedModule && storedModule in MODULE_COMPONENTS) {
    return storedModule as ModuleId;
  }

  return 'home';
}

function AppContent() {
  const { user, isAuthenticated, loading, error, checkAuthStatus, setError } = useAuthContext();
  const [activeModule, setActiveModule] = useState<ModuleId>(() => getStoredActiveModule());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const moduleHeadingRef = useRef<HTMLHeadingElement>(null);
  const enabledModules: OptionalModuleId[] = useMemo(() =>
    Array.isArray(user?.enabledModules)
      ? user.enabledModules.filter((moduleId: string) => isOptionalModuleId(moduleId))
      : [],
    [user?.enabledModules]
  );
  const enabledModuleSet = useMemo(() => new Set<OptionalModuleId>(enabledModules), [enabledModules]);
  const visibleNavItems = MODULE_NAV_ITEMS.filter((item) =>
    !isOptionalModuleId(item.id) || enabledModuleSet.has(item.id)
  );

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = user?.theme === 'light' ? 'light' : 'dark';
  }, [user?.theme]);
 
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    
    if (authSuccess === 'success' || authSuccess === 'calendar-success') {
      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuthStatus();
    } else if (authSuccess === 'error') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setError('Google sign-in failed. Please try again.');
    } else if (authSuccess === 'calendar-error') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setError('Google Calendar authorization failed. Please try again.');
    }
  }, [checkAuthStatus, setError]);

  useEffect(() => {
    moduleHeadingRef.current?.focus();
  }, [activeModule]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_MODULE_STORAGE_KEY, activeModule);
  }, [activeModule]);

  useEffect(() => {
    if (isOptionalModuleId(activeModule) && !enabledModuleSet.has(activeModule)) {
      setActiveModule('home');
    }
  }, [activeModule, enabledModuleSet]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const safeActiveModule = isOptionalModuleId(activeModule) && !enabledModuleSet.has(activeModule)
    ? 'home'
    : activeModule;
  const ActiveModulePage = MODULE_COMPONENTS[safeActiveModule];

  if (loading) {
    return (
      <div className="app">Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="public-app">
        <Login />
        <Footer />
      </div>
    );
  }

  const handleModuleSelect = (module: ModuleId) => {
    setActiveModule(module);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className={`app-shell${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        {isMobileSidebarOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <Sidebar
          items={visibleNavItems}
          activeModule={safeActiveModule}
          onSelectModule={handleModuleSelect}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <div className="app-content">
          <Header
            user={user}
            error={error}
            isMobileMenuOpen={isMobileSidebarOpen}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenAccountSettings={() => setActiveModule('account-settings')}
          />

          <main className="app-main" id="main-content" role="main" aria-labelledby="module-heading">
            {safeActiveModule === 'home' ? (
              <Homepage
                enabledModuleCount={enabledModules.length}
                onOpenModuleSettings={() => setActiveModule('account-settings')}
              />
            ) : (
              <ActiveModulePage />
            )}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/privacy') {
    return <PrivacyPolicyPage />;
  }

  if (pathname === '/terms') {
    return <TermsOfServicePage />;
  }

  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--color-surface-elevated)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border-soft)',
            boxShadow: 'var(--shadow-soft)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600
          }
        }}
      />
    </AuthProvider>
  );
}

export default App;
