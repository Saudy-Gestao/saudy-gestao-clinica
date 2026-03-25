const normalizeUrl = (value?: string | null) => {
  const trimmed = String(value || '').trim();
  return trimmed.replace(/\/$/, '');
};

export const getApiBaseUrl = () => {
  const configuredUrl = normalizeUrl(import.meta.env.VITE_API_URL);
  if (configuredUrl) return configuredUrl;

  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  return '';
};

