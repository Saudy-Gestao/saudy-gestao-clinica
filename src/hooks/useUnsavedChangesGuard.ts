import { createElement, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';

const UNSAVED_MESSAGE = 'Há alterações não salvas nesta tela.';
export const UNSAVED_CHANGES_SAVED_EVENT = 'saudy:unsaved-changes-saved';

export function notifyUnsavedChangesSaved() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNSAVED_CHANGES_SAVED_EVENT));
  }
}

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
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const dirtyRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const historyIndexRef = useRef<number | null>(typeof window !== 'undefined' ? window.history.state?.idx ?? null : null);
  const currentHrefRef = useRef(typeof window !== 'undefined' ? window.location.href : '');
  const currentStateRef = useRef(typeof window !== 'undefined' ? window.history.state : null);
  const pendingNavigationRef = useRef<PendingNavigation | null>(null);
  const restoringHistoryRef = useRef(false);
  const resolutionRef = useRef<NavigationResolution | null>(null);

  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      if (!pendingNavigationRef.current && !restoringHistoryRef.current) {
        dirtyRef.current = false;
      }
      historyIndexRef.current = window.history.state?.idx ?? null;
      currentHrefRef.current = window.location.href;
      currentStateRef.current = window.history.state;
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

    const handleSavedChanges = () => {
      dirtyRef.current = false;
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);
    const originalGo = window.history.go.bind(window.history);

    const clearPendingNavigation = () => {
      pendingNavigationRef.current = null;
      setPendingNavigation(null);
    };

    const requestNavigationConfirmation = (navigation: PendingNavigation) => {
      if (pendingNavigationRef.current) return false;
      pendingNavigationRef.current = navigation;
      setPendingNavigation(navigation);
      return false;
    };

    const acceptPendingNavigation = () => {
      const navigation = pendingNavigationRef.current;
      if (!navigation) return;

      dirtyRef.current = false;
      clearPendingNavigation();

      if (navigation.kind === 'history') {
        if (navigation.method === 'pushState') {
          originalPushState(navigation.state, navigation.unused, navigation.url);
        } else {
          originalReplaceState(navigation.state, navigation.unused, navigation.url);
        }
        historyIndexRef.current = navigation.state && typeof navigation.state === 'object' && 'idx' in navigation.state
          ? Number((navigation.state as { idx?: unknown }).idx)
          : historyIndexRef.current;
        currentHrefRef.current = window.location.href;
        currentStateRef.current = window.history.state;
        return;
      }

      if (navigation.targetIndex !== null && navigation.currentIndex !== null) {
        originalGo(navigation.targetIndex - navigation.currentIndex);
        return;
      }

      // Browser history entries created outside the router may not have an idx.
      // Recreate the accepted transition and notify the router explicitly.
      originalPushState(navigation.state, '', navigation.targetHref);
      window.dispatchEvent(new PopStateEvent('popstate', { state: navigation.state }));
    };

    const cancelPendingNavigation = () => {
      const navigation = pendingNavigationRef.current;
      if (!navigation) return;

      if (navigation.kind === 'history') {
        clearPendingNavigation();
        return;
      }

      // The browser already moved to the requested entry before firing
      // popstate. Move back while the prompt is open so the form stays visible.
      if (navigation.targetIndex !== null && navigation.currentIndex !== null) {
        restoringHistoryRef.current = true;
        originalGo(navigation.currentIndex - navigation.targetIndex);
        return;
      }

      restoringHistoryRef.current = true;
      originalReplaceState(currentStateRef.current, '', navigation.currentHref);
      window.dispatchEvent(new PopStateEvent('popstate', { state: currentStateRef.current }));
    };

    resolutionRef.current = {
      accept: acceptPendingNavigation,
      cancel: cancelPendingNavigation,
    };

    const guardedPushState = (state: unknown, unused: string, url?: string | URL | null) => {
      if (pendingNavigationRef.current) return;
      if (dirtyRef.current) {
        requestNavigationConfirmation({ kind: 'history', method: 'pushState', state, unused, url });
        return;
      }
      originalPushState(state, unused, url);
      historyIndexRef.current = state && typeof state === 'object' && 'idx' in state
        ? Number((state as { idx?: unknown }).idx)
        : historyIndexRef.current;
      currentHrefRef.current = window.location.href;
      currentStateRef.current = window.history.state;
    };

    const guardedReplaceState = (state: unknown, unused: string, url?: string | URL | null) => {
      if (pendingNavigationRef.current) return;
      if (dirtyRef.current) {
        requestNavigationConfirmation({ kind: 'history', method: 'replaceState', state, unused, url });
        return;
      }
      originalReplaceState(state, unused, url);
      historyIndexRef.current = state && typeof state === 'object' && 'idx' in state
        ? Number((state as { idx?: unknown }).idx)
        : historyIndexRef.current;
      currentHrefRef.current = window.location.href;
      currentStateRef.current = window.history.state;
    };

    const handlePopState = (event: PopStateEvent) => {
      if (restoringHistoryRef.current) {
        restoringHistoryRef.current = false;
        historyIndexRef.current = event.state?.idx ?? historyIndexRef.current;
        currentHrefRef.current = window.location.href;
        currentStateRef.current = event.state;
        clearPendingNavigation();
        return;
      }
      if (pendingNavigationRef.current) return;
      if (!dirtyRef.current) {
        historyIndexRef.current = event.state?.idx ?? historyIndexRef.current;
        currentHrefRef.current = window.location.href;
        currentStateRef.current = event.state;
        return;
      }

      const nextIndex = typeof event.state?.idx === 'number' ? event.state.idx : null;
      const currentIndex = historyIndexRef.current;
      const navigation: PendingNavigation = {
        kind: 'popstate',
        state: event.state,
        targetIndex: nextIndex,
        currentIndex,
        targetHref: window.location.href,
        currentHref: currentHrefRef.current,
        currentState: currentStateRef.current,
      };
      requestNavigationConfirmation(navigation);

      if (nextIndex !== null && currentIndex !== null && nextIndex !== currentIndex) {
        restoringHistoryRef.current = true;
        originalGo(currentIndex - nextIndex);
      } else {
        // Keep the current form mounted when the entry has no router index.
        restoringHistoryRef.current = true;
        originalReplaceState(currentStateRef.current, '', currentHrefRef.current);
        window.dispatchEvent(new PopStateEvent('popstate', { state: currentStateRef.current }));
      }
    };

    document.addEventListener('input', handleFieldChange, true);
    document.addEventListener('change', handleFieldChange, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener(UNSAVED_CHANGES_SAVED_EVENT, handleSavedChanges);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState = guardedPushState as History['pushState'];
    window.history.replaceState = guardedReplaceState as History['replaceState'];

    return () => {
      document.removeEventListener('input', handleFieldChange, true);
      document.removeEventListener('change', handleFieldChange, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener(UNSAVED_CHANGES_SAVED_EVENT, handleSavedChanges);
      window.removeEventListener('popstate', handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      resolutionRef.current = null;
      pendingNavigationRef.current = null;
    };
  }, []);

  return {
    pendingNavigation,
    acceptPendingNavigation: () => resolutionRef.current?.accept(),
    cancelPendingNavigation: () => resolutionRef.current?.cancel(),
  };
}

export function UnsavedChangesGuard() {
  const { pendingNavigation, acceptPendingNavigation, cancelPendingNavigation } = useUnsavedChangesGuard();

  return createElement(UnsavedChangesDialog, {
    opened: Boolean(pendingNavigation),
    onStay: cancelPendingNavigation,
    onLeave: acceptPendingNavigation,
  });
}

type HistoryNavigation = {
  kind: 'history';
  method: 'pushState' | 'replaceState';
  state: unknown;
  unused: string;
  url?: string | URL | null;
};

type PopstateNavigation = {
  kind: 'popstate';
  state: unknown;
  targetIndex: number | null;
  currentIndex: number | null;
  targetHref: string;
  currentHref: string;
  currentState: unknown;
};

type PendingNavigation = HistoryNavigation | PopstateNavigation;

type NavigationResolution = {
  accept: () => void;
  cancel: () => void;
};
