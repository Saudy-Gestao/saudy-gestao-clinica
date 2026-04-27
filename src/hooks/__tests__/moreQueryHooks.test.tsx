import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchAppointments, useAppointmentsQuery } from '../useAppointmentsQuery';
import { useAdminLeadsQuery } from '../useAdminLeadsQuery';
import { useBranchSettingsQuery } from '../useBranchSettingsQuery';
import appointmentService from '../../services/appointmentService';
import leadService from '../../services/leadService';
import branchSettingsService from '../../services/branchSettingsService';

vi.mock('../../services/appointmentService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/leadService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/branchSettingsService', () => ({
  default: {
    getBranchSettings: vi.fn(),
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

describe('more query hooks', () => {
  it('fetchAppointments normalizes array/items/data payloads', async () => {
    vi.mocked(appointmentService.list)
      .mockResolvedValueOnce([{ id: 'a1' }] as any)
      .mockResolvedValueOnce({ items: [{ id: 'a2' }] } as any)
      .mockResolvedValueOnce({ data: [{ id: 'a3' }] } as any);

    const direct = await fetchAppointments();
    const items = await fetchAppointments();
    const data = await fetchAppointments();

    expect(direct).toEqual([{ id: 'a1' }]);
    expect(items).toEqual([{ id: 'a2' }]);
    expect(data).toEqual([{ id: 'a3' }]);
    expect(appointmentService.list).toHaveBeenCalledWith({ limit: 2000, offset: 0 });
  });

  it('useAppointmentsQuery fetches and exposes normalized result', async () => {
    vi.mocked(appointmentService.list).mockResolvedValue({ items: [{ id: 'a9' }] } as any);

    const { result } = renderHook(() => useAppointmentsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'a9' }]);
  });

  it('useAdminLeadsQuery forwards filters to lead service', async () => {
    vi.mocked(leadService.list).mockResolvedValue({ items: [], total: 0 } as any);

    const { result } = renderHook(
      () => useAdminLeadsQuery({ status: 'NEW', search: 'clinica' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(leadService.list).toHaveBeenCalledWith({ status: 'NEW', search: 'clinica' });
  });

  it('useBranchSettingsQuery fetches only when branch id is available', async () => {
    vi.mocked(branchSettingsService.getBranchSettings).mockResolvedValue({ id: 'bs1', branchId: 'b1' } as any);

    const disabled = renderHook(() => useBranchSettingsQuery(null), {
      wrapper: createWrapper(),
    });

    expect(disabled.result.current.fetchStatus).toBe('idle');
    expect(branchSettingsService.getBranchSettings).not.toHaveBeenCalled();

    const enabled = renderHook(() => useBranchSettingsQuery('b1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(enabled.result.current.isSuccess).toBe(true);
    });

    expect(branchSettingsService.getBranchSettings).toHaveBeenCalledWith('b1');
  });
});
