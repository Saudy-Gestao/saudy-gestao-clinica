import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchMyTickets, useMyTicketsQuery } from '../useMyTicketsQuery';
import { fetchReceptionQueue, useReceptionQueueQuery } from '../useReceptionQueueQuery';
import { fetchClinicalQueue, useClinicalQueueQuery } from '../useClinicalQueueQuery';
import { usePublicBranchInfoQuery } from '../usePublicBranchInfoQuery';
import { fetchWhatsAppConfig, useWhatsAppConfigQuery } from '../useWhatsAppConfigQuery';
import ticketService from '../../services/ticketService';
import preAttendanceService from '../../services/preAttendanceService';
import consultationService from '../../services/consultationService';
import publicCheckInService from '../../services/publicCheckInService';
import whatsappService from '../../services/whatsappService';

vi.mock('../../services/ticketService', () => ({
  default: {
    listMine: vi.fn(),
  },
}));

vi.mock('../../services/preAttendanceService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/consultationService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/publicCheckInService', () => ({
  default: {
    getBranchInfo: vi.fn(),
  },
}));

vi.mock('../../services/whatsappService', () => ({
  default: {
    getConfig: vi.fn(),
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

describe('queue and public hooks', () => {
  it('fetchMyTickets forwards filters to service', async () => {
    vi.mocked(ticketService.listMine).mockResolvedValue([] as any);

    await fetchMyTickets({ status: 'OPEN', type: 'SUPPORT', search: 'abc' } as any);

    expect(ticketService.listMine).toHaveBeenCalledWith({ status: 'OPEN', type: 'SUPPORT', search: 'abc' });
  });

  it('useMyTicketsQuery resolves service result', async () => {
    vi.mocked(ticketService.listMine).mockResolvedValue([{ id: 't1' }] as any);

    const { result } = renderHook(() => useMyTicketsQuery({ search: 'joao' } as any), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 't1' }]);
  });

  it('reception and clinical queue fetchers normalize array/items/data payloads', async () => {
    vi.mocked(preAttendanceService.list)
      .mockResolvedValueOnce([{ id: 'r1' }] as any)
      .mockResolvedValueOnce({ items: [{ id: 'r2' }] } as any)
      .mockResolvedValueOnce({ data: [{ id: 'r3' }] } as any);

    vi.mocked(consultationService.list)
      .mockResolvedValueOnce([{ id: 'c1' }] as any)
      .mockResolvedValueOnce({ items: [{ id: 'c2' }] } as any)
      .mockResolvedValueOnce({ data: [{ id: 'c3' }] } as any);

    expect(await fetchReceptionQueue()).toEqual([{ id: 'r1' }]);
    expect(await fetchReceptionQueue()).toEqual([{ id: 'r2' }]);
    expect(await fetchReceptionQueue()).toEqual([{ id: 'r3' }]);

    expect(await fetchClinicalQueue()).toEqual([{ id: 'c1' }]);
    expect(await fetchClinicalQueue()).toEqual([{ id: 'c2' }]);
    expect(await fetchClinicalQueue()).toEqual([{ id: 'c3' }]);

    expect(preAttendanceService.list).toHaveBeenCalledWith({ queueType: 'Autorização e Recepção' });
    expect(consultationService.list).toHaveBeenCalledWith({ queueType: 'Fila clínica', limit: 200 });
  });

  it('queue hooks expose normalized query data', async () => {
    vi.mocked(preAttendanceService.list).mockResolvedValue({ items: [{ id: 'r9' }] } as any);
    vi.mocked(consultationService.list).mockResolvedValue({ data: [{ id: 'c9' }] } as any);

    const reception = renderHook(() => useReceptionQueueQuery(), { wrapper: createWrapper() });
    const clinical = renderHook(() => useClinicalQueueQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(reception.result.current.isSuccess).toBe(true);
      expect(clinical.result.current.isSuccess).toBe(true);
    });

    expect(reception.result.current.data).toEqual([{ id: 'r9' }]);
    expect(clinical.result.current.data).toEqual([{ id: 'c9' }]);
  });

  it('public branch info query is disabled without branch id', async () => {
    const noBranch = renderHook(() => usePublicBranchInfoQuery(undefined), {
      wrapper: createWrapper(),
    });

    expect(noBranch.result.current.fetchStatus).toBe('idle');
    expect(publicCheckInService.getBranchInfo).not.toHaveBeenCalled();

    vi.mocked(publicCheckInService.getBranchInfo).mockResolvedValue({ id: 'b1' } as any);
    const active = renderHook(() => usePublicBranchInfoQuery('b1', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(active.result.current.isSuccess).toBe(true);
    });

    expect(publicCheckInService.getBranchInfo).toHaveBeenCalledWith('b1');
  });

  it('fetchWhatsAppConfig and hook call service with options', async () => {
    vi.mocked(whatsappService.getConfig).mockResolvedValue({ branchId: 'b1' } as any);

    const fetched = await fetchWhatsAppConfig({ scope: 'BRANCH', branchId: 'b1' } as any);
    expect(fetched).toEqual({ branchId: 'b1' });

    const { result } = renderHook(
      () => useWhatsAppConfigQuery({ scope: 'BRANCH', branchId: 'b1' } as any),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(whatsappService.getConfig).toHaveBeenCalledWith({ scope: 'BRANCH', branchId: 'b1' });
  });
});
