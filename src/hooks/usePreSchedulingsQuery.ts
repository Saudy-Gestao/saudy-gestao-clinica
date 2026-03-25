import { useQuery } from '@tanstack/react-query';
import preSchedulingService from '../services/preSchedulingService';
import { queryKeys } from '../lib/queryKeys';

type Params = {
  search?: string;
  status?: string | null;
  resolvedOnly?: boolean;
};

export const fetchPreSchedulings = async (params: Params) => {
  const data = await preSchedulingService.list({
    search: params.search || undefined,
    status: params.status || undefined,
    resolvedOnly: params.resolvedOnly,
    limit: 500,
  });
  return Array.isArray((data as any)?.items) ? (data as any).items : [];
};

export const usePreSchedulingsQuery = (params: Params) => useQuery({
  queryKey: [...queryKeys.preSchedulings, params.search || '', params.status || '', params.resolvedOnly ? 'history' : 'queue'],
  queryFn: () => fetchPreSchedulings(params),
  refetchInterval: 10_000,
});
