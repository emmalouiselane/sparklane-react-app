export const THEME_STORAGE_KEY = 'sparklane_theme';

export const THEME_PREFERENCES = ['dark', 'light', 'cherry-blossom', 'deep-lake', 'misty-lavender', 'desert-dusk'] as const;
export type ThemePreference = typeof THEME_PREFERENCES[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && THEME_PREFERENCES.includes(value as ThemePreference);
}

export function getThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : 'dark';
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';

  try {
    return getThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'dark';
  }
}

export function storeThemePreference(theme: ThemePreference) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The account preference still applies if browser storage is unavailable.
  }
}

export function applyThemePreference(theme: ThemePreference) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;
  const themeColor = theme === 'dark' ? '#101713'
    : theme === 'light' ? '#f6eadc'
      : theme === 'cherry-blossom' ? '#f8edf2'
        : theme === 'deep-lake' ? '#101923'
          : theme === 'misty-lavender' ? '#f0edf6'
            : '#211b22';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
}

export function getThemeName(theme: ThemePreference) {
  if (theme === 'light') return 'Sunlit Clay';
  if (theme === 'cherry-blossom') return 'Cherry blossom';
  if (theme === 'deep-lake') return 'Deep Lake';
  if (theme === 'misty-lavender') return 'Misty Lavender';
  if (theme === 'desert-dusk') return 'Desert Dusk';
  return 'Evergreen';
}
