import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar, { ModuleId } from './components/Sidebar';
import { AuthProvider, useAuthContext } from './contexts/auth-context';
import Homepage from './pages/homepage';
import RecurringRoutines from './components/recurring-routines';
import TimeLogsPage from './pages/time-logs';
import MealPlannerPage from './pages/meal-planner';
import MonthlyBudgetPage from './pages/monthly-budget';
import AccountSettingsPage from './pages/account-settings';
import Footer from './components/Footer';
import PrivacyPolicyPage from './pages/privacy-policy';
import TermsOfServicePage from './pages/terms-of-service';
import MyWeekPage from './pages/my-week';
import WellnessPage from './pages/wellness';
import { isSidebarModuleId, OPTIONAL_MODULES, SIDEBAR_MODULES, SidebarModuleId, withRequiredModules } from './config/modules';
import { applyThemePreference, getStoredThemePreference, getThemePreference, storeThemePreference } from './helpers/theme';
import { DATA_SAVED_EVENT, PAGE_ACTIVATED_EVENT } from './helpers/page-refresh';

import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/styles/app.css';
import './assets/styles/custom-bootstrap.css';
import './assets/styles/brand.css';
import './assets/styles/page-shared.css';
import { ModuleNavItem } from './interfaces/SidebarProps';

const SIDEBAR_WIDTH_STORAGE_KEY = 'sparklane_sidebar_width';
const DEFAULT_SIDEBAR_WIDTH = 248;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 420;

