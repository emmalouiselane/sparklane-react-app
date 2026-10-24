import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowClockwise } from 'react-bootstrap-icons';

import { useAuthContext } from '../contexts/auth-context';
import { API_BASE_URL } from '../config/api';
import { apiClient } from '../helpers/auth';
import { useRefreshOnPageActivation } from '../helpers/page-refresh';
import { getOrdinalSuffix } from '../helpers/helper';
import { applyThemePreference, getStoredThemePreference, getThemeName, getThemePreference, storeThemePreference, ThemePreference } from '../helpers/theme';
import { isSidebarModuleId, SIDEBAR_MODULES, SidebarModuleId, TOGGLEABLE_MODULES, ToggleableModuleId, withRequiredModules } from '../config/modules';

import '../assets/styles/account-settings.css';

function describePayDay(payDay: number) {
  const ordinalDay = `${payDay}${getOrdinalSuffix(payDay)}`;

  if (payDay <= 28) {
    return `the ${ordinalDay} of each month`;
  }

  return `the ${ordinalDay} of each month, or the last available day in shorter months`;
}

const THEME_GROUPS: { label: string; themes: { id: ThemePreference; label: string; description: string }[] }[] = [
  {
    label: 'Dark themes',
    themes: [
      { id: 'dark', label: 'Evergreen', description: 'A calm, deep green palette.' },
      { id: 'deep-lake', label: 'Deep Lake', description: 'Calm, deep blues inspired by still water.' },
      { id: 'desert-dusk', label: 'Desert Dusk', description: 'Muted mauve, sand, and dusky rose tones.' }
    ]
  },
  {
    label: 'Light themes',
    themes: [
      { id: 'light', label: 'Sunlit Clay', description: 'A cream and terracotta palette.' },
      { id: 'cherry-blossom', label: 'Cherry blossom', description: 'A soft pink palette with plum accents.' },
      { id: 'misty-lavender', label: 'Misty Lavender', description: 'Soft lavender and cool grey for an airy feel.' }
    ]
  }
  
];

