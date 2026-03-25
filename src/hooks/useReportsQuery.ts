import { useQuery } from '@tanstack/react-query';
import reportService from '../services/reportService';
import { queryKeys } from '../lib/queryKeys';

export const fetchReports = async () => {
  const data: any = await reportService.list();
  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data)
        ? data.data
        : []));
};

export const useReportsQuery = () => useQuery({
  queryKey: queryKeys.reports,
  queryFn: fetchReports,
  refetchInterval: 15_000,
});