function getStoredSidebarWidth(userId?: string) {
  try {
    const storedWidth = Number(userId ? window.localStorage.getItem(`${SIDEBAR_WIDTH_STORAGE_KEY}:${userId}`) : null);
    return Number.isFinite(storedWidth) && storedWidth >= MIN_SIDEBAR_WIDTH
      && storedWidth <= MAX_SIDEBAR_WIDTH ? storedWidth : DEFAULT_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}
const MODULE_NAV_ITEMS: ModuleNavItem[] = [
  ...SIDEBAR_MODULES,
];

function AppContent() {
  const { user, isAuthenticated, loading, error, checkAuthStatus, setError, handleLogout } = useAuthContext();
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [visitedModules, setVisitedModules] = useState<Set<ModuleId>>(() => new Set<ModuleId>(['home']));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => getStoredSidebarWidth(user?.id));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const moduleHeadingRef = useRef<HTMLHeadingElement>(null);
  const enabledModules: SidebarModuleId[] = useMemo(() =>
    withRequiredModules(Array.isArray(user?.enabledModules)
      ? user.enabledModules.filter((moduleId: string) => isSidebarModuleId(moduleId))
      : SIDEBAR_MODULES.map((module) => module.id)),
    [user?.enabledModules]
  );
  const enabledModuleSet = useMemo(() => new Set<SidebarModuleId>(enabledModules), [enabledModules]);
  const visibleNavItems = MODULE_NAV_ITEMS.filter((item) => enabledModuleSet.has(item.id));
  const safeActiveModule = isSidebarModuleId(activeModule) && !enabledModuleSet.has(activeModule)
    ? MODULE_NAV_ITEMS.find((item) => enabledModuleSet.has(item.id))?.id ?? 'account-settings'
    : activeModule;

  useLayoutEffect(() => {
    const theme = user ? getThemePreference(user.theme) : getStoredThemePreference();
    applyThemePreference(theme);
    if (user) storeThemePreference(theme);
  }, [user]);
 
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
    const activateCurrentPage = () => {
      window.dispatchEvent(new CustomEvent(PAGE_ACTIVATED_EVENT, { detail: safeActiveModule }));
      if (isAuthenticated) checkAuthStatus();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') activateCurrentPage();
    };
    const refreshAffectedPages = (event: Event) => {
      const url = (event as CustomEvent<string>).detail || '';
      const targets = url.includes('/api/todos') || url.includes('/api/calendar')
        ? ['home', 'my-week']
        : url.includes('/api/wellness')
          ? ['home', 'wellness']
          : url.includes('/api/habits')
            ? ['home', 'recurring-routines']
            : url.includes('/api/meal-planner')
              ? ['home', 'meal-planner']
              : url.includes('/api/budget')
                ? ['monthly-budget', 'account-settings']
                : url.includes('/api/time-logs')
                  ? ['time-logs']
                  : url.includes('/auth/preferences')
                    ? ['account-settings']
                    : [safeActiveModule];
      targets.forEach((pageId) => {
        window.dispatchEvent(new CustomEvent(PAGE_ACTIVATED_EVENT, { detail: pageId }));
      });
    };

    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') activateCurrentPage();
    }, 60_000);
    window.addEventListener('focus', activateCurrentPage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener(DATA_SAVED_EVENT, refreshAffectedPages);
    return () => {
      window.removeEventListener('focus', activateCurrentPage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(DATA_SAVED_EVENT, refreshAffectedPages);
      window.clearInterval(refreshTimer);
    };
  }, [safeActiveModule, isAuthenticated, checkAuthStatus]);

  useEffect(() => {
    try {
      if (user?.id) window.localStorage.setItem(`${SIDEBAR_WIDTH_STORAGE_KEY}:${user.id}`, String(sidebarWidth));
    } catch {
      // Resizing still works when browser storage is unavailable.
    }
  }, [sidebarWidth, user?.id]);

  useEffect(() => {
    if (isSidebarModuleId(activeModule) && !enabledModuleSet.has(activeModule)) {
      setActiveModule(MODULE_NAV_ITEMS.find((item) => enabledModuleSet.has(item.id))?.id ?? 'account-settings');
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
    setVisitedModules((current) => new Set(current).add(module));
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div
        className={`app-shell${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}
        style={{ '--expanded-sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      >
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
          width={sidebarWidth}
          minWidth={MIN_SIDEBAR_WIDTH}
          maxWidth={MAX_SIDEBAR_WIDTH}
          onResize={setSidebarWidth}
          user={user}
          onOpenAccountSettings={() => handleModuleSelect('account-settings')}
          onLogout={handleLogout}
        />

        <div className="app-content">
          <Header
            error={error}
            activeModuleLabel={safeActiveModule === 'account-settings'
              ? 'Account settings'
              : visibleNavItems.find((item) => item.id === safeActiveModule)?.label || 'Today'}
            isMobileMenuOpen={isMobileSidebarOpen}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          />

          <main className="app-main" id="main-content" role="main" aria-label={safeActiveModule === 'account-settings' ? 'Account settings' : visibleNavItems.find((item) => item.id === safeActiveModule)?.label || 'Today'}>
            {visitedModules.has('home') && <div className="module-page-cache" hidden={safeActiveModule !== 'home'}>
              <Homepage
                userId={user?.id}
                weeklyIntention={user?.weeklyIntention}
                enabledModuleCount={enabledModules.filter((moduleId) => OPTIONAL_MODULES.some((module) => module.id === moduleId)).length}
                routinesEnabled={enabledModuleSet.has('recurring-routines')}
                mealsEnabled={enabledModuleSet.has('meal-planner')}
                onSelectModule={handleModuleSelect}
                onOpenModuleSettings={() => handleModuleSelect('account-settings')}
              />
            </div>}
            {visitedModules.has('my-week') && <div className="module-page-cache" hidden={safeActiveModule !== 'my-week'}>
              <MyWeekPage
                onSelectModule={handleModuleSelect}
                timeLogsEnabled={enabledModuleSet.has('time-logs')}
                habitsEnabled={enabledModuleSet.has('recurring-routines')}
                mealsEnabled={enabledModuleSet.has('meal-planner')}
              />
            </div>}
            {visitedModules.has('wellness') && <div className="module-page-cache" hidden={safeActiveModule !== 'wellness'}><WellnessPage userId={user?.id} /></div>}
            {visitedModules.has('recurring-routines') && <div className="module-page-cache" hidden={safeActiveModule !== 'recurring-routines'}><RecurringRoutines /></div>}
            {visitedModules.has('time-logs') && <div className="module-page-cache" hidden={safeActiveModule !== 'time-logs'}><TimeLogsPage /></div>}
            {visitedModules.has('monthly-budget') && <div className="module-page-cache" hidden={safeActiveModule !== 'monthly-budget'}><MonthlyBudgetPage /></div>}
            {visitedModules.has('meal-planner') && enabledModuleSet.has('meal-planner') && <div className="module-page-cache" hidden={safeActiveModule !== 'meal-planner'}><MealPlannerPage /></div>}
            {visitedModules.has('account-settings') && <div className="module-page-cache" hidden={safeActiveModule !== 'account-settings'}><AccountSettingsPage /></div>}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}

function AccountAppContent() {
  const { user } = useAuthContext();
  // Remount feature state when the signed-in account changes.
  return <AppContent key={user?.id || 'signed-out'} />;
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
      <AccountAppContent />
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
