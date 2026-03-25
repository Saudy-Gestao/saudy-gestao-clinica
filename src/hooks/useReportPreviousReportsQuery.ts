import { useQuery } from '@tanstack/react-query';
import reportService from '../services/reportService';
import { queryKeys } from '../lib/queryKeys';

export interface PreviousReportItem {
  id: string;
  examType: string;
  date: string;
  status: string;
  summary: string;
  content: string;
}

export const fetchReportPreviousReports = async (cpf?: string | null): Promise<PreviousReportItem[]> => {
  if (!cpf) return [];

  const data: any = await reportService.list({ search: cpf, limit: 20, offset: 0 });
  const list: any[] = Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data?.items)
        ? data.data.items
        : []));

  return list.map((it: any) => ({
    id: String(it.id || ''),
    examType: it.exam || 'Exame',
    date: it.scheduledFor || '-',
    status: String(it.status || ''),
    summary: it.conclusion || it.description || 'Sem resumo',
    content: it.description || '',
  })).filter((it: PreviousReportItem) => it.id);
};

export const useReportPreviousReportsQuery = (cpf?: string | null) => useQuery({
  queryKey: [...queryKeys.reportPreviousReports, cpf || ''],
  queryFn: () => fetchReportPreviousReports(cpf),
  enabled: Boolean(cpf),
  refetchInterval: 15_000,
});
