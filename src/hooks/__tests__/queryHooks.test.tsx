import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchPreSchedulings, usePreSchedulingsQuery } from '../usePreSchedulingsQuery';
import { useAdminTicketsQuery } from '../useAdminTicketsQuery';
import { useCurrentUserProfileQuery } from '../useCurrentUserProfileQuery';
import { usePublicPreSchedulingMetaQuery } from '../usePublicPreSchedulingMetaQuery';
import preSchedulingService from '../../services/preSchedulingService';
import ticketService from '../../services/ticketService';
import userService from '../../services/userService';
import authService from '../../services/authService';

vi.mock('../../services/preSchedulingService', () => ({
  default: {
    list: vi.fn(),
    getPublicMeta: vi.fn(),
  },
}));

vi.mock('../../services/ticketService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/userService', () => ({
  default: {
    getUser: vi.fn(),
  },
}));

vi.mock('../../services/authService', () => ({
  default: {
    getCurrentUser: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('query hooks', () => {
  it('fetchPreSchedulings maps API list into items array', async () => {
    vi.mocked(preSchedulingService.list).mockResolvedValue({ items: [{ id: 'ps1' }] } as any);

    const result = await fetchPreSchedulings({ search: 'ana', status: 'PENDENTE', resolvedOnly: false });

    expect(preSchedulingService.list).toHaveBeenCalledWith({
      search: 'ana',
      status: 'PENDENTE',
      resolvedOnly: false,
      limit: 500,
    });
    expect(result).toEqual([{ id: 'ps1' }]);
  });

  it('usePreSchedulingsQuery returns empty list when API payload has no items', async () => {
    vi.mocked(preSchedulingService.list).mockResolvedValue({ total: 1 } as any);

    const { result } = renderHook(
      () => usePreSchedulingsQuery({ search: '', status: null, resolvedOnly: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('useAdminTicketsQuery calls ticket service with provided filters', async () => {
    vi.mocked(ticketService.list).mockResolvedValue([] as any);

    const { result } = renderHook(
      () => useAdminTicketsQuery({ status: 'OPEN', priority: 'HIGH', sort: 'NEWEST', search: 'joao' } as any),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(ticketService.list).toHaveBeenCalledWith({
      status: 'OPEN',
      priority: 'HIGH',
      sort: 'NEWEST',
      search: 'joao',
    });
  });

  it('useCurrentUserProfileQuery uses cached user and keeps query disabled when no user id', async () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue({ name: 'Sem ID' } as any);

    const { result } = renderHook(() => useCurrentUserProfileQuery(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(userService.getUser).not.toHaveBeenCalled();
  });

  it('useCurrentUserProfileQuery returns cached user initial data without immediate fetch', async () => {
    vi.mocked(authService.getCurrentUser).mockReturnValue({ id: 'u1', name: 'Maria' } as any);
    vi.mocked(userService.getUser).mockResolvedValue({ id: 'u1', name: 'Maria Atualizada' } as any);

    const { result } = renderHook(() => useCurrentUserProfileQuery(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toMatchObject({ id: 'u1', name: 'Maria' });
    expect(userService.getUser).not.toHaveBeenCalled();
  });

  it('usePublicPreSchedulingMetaQuery only fetches when token exists', async () => {
    vi.mocked(preSchedulingService.getPublicMeta).mockResolvedValue({ id: 'meta1' } as any);

    const noToken = renderHook(() => usePublicPreSchedulingMetaQuery(''), {
      wrapper: createWrapper(),
    });
    expect(preSchedulingService.getPublicMeta).not.toHaveBeenCalled();
    expect(noToken.result.current.fetchStatus).toBe('idle');

    const withToken = renderHook(() => usePublicPreSchedulingMetaQuery('token-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(withToken.result.current.isSuccess).toBe(true);
    });

    expect(preSchedulingService.getPublicMeta).toHaveBeenCalledWith('token-1');
    expect(withToken.result.current.data).toEqual({ id: 'meta1' });
  });
});
