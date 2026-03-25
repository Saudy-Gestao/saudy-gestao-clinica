import { useQuery } from '@tanstack/react-query';
import teaProfileService from '../services/teaProfileService';
import { queryKeys } from '../lib/queryKeys';

type Params = {
  teaProfileId?: string | null;
  isActive?: boolean;
  search?: string;
};

export const fetchTeaPlans = async (params: Params) => {
  if (!params.teaProfileId) return [];
  const data: any = await teaProfileService.listPlans(params.teaProfileId, {
    isActive: params.isActive,
    search: params.search,
  });
  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data?.items)
        ? data.data.items
        : (Array.isArray(data?.data)
          ? data.data
          : [])));
};

export const useTeaPlansQuery = (params: Params) => useQuery({
  queryKey: [...queryKeys.teaPlans, params.teaProfileId || '', params.isActive === false ? 'all' : 'active', params.search || ''],
  queryFn: () => fetchTeaPlans(params),
  enabled: Boolean(params.teaProfileId),
  refetchInterval: 15_000,
});
