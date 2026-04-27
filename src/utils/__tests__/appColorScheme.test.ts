import { describe, expect, it } from 'vitest';
import {
  APP_COLOR_SCHEME_STORAGE_KEY,
  applyAppColorScheme,
  getAppColorScheme,
  resetAppColorScheme,
} from '../appColorScheme';

describe('appColorScheme helpers', () => {
  it('reads light as default and dark when stored', () => {
    window.localStorage.removeItem(APP_COLOR_SCHEME_STORAGE_KEY);
    expect(getAppColorScheme()).toBe('light');

    window.localStorage.setItem(APP_COLOR_SCHEME_STORAGE_KEY, 'dark');
    expect(getAppColorScheme()).toBe('dark');
  });

  it('applies and resets color scheme', () => {
    applyAppColorScheme('dark');
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
    expect(window.localStorage.getItem(APP_COLOR_SCHEME_STORAGE_KEY)).toBe('dark');

    resetAppColorScheme();
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('light');
    expect(window.localStorage.getItem(APP_COLOR_SCHEME_STORAGE_KEY)).toBe('light');
  });
});
