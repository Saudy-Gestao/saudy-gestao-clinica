import { describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from '../getApiBaseUrl';

describe('getApiBaseUrl', () => {
  it('returns configured VITE_API_URL trimming trailing slash only', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.saudy.com/');

    expect(getApiBaseUrl()).toBe('https://api.saudy.com');

    vi.unstubAllEnvs();
  });

  it('returns configured VITE_API_URL trimming whitespace and trailing slash', () => {
    vi.stubEnv('VITE_API_URL', '  https://api.saudy.com/  ');

    expect(getApiBaseUrl()).toBe('https://api.saudy.com');

    vi.unstubAllEnvs();
  });

  it('returns localhost in DEV when VITE_API_URL is empty', () => {
    vi.stubEnv('VITE_API_URL', '   ');
    vi.stubEnv('DEV', 'true');

    expect(getApiBaseUrl()).toBe('http://localhost:3000');

    vi.unstubAllEnvs();
  });

  it('returns empty string in non-DEV when VITE_API_URL is not set', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('DEV', '');

    expect(getApiBaseUrl()).toBe('');

    vi.unstubAllEnvs();
  });
});
