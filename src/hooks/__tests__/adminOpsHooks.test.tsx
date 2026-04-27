import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchFinanceEntries, useFinanceEntriesQuery } from '../useFinanceEntriesQuery';
import { fetchInvoices, useInvoicesQuery } from '../useInvoicesQuery';
import { fetchInventoryItems, useInventoryItemsQuery } from '../useInventoryItemsQuery';
import { fetchDeliveries, useDeliveriesQuery } from '../useDeliveriesQuery';
import financeService from '../../services/financeService';
import invoiceService from '../../services/invoiceService';
import inventoryService from '../../services/inventoryService';
import deliveryService from '../../services/deliveryService';

vi.mock('../../services/financeService', () => ({
  default: {
    getEntries: vi.fn(),
  },
}));

vi.mock('../../services/invoiceService', () => ({
  default: {
    getInvoices: vi.fn(),
  },
}));

vi.mock('../../services/inventoryService', () => ({
  default: {
    getItems: vi.fn(),
  },
}));

vi.mock('../../services/deliveryService', () => ({
  default: {
    getDeliveries: vi.fn(),
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

describe('admin ops hooks', () => {
  it('normalizes finance/invoice/inventory/deliveries payloads', async () => {
    vi.mocked(financeService.getEntries)
      .mockResolvedValueOnce([{ id: 'f1' }] as any)
      .mockResolvedValueOnce({ data: [{ id: 'f2' }] } as any)
      .mockResolvedValueOnce({ items: [{ id: 'f3' }] } as any);

    vi.mocked(invoiceService.getInvoices)
      .mockResolvedValueOnce([{ id: 'i1' }] as any)
      .mockResolvedValueOnce({ items: [{ id: 'i2' }] } as any)
      .mockResolvedValueOnce({ x: 1 } as any);

    vi.mocked(inventoryService.getItems)
      .mockResolvedValueOnce([{ id: 'v1' }] as any)
      .mockResolvedValueOnce({ data: [{ id: 'v2' }] } as any)
      .mockResolvedValueOnce({ items: [{ id: 'v3' }] } as any);

    vi.mocked(deliveryService.getDeliveries)
      .mockResolvedValueOnce([{ id: 'd1' }] as any)
      .mockResolvedValueOnce({ items: [{ id: 'd2' }] } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'd3' }] } } as any)
      .mockResolvedValueOnce({ data: [{ id: 'd4' }] } as any);

    expect(await fetchFinanceEntries()).toEqual([{ id: 'f1' }]);
    expect(await fetchFinanceEntries()).toEqual([{ id: 'f2' }]);
    expect(await fetchFinanceEntries()).toEqual([{ id: 'f3' }]);

    expect(await fetchInvoices()).toEqual([{ id: 'i1' }]);
    expect(await fetchInvoices()).toEqual([{ id: 'i2' }]);
    expect(await fetchInvoices()).toEqual([]);

    expect(await fetchInventoryItems()).toEqual([{ id: 'v1' }]);
    expect(await fetchInventoryItems()).toEqual([{ id: 'v2' }]);
    expect(await fetchInventoryItems()).toEqual([{ id: 'v3' }]);

    expect(await fetchDeliveries()).toEqual([{ id: 'd1' }]);
    expect(await fetchDeliveries()).toEqual([{ id: 'd2' }]);
    expect(await fetchDeliveries()).toEqual([{ id: 'd3' }]);
    expect(await fetchDeliveries()).toEqual([{ id: 'd4' }]);
  });

  it('hooks expose normalized query data', async () => {
    vi.mocked(financeService.getEntries).mockResolvedValue({ data: [{ id: 'f9' }] } as any);
    vi.mocked(invoiceService.getInvoices).mockResolvedValue({ items: [{ id: 'i9' }] } as any);
    vi.mocked(inventoryService.getItems).mockResolvedValue({ items: [{ id: 'v9' }] } as any);
    vi.mocked(deliveryService.getDeliveries).mockResolvedValue({ data: [{ id: 'd9' }] } as any);

    const finance = renderHook(() => useFinanceEntriesQuery(), { wrapper: createWrapper() });
    const invoices = renderHook(() => useInvoicesQuery(), { wrapper: createWrapper() });
    const inventory = renderHook(() => useInventoryItemsQuery(), { wrapper: createWrapper() });
    const deliveries = renderHook(() => useDeliveriesQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(finance.result.current.isSuccess).toBe(true);
      expect(invoices.result.current.isSuccess).toBe(true);
      expect(inventory.result.current.isSuccess).toBe(true);
      expect(deliveries.result.current.isSuccess).toBe(true);
    });

    expect(finance.result.current.data).toEqual([{ id: 'f9' }]);
    expect(invoices.result.current.data).toEqual([{ id: 'i9' }]);
    expect(inventory.result.current.data).toEqual([{ id: 'v9' }]);
    expect(deliveries.result.current.data).toEqual([{ id: 'd9' }]);
  });
});
