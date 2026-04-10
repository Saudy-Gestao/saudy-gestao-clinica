export type AppColorScheme = 'light' | 'dark';

export const APP_COLOR_SCHEME_STORAGE_KEY = 'mantine-color-scheme';
export const APP_COLOR_SCHEME_EVENT = 'app-color-scheme:changed';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export function getAppColorScheme(): AppColorScheme {
  if (!isBrowser()) return 'light';

  const stored = String(window.localStorage.getItem(APP_COLOR_SCHEME_STORAGE_KEY) || '').toLowerCase();
  return stored === 'dark' ? 'dark' : 'light';
}

export function applyAppColorScheme(scheme: AppColorScheme) {
  if (!isBrowser()) return;

  document.documentElement.setAttribute('data-mantine-color-scheme', scheme);
  window.localStorage.setItem(APP_COLOR_SCHEME_STORAGE_KEY, scheme);
  window.dispatchEvent(new CustomEvent<AppColorScheme>(APP_COLOR_SCHEME_EVENT, { detail: scheme }));
}

export function resetAppColorScheme() {
  applyAppColorScheme('light');
}
