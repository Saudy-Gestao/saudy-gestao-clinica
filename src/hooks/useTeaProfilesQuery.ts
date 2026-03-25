import { useQuery } from '@tanstack/react-query';
import teaProfileService from '../services/teaProfileService';
import { queryKeys } from '../lib/queryKeys';

type Params = {
  search?: string;
  hasActivePit?: boolean;
};

export const fetchTeaProfiles = async (params?: Params) => {
  const data: any = await teaProfileService.list({
    search: params?.search || undefined,
    hasActivePit: params?.hasActivePit,
    limit: 300,
    offset: 0,
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

export const useTeaProfilesQuery = (params?: Params) => useQuery({
  queryKey: [...queryKeys.teaProfiles, params?.search || '', params?.hasActivePit ? 'active-pit' : 'all'],
  queryFn: () => fetchTeaProfiles(params),
  refetchInterval: 15_000,
});
