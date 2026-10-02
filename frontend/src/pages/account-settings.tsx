import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthContext } from '../contexts/AuthContext';
import { apiClient } from '../helpers/auth';
import { getOrdinalSuffix } from '../helpers/helper';
import './account-settings.css';

type ThemePreference = 'dark' | 'light';

function describePayDay(payDay: number) {
  const ordinalDay = `${payDay}${getOrdinalSuffix(payDay)}`;

  if (payDay <= 28) {
    return `the ${ordinalDay} of each month`;
  }

  return `the ${ordinalDay} of each month, or the last available day in shorter months`;
}

function AccountSettingsPage() {
  const { user, checkAuthStatus } = useAuthContext();
  const [payDay, setPayDay] = useState<number>(28);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(user?.theme === 'light' ? 'light' : 'dark');
  const [isThemeSaving, setIsThemeSaving] = useState(false);

  useEffect(() => {
    setTheme(user?.theme === 'light' ? 'light' : 'dark');
  }, [user?.theme]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get('/api/budget/settings');

        setPayDay(response.data.payDay ?? 28);
      } catch (requestError: any) {
        console.error('Failed to fetch account settings', requestError);
        setError(requestError.response?.data?.error || 'Failed to load account settings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

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

  const handleThemeChange = async (useLightTheme: boolean) => {
    const previousTheme = theme;
    const nextTheme: ThemePreference = useLightTheme ? 'light' : 'dark';

    try {
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      setIsThemeSaving(true);

      await apiClient.patch('/auth/preferences', { theme: nextTheme });
      await checkAuthStatus();
      toast.success(`${nextTheme === 'light' ? 'Warm light' : 'Dark green'} theme saved.`);
    } catch (requestError: any) {
      setTheme(previousTheme);
      document.documentElement.dataset.theme = previousTheme;
      console.error('Failed to update theme', requestError);
      toast.error(requestError.response?.data?.error || 'Failed to save theme preference.');
    } finally {
      setIsThemeSaving(false);
    }
  };

  const displayName = user?.name?.givenName || user?.name || user?.displayName || 'Google User';
  const email = user?.email || user?.emails?.[0]?.value || 'No email available';
  const avatarUrl = user?.picture || user?.photos?.[0]?.value;

  return (
    <section className="account-settings-page" aria-label="Account settings">
      <section className="settings-card profile-card">
        <div className="settings-card-header">
          <h2>Google Account</h2>
          <p>Signed-in profile information from your connected Google account.</p>
        </div>

        <div className="profile-summary">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="settings-avatar" />
          ) : (
            <div className="settings-avatar-fallback" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="profile-copy">
            <h3>{displayName}</h3>
            <p>{email}</p>
            <span className="settings-chip">Google connected</span>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-header">
          <h2>Appearance</h2>
          <p>Choose the colour theme used across Spark Lane.</p>
        </div>

        <label className="settings-toggle">
          <span className="settings-toggle-copy">
            <strong>Warm light theme</strong>
            <span>Use the cream and terracotta theme.</span>
          </span>
          <input
            className="settings-toggle-input"
            type="checkbox"
            checked={theme === 'light'}
            onChange={(event) => handleThemeChange(event.target.checked)}
            disabled={isThemeSaving}
          />
          <span className="settings-toggle-track" aria-hidden="true">
            <span className="settings-toggle-thumb" />
          </span>
        </label>

        <p className="settings-helper" aria-live="polite">
          {isThemeSaving
            ? 'Saving your theme preference...'
            : `Currently using the ${theme === 'light' ? 'warm light' : 'dark green'} theme.`}
        </p>
      </section>

      <section className="settings-card">
        <div className="settings-card-header">
          <h2>Budget Settings</h2>
          <p>Choose the monthly day your pay period starts from.</p>
        </div>

        {error && <p className="settings-error">{error}</p>}

        <label className="settings-field pay-day">
          <p>
            Pay day:
          </p>
          
          <select
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
    </section>
  );
}

export default AccountSettingsPage;
