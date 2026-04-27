import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { fetchTissBatches, useTissBatchesQuery } from '../useTissBatchesQuery';
import tissBatchService from '../../services/tissBatchService';

vi.mock('../../services/tissBatchService', () => ({
  default: {
    list: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('tiss batches hook', () => {
  beforeEach(() => {
    vi.mocked(tissBatchService.list).mockReset();
  });

  it('fetchTissBatches returns normalized items list', async () => {
    vi.mocked(tissBatchService.list).mockResolvedValue({ items: [{ id: 'b1' }, { id: 'b2' }] } as any);

    const result = await fetchTissBatches();
    expect(result).toEqual([{ id: 'b1' }, { id: 'b2' }]);
  });

  it('fetchTissBatches returns empty list when payload has no items', async () => {
    vi.mocked(tissBatchService.list).mockResolvedValue({ data: [] } as any);

    const result = await fetchTissBatches();
    expect(result).toEqual([]);
  });

  it('useTissBatchesQuery exposes fetched data', async () => {
    vi.mocked(tissBatchService.list).mockResolvedValue({ items: [{ id: 'batch-1' }] } as any);

    const { result } = renderHook(() => useTissBatchesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'batch-1' }]);
  });
});
