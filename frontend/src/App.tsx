import React, { useEffect, useRef, useState } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar, { ModuleId, ModuleNavItem } from './components/Sidebar';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { extractAuthTokenFromHash, extractAuthTokenFromSearch, storeAuthToken } from './helpers/authToken';
import Homepage from './pages/homepage';
import TimeLogsPage from './pages/time-logs';
import MealPlannerPage from './pages/meal-planner';
import MonthlyBudgetPage from './pages/monthly-budget';
import AccountSettingsPage from './pages/account-settings';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CustomBootstrap.css';

const MODULE_NAV_ITEMS: ModuleNavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'time-logs', label: 'Time Logs' },
  { id: 'monthly-budget', label: 'Monthly Budget' },
  { id: 'meal-planner', label: 'Meal Planner' },
  { id: 'account-settings', label: 'Account Settings' },
];

const MODULE_COMPONENTS: Record<ModuleId, React.ComponentType> = {
  home: Homepage,
  'time-logs': TimeLogsPage,
  'monthly-budget': MonthlyBudgetPage,
  'meal-planner': MealPlannerPage,
  'account-settings': AccountSettingsPage,
};

function AppContent() {
  const { user, isAuthenticated, loading, error, checkAuthStatus, setError } = useAuthContext();
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const moduleHeadingRef = useRef<HTMLHeadingElement>(null);
 
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    const authToken = extractAuthTokenFromSearch(window.location.search) || extractAuthTokenFromHash(window.location.hash);
    
    if (authSuccess === 'success') {
      if (authToken) {
        storeAuthToken(authToken);
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuthStatus();
    } else if (authSuccess === 'error') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setError('Google sign-in failed. Please try again.');
    }
  }, [checkAuthStatus, setError]);

  useEffect(() => {
    moduleHeadingRef.current?.focus();
  }, [activeModule]);

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

  const ActiveModulePage = MODULE_COMPONENTS[activeModule];

  if (loading) {
    return (
      <div className="app">Loading...</div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
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
          items={MODULE_NAV_ITEMS}
          activeModule={activeModule}
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
            <ActiveModulePage />
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
