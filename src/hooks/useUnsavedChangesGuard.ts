import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const UNSAVED_MESSAGE = 'Existem dados preenchidos que ainda não foram salvos. Deseja sair desta tela mesmo assim?';

const isProtectedRoute = (pathname: string) => (
  pathname === '/cadastro'
  || pathname.startsWith('/cadastro-')
  || pathname.startsWith('/convenios/novo')
  || pathname.startsWith('/convenios/')
  || pathname.startsWith('/tea/cadastro')
  || pathname.startsWith('/tea/pacientes')
  || pathname.startsWith('/tea/plano')
);

const isIgnoredField = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return true;
  if (!target.matches('input, textarea, select, [contenteditable="true"]')) return true;
  if (target.closest('[data-ignore-unsaved-changes]')) return true;
  if ((target as HTMLInputElement).disabled || (target as HTMLInputElement).readOnly) return true;
  if (target instanceof HTMLInputElement && ['hidden', 'search', 'file'].includes(target.type)) return true;

  const text = [
    target.getAttribute('aria-label'),
    target.getAttribute('placeholder'),
    target.getAttribute('name'),
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes('buscar') || text.includes('pesquisar') || text.includes('search');
};

export function useUnsavedChangesGuard() {
  const { pathname } = useLocation();
  const dirtyRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const historyIndexRef = useRef<number | null>(typeof window !== 'undefined' ? window.history.state?.idx ?? null : null);

  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      dirtyRef.current = false;
      historyIndexRef.current = window.history.state?.idx ?? null;
    }
  }, [pathname]);

  useEffect(() => {
    const handleFieldChange = (event: Event) => {
      if (isProtectedRoute(window.location.pathname) && !isIgnoredField(event.target)) {
        dirtyRef.current = true;
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = UNSAVED_MESSAGE;
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);
    let restoringHistory = false;

    const confirmNavigation = () => {
      if (!dirtyRef.current) return true;
      const shouldLeave = window.confirm(UNSAVED_MESSAGE);
      if (shouldLeave) dirtyRef.current = false;
      return shouldLeave;
    };

    const guardedPushState = (state: unknown, unused: string, url?: string | URL | null) => {
      if (!confirmNavigation()) return;
      originalPushState(state, unused, url);
      historyIndexRef.current = state && typeof state === 'object' && 'idx' in state
        ? Number((state as { idx?: unknown }).idx)
        : historyIndexRef.current;
    };

    const guardedReplaceState = (state: unknown, unused: string, url?: string | URL | null) => {
      if (!confirmNavigation()) return;
      originalReplaceState(state, unused, url);
      historyIndexRef.current = state && typeof state === 'object' && 'idx' in state
        ? Number((state as { idx?: unknown }).idx)
        : historyIndexRef.current;
    };

    const handlePopState = (event: PopStateEvent) => {
      if (restoringHistory) {
        restoringHistory = false;
        historyIndexRef.current = event.state?.idx ?? historyIndexRef.current;
        return;
      }
      if (!dirtyRef.current) {
        historyIndexRef.current = event.state?.idx ?? historyIndexRef.current;
        return;
      }

      if (window.confirm(UNSAVED_MESSAGE)) {
        dirtyRef.current = false;
        historyIndexRef.current = event.state?.idx ?? historyIndexRef.current;
        return;
      }

      const nextIndex = typeof event.state?.idx === 'number' ? event.state.idx : null;
      const currentIndex = historyIndexRef.current;
      if (nextIndex !== null && currentIndex !== null && nextIndex !== currentIndex) {
        restoringHistory = true;
        window.history.go(nextIndex < currentIndex ? 1 : -1);
      } else {
        restoringHistory = true;
        originalPushState(window.history.state, '', window.location.href);
      }
    };

    document.addEventListener('input', handleFieldChange, true);
    document.addEventListener('change', handleFieldChange, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState = guardedPushState as History['pushState'];
    window.history.replaceState = guardedReplaceState as History['replaceState'];

    return () => {
      document.removeEventListener('input', handleFieldChange, true);
      document.removeEventListener('change', handleFieldChange, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);
}

export function UnsavedChangesGuard() {
  useUnsavedChangesGuard();
  return null;
}
