import { useQuery } from '@tanstack/react-query';
import teaProfileService from '../services/teaProfileService';
import { queryKeys } from '../lib/queryKeys';

type Params = {
  teaProfileId?: string | null;
  startDate?: string;
  endDate?: string;
};

export const fetchTeaReport = async (params: Params) => {
  if (!params.teaProfileId) return null;
  return teaProfileService.getReport(params.teaProfileId, {
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
  });
};

export const useTeaReportQuery = (params: Params) => useQuery({
  queryKey: [...queryKeys.teaReports, params.teaProfileId || '', params.startDate || '', params.endDate || ''],
  queryFn: () => fetchTeaReport(params),
  enabled: Boolean(params.teaProfileId),
  refetchInterval: 30_000,
});