function AccountSettingsPage() {
  const { user, checkAuthStatus } = useAuthContext();
  const [payDay, setPayDay] = useState<number>(28);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference(user?.theme ?? getStoredThemePreference()));
  const [isThemeSaving, setIsThemeSaving] = useState(false);
  const [enabledModules, setEnabledModules] = useState<SidebarModuleId[]>(
    withRequiredModules(Array.isArray(user?.enabledModules)
      ? user.enabledModules.filter((moduleId: string) => isSidebarModuleId(moduleId))
      : SIDEBAR_MODULES.map((module) => module.id))
  );
  const [savingModule, setSavingModule] = useState<SidebarModuleId | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const hasLoadedSettings = useRef(false);
  useRefreshOnPageActivation('account-settings', () => setRefreshTick(current => current + 1));
  useEffect(() => {
    setTheme(getThemePreference(user?.theme));
  }, [user?.theme]);

  useEffect(() => {
    setEnabledModules(withRequiredModules(Array.isArray(user?.enabledModules)
      ? user.enabledModules.filter((moduleId: string) => isSidebarModuleId(moduleId))
      : SIDEBAR_MODULES.map((module) => module.id)));
  }, [user?.enabledModules]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (!hasLoadedSettings.current) setIsLoading(true);
        setError(null);
        const response = await apiClient.get('/api/budget/settings');

        setPayDay(response.data.payDay ?? 28);
      } catch (requestError: any) {
        console.error('Failed to fetch account settings', requestError);
        setError(requestError.response?.data?.error || 'Failed to load account settings.');
      } finally {
        hasLoadedSettings.current = true;
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [refreshTick]);

  const handlePayDayChange = async (nextPayDay: number) => {
    try {
      setPayDay(nextPayDay);
      setIsSaving(true);
      setError(null);

      await apiClient.put('/api/budget/settings', { payDay: nextPayDay });

      toast.success(`Pay day updated to ${describePayDay(nextPayDay)}.`);
    } catch (requestError: any) {
      console.error('Failed to update pay day', requestError);
      toast.error(requestError.response?.data?.error || 'Failed to save pay day.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    const previousTheme = theme;

    try {
      setTheme(nextTheme);
      applyThemePreference(nextTheme);
      storeThemePreference(nextTheme);
      setIsThemeSaving(true);

      await apiClient.patch('/auth/preferences', { theme: nextTheme });
      await checkAuthStatus();
      toast.success(`${getThemeName(nextTheme)} theme saved.`);
    } catch (requestError: any) {
      setTheme(previousTheme);
      applyThemePreference(previousTheme);
      storeThemePreference(previousTheme);
      console.error('Failed to update theme', requestError);
      toast.error(requestError.response?.data?.error || 'Failed to save theme preference.');
    } finally {
      setIsThemeSaving(false);
    }
  };

  const handleModuleChange = async (moduleId: ToggleableModuleId, enabled: boolean) => {
    const previousModules = enabledModules;
    const nextModules = enabled
      ? enabledModules.includes(moduleId) ? enabledModules : [...enabledModules, moduleId]
      : enabledModules.filter((enabledModule) => enabledModule !== moduleId);

    try {
      setEnabledModules(nextModules);
      setSavingModule(moduleId);
      await apiClient.patch('/auth/preferences', { enabledModules: nextModules });
      await checkAuthStatus();
      const moduleLabel = SIDEBAR_MODULES.find((module) => module.id === moduleId)?.label || 'Module';
      toast.success(`${moduleLabel} turned ${enabled ? 'on' : 'off'}.`);
    } catch (requestError: any) {
      setEnabledModules(previousModules);
      console.error('Failed to update modules', requestError);
      toast.error(requestError.response?.data?.error || 'Failed to save module preferences.');
    } finally {
      setSavingModule(null);
    }
  };

  const displayName = user?.name?.givenName || user?.name || user?.displayName || 'Google User';
  const email = user?.email || user?.emails?.[0]?.value || 'No email available';
  const avatarUrl = user?.picture || user?.photos?.[0]?.value;
  const currentThemeName = getThemeName(theme);
  const handleCalendarReauthentication = () => {
    window.location.href = `${API_BASE_URL}/auth/google/calendar`;
  };

  return (
    <section className="page-container account-settings-page" aria-labelledby="account-settings-heading">
      <header className="page-heading">
        <div>
          <span className="page-eyebrow">Your preferences</span>
          <h1 id="account-settings-heading">Account settings</h1>
          <p>Manage your modules, budget settings, and appearance.</p>
        </div>
      </header>
      <section className="settings-card profile-card">
        <div className="settings-card-header">
          <h2>Google Account</h2>
          <p>Signed-in profile information from your connected Google account.</p>
        </div>

        <div className="profile-summary">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="settings-avatar" />
          ) : (
            <div className="settings-avatar-fallback" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="profile-copy">
            <h3>{displayName}</h3>
            <p>{email}</p>
            <div className="calendar-connection-actions">
              <span className="settings-chip">Google connected</span>
              <button type="button" className="settings-chip settings-calendar-button" onClick={handleCalendarReauthentication}>
                <ArrowClockwise size={16} aria-hidden="true" />
                <span>Reauthenticate Calendar</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="settings-primary-column">
      <section className="settings-card module-settings-card">
        <div className="settings-card-header">
          <h2>Modules</h2>
          <p>Choose which optional modules you have.</p>
        </div>

        <div className="module-settings-list">
          {TOGGLEABLE_MODULES.map((module) => (
            <label className="settings-toggle" key={module.id}>
              <span className="settings-toggle-copy">
                <strong>{module.label}</strong>
                <span>{enabledModules.includes(module.id) ? 'Shown in your sidebar.' : 'Hidden from your sidebar.'}</span>
              </span>
              <input
                id={`settings-module-${module.id}`}
                name={`module-${module.id}`}
                className="settings-toggle-input"
                type="checkbox"
                checked={enabledModules.includes(module.id)}
                onChange={(event) => handleModuleChange(module.id, event.target.checked)}
                disabled={savingModule !== null}
              />
              <span className="settings-toggle-track" aria-hidden="true">
                <span className="settings-toggle-thumb" />
              </span>
            </label>
          ))}
        </div>

        <p className="settings-helper" aria-live="polite">
          {savingModule ? 'Saving your module preferences...' : `${TOGGLEABLE_MODULES.filter((module) => enabledModules.includes(module.id)).length} of ${TOGGLEABLE_MODULES.length} modules enabled.`}
        </p>
      </section>

      <section className="settings-card budget-settings-card">
        <div className="settings-card-header">
          <h2>Budget Settings</h2>
          <p>Choose the monthly day your pay period starts from.</p>
        </div>

        {error && <p className="settings-error">{error}</p>}

        <label className="settings-field pay-day" htmlFor="settings-pay-day">
          <p>
            Pay day:
          </p>

          <select
            id="settings-pay-day"
            name="payDay"
            value={payDay}
            onChange={(event) => handlePayDayChange(Number(event.target.value))}
            disabled={isLoading || isSaving}
          >
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>

        <p className="settings-helper">
          {isLoading
            ? 'Loading your budget settings...'
            : isSaving
              ? 'Saving your new pay day...'
              : `Current pay periods start on ${describePayDay(payDay)}.`}
        </p>
      </section>
      </div>

      <div className="settings-secondary-column">
        <section className="settings-card">
          <div className="settings-card-header">
            <h2>Appearance</h2>
            <p>Choose the colour theme used across Spark Lane.</p>
          </div>

          <fieldset className="appearance-theme">
            <legend>Choose a theme</legend>
            {THEME_GROUPS.map((group) => (
              <div className="appearance-theme-group" key={group.label}>
                <h3>{group.label}</h3>
                {group.themes.map((option) => (
                  <label className={`appearance-theme-option${theme === option.id ? ' is-selected' : ''}`} key={option.id}>
                    <input
                      type="radio"
                      name="theme"
                      value={option.id}
                      checked={theme === option.id}
                      onChange={() => handleThemeChange(option.id)}
                      disabled={isThemeSaving}
                    />
                    <span className="appearance-theme-copy">
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </fieldset>

          <p className="settings-helper" aria-live="polite">
            {isThemeSaving
              ? 'Saving your theme preference...'
              : `Currently using the ${currentThemeName} theme.`}
          </p>
        </section>
      </div>
    </section>
  );
}

export default AccountSettingsPage;
