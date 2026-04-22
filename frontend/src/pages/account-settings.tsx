import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useAuthContext } from '../contexts/AuthContext';
import { getAuthConfig, getAuthToken } from '../helpers/auth';
import { getOrdinalSuffix } from '../helpers/helper';
import './account-settings.css';

function AccountSettingsPage() {
  const { user } = useAuthContext();
  const [payDay, setPayDay] = useState<number>(28);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = getAuthToken();

        if (!token) {
          setError('Please log in to manage your settings.');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/api/budget/settings`, getAuthConfig(token));

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
      const token = getAuthToken();

      if (!token) {
        setError('Please log in to manage your settings.');
        return;
      }

      setPayDay(nextPayDay);
      setIsSaving(true);
      setNotice(null);
      setError(null);

      await axios.put(
        `${API_BASE_URL}/api/budget/settings`,
        { payDay: nextPayDay },
        getAuthConfig(token)
      );

      setNotice(`Pay day updated to the ${nextPayDay}${getOrdinalSuffix(nextPayDay)} of each month.`);
    } catch (requestError: any) {
      console.error('Failed to update pay day', requestError);
      setError(requestError.response?.data?.error || 'Failed to save pay day.');
    } finally {
      setIsSaving(false);
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
          <h2>Budget Settings</h2>
          <p>Choose the monthly day your pay period starts from.</p>
        </div>

        {error && <p className="settings-error">{error}</p>}
        {notice && <p className="settings-notice">{notice}</p>}

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
              : `Current pay periods start on the ${payDay}${getOrdinalSuffix(payDay)} of each month.`}
        </p>
      </section>
    </section>
  );
}

export default AccountSettingsPage;
