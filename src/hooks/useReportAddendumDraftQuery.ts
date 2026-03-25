import { useQuery } from '@tanstack/react-query';
import reportAddendumService from '../services/reportAddendumService';
import { queryKeys } from '../lib/queryKeys';

export const fetchReportAddendumDraft = async (reportId?: string | null) => {
  if (!reportId) return null;

  const data = await reportAddendumService.list({ reportId, status: 'draft', limit: 1, offset: 0 });
  const list = Array.isArray(data)
    ? data
    : (Array.isArray(data?.items) ? data.items : []);

  return list[0] || null;
};

export const useReportAddendumDraftQuery = (reportId?: string | null, enabled = true) => useQuery({
  queryKey: [...queryKeys.reportAddendumDraft, reportId || ''],
  queryFn: () => fetchReportAddendumDraft(reportId),
  enabled: enabled && Boolean(reportId),
});
