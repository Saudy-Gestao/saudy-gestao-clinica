import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import convenioAuthorizationService, {
  type ConvenioAuthorizationSourceType,
  type ConvenioAuthorizationStatus,
} from '../services/convenioAuthorizationService';

type Params = {
  search?: string;
  sourceFilter?: ConvenioAuthorizationSourceType[];
  statusFilter?: ConvenioAuthorizationStatus[];
};

export const fetchConvenioAuthorizations = async (params: Params) => {
  const data: any = await convenioAuthorizationService.list({
    search: params.search || undefined,
    statuses: params.statusFilter || [],
    sourceTypes: params.sourceFilter || [],
    limit: 5000,
    offset: 0,
  });

  return Array.isArray(data?.items) ? data.items : [];
};

export const useConvenioAuthorizationsQuery = (params: Params) => useQuery({
  queryKey: [
    ...queryKeys.convenioAuthorizations,
    params.search || '',
    (params.sourceFilter || []).join(','),
    (params.statusFilter || []).join(','),
  ],
  queryFn: () => fetchConvenioAuthorizations(params),
  refetchInterval: 10_000,
});
