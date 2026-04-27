import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchWhatsAppPageData, useWhatsAppPageDataQuery } from '../useWhatsAppPageDataQuery';
import whatsappService from '../../services/whatsappService';

vi.mock('../../services/whatsappService', () => ({
  default: {
    listTemplates: vi.fn(),
    getNotificationConfig: vi.fn(),
    getAvailableVariables: vi.fn(),
    listLogs: vi.fn(),
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

describe('useWhatsAppPageDataQuery', () => {
  it('fetches and normalizes whatsapp page data', async () => {
    vi.mocked(whatsappService.listTemplates).mockResolvedValue([{ id: 't1' }] as any);
    vi.mocked(whatsappService.getNotificationConfig).mockResolvedValue({ id: 'n1' } as any);
    vi.mocked(whatsappService.getAvailableVariables).mockResolvedValue([{ key: 'patient_name' }] as any);
    vi.mocked(whatsappService.listLogs).mockResolvedValue({ items: [{ id: 'l1' }] } as any);

    await expect(fetchWhatsAppPageData()).resolves.toEqual({
      templates: [{ id: 't1' }],
      notificationConfig: { id: 'n1' },
      variables: [{ key: 'patient_name' }],
      logs: [{ id: 'l1' }],
    });

    const { result } = renderHook(() => useWhatsAppPageDataQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(whatsappService.listLogs).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    expect(result.current.data).toEqual({
      templates: [{ id: 't1' }],
      notificationConfig: { id: 'n1' },
      variables: [{ key: 'patient_name' }],
      logs: [{ id: 'l1' }],
    });
  });

  it('falls back to empty collections when payloads are not arrays', async () => {
    vi.mocked(whatsappService.listTemplates).mockResolvedValue({ items: [{ id: 'x' }] } as any);
    vi.mocked(whatsappService.getNotificationConfig).mockResolvedValue(null as any);
    vi.mocked(whatsappService.getAvailableVariables).mockResolvedValue({ key: 'x' } as any);
    vi.mocked(whatsappService.listLogs).mockResolvedValue({ data: [] } as any);

    await expect(fetchWhatsAppPageData()).resolves.toEqual({
      templates: [],
      notificationConfig: null,
      variables: [],
      logs: [],
    });
  });
});