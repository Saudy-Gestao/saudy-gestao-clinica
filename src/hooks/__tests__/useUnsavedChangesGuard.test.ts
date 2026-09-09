import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnsavedChangesGuard, useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

const wrapper = ({ children, path = '/cadastro-cliente' }: { children: React.ReactNode; path?: string }) =>
  createElement(MemoryRouter, { initialEntries: [path] }, children);

describe('useUnsavedChangesGuard', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('renders without crashing on a protected route', () => {
    const { unmount } = renderHook(() => useUnsavedChangesGuard(), {
      wrapper: (props) => wrapper({ ...props, path: '/cadastro-cliente' }),
    });
    unmount();
  });

  it('marks dirty on input change within a protected route and blocks beforeunload/popstate', () => {
    window.history.pushState({}, '', '/cadastro-cliente');
    renderHook(() => useUnsavedChangesGuard(), {
      wrapper: (props) => wrapper({ ...props, path: '/cadastro-cliente' }),
    });

    const input = document.createElement('input');
    input.name = 'nome';
    document.body.appendChild(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(true);

    window.history.pushState({ idx: 1 }, '', '/cadastro-cliente');

    document.body.removeChild(input);
  });

  it('ignores search-like fields and disabled/readonly inputs', () => {
    window.history.pushState({}, '', '/cadastro-cliente');
    renderHook(() => useUnsavedChangesGuard(), {
      wrapper: (props) => wrapper({ ...props, path: '/cadastro-cliente' }),
    });

    const searchInput = document.createElement('input');
    searchInput.setAttribute('placeholder', 'Buscar paciente');
    document.body.appendChild(searchInput);
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    const disabledInput = document.createElement('input');
    disabledInput.disabled = true;
    document.body.appendChild(disabledInput);
    disabledInput.dispatchEvent(new Event('change', { bubbles: true }));

    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(false);

    document.body.removeChild(searchInput);
    document.body.removeChild(disabledInput);
  });

  it('does not guard fields outside protected routes', () => {
    window.history.pushState({}, '', '/dashboard');
    renderHook(() => useUnsavedChangesGuard(), {
      wrapper: (props) => wrapper({ ...props, path: '/dashboard' }),
    });

    const input = document.createElement('input');
    input.name = 'busca';
    document.body.appendChild(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(false);

    document.body.removeChild(input);
  });

  it('UnsavedChangesGuard component renders null', () => {
    const { result, unmount } = renderHook(() => UnsavedChangesGuard(), { wrapper });
    expect(result.current).toBeNull();
    unmount();
  });
});
