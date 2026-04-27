import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchReportAddendumDraft, useReportAddendumDraftQuery } from '../useReportAddendumDraftQuery';
import { fetchReportExamsPageData, useReportExamsPageDataQuery } from '../useReportExamsPageDataQuery';
import { fetchReportPreviousReports, useReportPreviousReportsQuery } from '../useReportPreviousReportsQuery';
import { fetchReportSettingsData, useReportSettingsQuery } from '../useReportSettingsQuery';
import { fetchReports, useReportsQuery } from '../useReportsQuery';
import reportAddendumService from '../../services/reportAddendumService';
import reportConfigService from '../../services/reportConfigService';
import reportPhraseService from '../../services/reportPhraseService';
import reportService from '../../services/reportService';
import reportTemplateService from '../../services/reportTemplateService';
import reportWorklistService from '../../services/reportWorklistService';
import procedureService from '../../services/procedureService';
import insuranceService from '../../services/insuranceService';

vi.mock('../../services/reportAddendumService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/reportConfigService', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../../services/reportPhraseService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/reportService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/reportTemplateService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/reportWorklistService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('../../services/procedureService', () => ({
  default: {
    listProcedures: vi.fn(),
  },
}));

vi.mock('../../services/insuranceService', () => ({
  default: {
    listInsurances: vi.fn(),
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

describe('report hooks', () => {
  beforeEach(() => {
    vi.mocked(reportAddendumService.list).mockReset();
    vi.mocked(reportConfigService.get).mockReset();
    vi.mocked(reportPhraseService.list).mockReset();
    vi.mocked(reportService.list).mockReset();
    vi.mocked(reportTemplateService.list).mockReset();
    vi.mocked(reportWorklistService.list).mockReset();
    vi.mocked(procedureService.listProcedures).mockReset();
    vi.mocked(insuranceService.listInsurances).mockReset();
  });

  it('fetches report addendum draft only when report id is present', async () => {
    vi.mocked(reportAddendumService.list)
      .mockResolvedValueOnce([{ id: 'a1' }] as any)
      .mockResolvedValueOnce({ items: [] } as any)
      .mockResolvedValueOnce({ items: [{ id: 'a1' }] } as any);

    await expect(fetchReportAddendumDraft()).resolves.toBeNull();
    await expect(fetchReportAddendumDraft('r1')).resolves.toEqual({ id: 'a1' });
    await expect(fetchReportAddendumDraft('r2')).resolves.toBeNull();

    const disabled = renderHook(() => useReportAddendumDraftQuery(null), { wrapper: createWrapper() });
    expect(disabled.result.current.fetchStatus).toBe('idle');

    const enabled = renderHook(() => useReportAddendumDraftQuery('r1'), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(enabled.result.current.isSuccess).toBe(true);
    });
  });

  it('aggregates page and settings data across report services', async () => {
    vi.mocked(reportService.list)
      .mockResolvedValueOnce({ data: [{ id: 'r2' }] } as any)
      .mockResolvedValueOnce({ items: [{ id: 'r3', exam: 'US', scheduledFor: '2026-01-01', conclusion: 'ok', description: 'desc', status: 'DONE' }] } as any)
      .mockResolvedValueOnce({ items: [{ id: 'r1' }] } as any);
    vi.mocked(reportTemplateService.list).mockResolvedValue({ items: [{ id: 't1' }] } as any);
    vi.mocked(reportPhraseService.list).mockResolvedValue({ items: [{ id: 'p1' }] } as any);
    vi.mocked(reportConfigService.get)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ requiresReviewer: false } as any);
    vi.mocked(reportWorklistService.list).mockResolvedValue({ items: [{ id: 'w1' }] } as any);
    vi.mocked(procedureService.listProcedures).mockResolvedValue({ items: [{ id: 'proc1' }] } as any);
    vi.mocked(insuranceService.listInsurances).mockResolvedValue([{ id: 'ins1' }] as any);

    await expect(fetchReports()).resolves.toEqual([{ id: 'r2' }]);
    await expect(fetchReportPreviousReports(null)).resolves.toEqual([]);
    await expect(fetchReportPreviousReports('123')).resolves.toEqual([
      {
        id: 'r3',
        examType: 'US',
        date: '2026-01-01',
        status: 'DONE',
        summary: 'ok',
        content: 'desc',
      },
    ]);

    const pageData = await fetchReportExamsPageData();
    expect(pageData).toEqual({
      reportData: { items: [{ id: 'r1' }] },
      templateData: { items: [{ id: 't1' }] },
      phraseData: { items: [{ id: 'p1' }] },
      configData: null,
    });

    const settingsData = await fetchReportSettingsData();
    expect(settingsData).toEqual({
      templatesData: { items: [{ id: 't1' }] },
      phrasesData: { items: [{ id: 'p1' }] },
      worklistData: { items: [{ id: 'w1' }] },
      proceduresData: { items: [{ id: 'proc1' }] },
      insurancesData: [{ id: 'ins1' }],
      configData: { requiresReviewer: false },
    });
  });

  it('exposes report query hooks with normalized data and enabled flags', async () => {
    vi.mocked(reportAddendumService.list).mockResolvedValue({ items: [{ id: 'a9' }] } as any);
    vi.mocked(reportService.list).mockImplementation(async (params?: any) => {
      if (params?.search === '123') {
        return { items: [{ id: 'r10', exam: 'CT', scheduledFor: '2026-02-01', description: 'descricao', status: 'DRAFT' }] } as any;
      }

      if (params?.limit === 300) {
        return { items: [{ id: 'r11' }] } as any;
      }

      return { items: [{ id: 'r9' }] } as any;
    });
    vi.mocked(reportTemplateService.list).mockResolvedValue({ items: [{ id: 't9' }] } as any);
    vi.mocked(reportPhraseService.list).mockResolvedValue({ items: [{ id: 'p9' }] } as any);
    vi.mocked(reportConfigService.get).mockResolvedValue({ requiresReviewer: true } as any);
    vi.mocked(reportWorklistService.list).mockResolvedValue({ items: [{ id: 'w9' }] } as any);
    vi.mocked(procedureService.listProcedures).mockResolvedValue({ items: [{ id: 'proc9' }] } as any);
    vi.mocked(insuranceService.listInsurances).mockResolvedValue([{ id: 'ins9' }] as any);

    const reports = renderHook(() => useReportsQuery(), { wrapper: createWrapper() });
    const previousReports = renderHook(() => useReportPreviousReportsQuery('123'), { wrapper: createWrapper() });
    const examsPage = renderHook(() => useReportExamsPageDataQuery(), { wrapper: createWrapper() });
    const settings = renderHook(() => useReportSettingsQuery(), { wrapper: createWrapper() });
    const draft = renderHook(() => useReportAddendumDraftQuery('r9'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(reports.result.current.isSuccess).toBe(true);
      expect(previousReports.result.current.isSuccess).toBe(true);
      expect(examsPage.result.current.isSuccess).toBe(true);
      expect(settings.result.current.isSuccess).toBe(true);
      expect(draft.result.current.isSuccess).toBe(true);
    });

    expect(reports.result.current.data).toEqual([{ id: 'r9' }]);
    expect(previousReports.result.current.data).toEqual([
      {
        id: 'r10',
        examType: 'CT',
        date: '2026-02-01',
        status: 'DRAFT',
        summary: 'descricao',
        content: 'descricao',
      },
    ]);
    expect(examsPage.result.current.data).toEqual(expect.objectContaining({ reportData: { items: [{ id: 'r11' }] } }));
    expect(settings.result.current.data).toEqual(expect.objectContaining({ configData: { requiresReviewer: true } }));
    expect(draft.result.current.data).toEqual({ id: 'a9' });
  });
});