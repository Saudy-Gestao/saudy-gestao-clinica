import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAppColorScheme,
  applyAppColorScheme,
  resetAppColorScheme,
  APP_COLOR_SCHEME_STORAGE_KEY,
} from '../appColorScheme';

describe('appColorScheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-mantine-color-scheme');
  });

  describe('getAppColorScheme', () => {
    it('returns light by default', () => {
      expect(getAppColorScheme()).toBe('light');
    });

    it('returns dark when stored', () => {
      localStorage.setItem(APP_COLOR_SCHEME_STORAGE_KEY, 'dark');
      expect(getAppColorScheme()).toBe('dark');
    });

    it('returns light for unknown stored value', () => {
      localStorage.setItem(APP_COLOR_SCHEME_STORAGE_KEY, 'unknown');
      expect(getAppColorScheme()).toBe('light');
    });
  });

  describe('applyAppColorScheme', () => {
    it('stores the scheme in localStorage', () => {
      applyAppColorScheme('dark');
      expect(localStorage.getItem(APP_COLOR_SCHEME_STORAGE_KEY)).toBe('dark');
    });

    it('sets data-mantine-color-scheme on html element', () => {
      applyAppColorScheme('dark');
      expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
    });

    it('applies light scheme', () => {
      applyAppColorScheme('light');
      expect(localStorage.getItem(APP_COLOR_SCHEME_STORAGE_KEY)).toBe('light');
    });
  });

  describe('resetAppColorScheme', () => {
    it('resets to light', () => {
      applyAppColorScheme('dark');
      resetAppColorScheme();
      expect(getAppColorScheme()).toBe('light');
    });
  });
});
