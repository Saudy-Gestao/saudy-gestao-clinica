import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnsavedChangesGuard, notifyUnsavedChangesSaved, useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

const wrapper = ({ children, path = '/cadastro-cliente' }: { children: React.ReactNode; path?: string }) =>
  createElement(MemoryRouter, { initialEntries: [path] }, children);

describe('useUnsavedChangesGuard', () => {
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
    act(() => input.dispatchEvent(new Event('input', { bubbles: true })));

    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(true);

    document.body.removeChild(input);
  });

  it('opens the Saudy prompt and resolves internal navigation from its actions', () => {
    window.history.pushState({}, '', '/cadastro-cliente');
    render(
      createElement(MemoryRouter, { initialEntries: ['/cadastro-cliente'] }, createElement(UnsavedChangesGuard)),
    );

    const input = document.createElement('input');
    input.name = 'nome';
    document.body.appendChild(input);
    act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
    act(() => window.history.pushState({ idx: 1 }, '', '/dashboard'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Este formulário tem dados pendentes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => window.history.pushState({ idx: 2 }, '', '/dashboard-2'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sair sem salvar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

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

  it('clears the dirty state after a successful save signal', () => {
    window.history.pushState({}, '', '/cadastro-cliente');
    const { result } = renderHook(() => useUnsavedChangesGuard(), {
      wrapper: (props) => wrapper({ ...props, path: '/cadastro-cliente' }),
    });

    const input = document.createElement('input');
    input.name = 'nome';
    document.body.appendChild(input);
    act(() => input.dispatchEvent(new Event('input', { bubbles: true })));

    act(() => notifyUnsavedChangesSaved());

    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(false);

    act(() => window.history.pushState({ idx: 1 }, '', '/dashboard'));
    expect(result.current.pendingNavigation).toBeNull();

    document.body.removeChild(input);
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

  it('UnsavedChangesGuard renders the prompt host without crashing', () => {
    const { result, unmount } = renderHook(() => UnsavedChangesGuard(), { wrapper });
    expect(result.current).toBeTruthy();
    unmount();
  });
});
