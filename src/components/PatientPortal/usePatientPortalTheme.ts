import { useEffect, useMemo, useState } from 'react';

export type PatientPortalTheme = 'light' | 'dark';

const STORAGE_KEY = 'patient_portal_theme';
const ATTRIBUTE_KEY = 'data-patient-portal-theme';

const getInitialTheme = (): PatientPortalTheme => {
  if (typeof window === 'undefined') return 'light';
  const saved = String(localStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase();
  if (saved === 'dark' || saved === 'light') return saved as PatientPortalTheme;

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export function usePatientPortalTheme() {
  const [theme, setTheme] = useState<PatientPortalTheme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute(ATTRIBUTE_KEY, theme);
    localStorage.setItem(STORAGE_KEY, theme);
    return () => {
      document.documentElement.removeAttribute(ATTRIBUTE_KEY);
    };
  }, [theme]);

  const isDark = useMemo(() => theme === 'dark', [theme]);
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, isDark, toggleTheme };
}

