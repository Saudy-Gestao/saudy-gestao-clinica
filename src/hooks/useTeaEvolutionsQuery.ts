import { useQuery } from '@tanstack/react-query';
import teaProfileService from '../services/teaProfileService';
import { queryKeys } from '../lib/queryKeys';

export const fetchTeaEvolutions = async (teaProfileId?: string | null) => {
  if (!teaProfileId) return [];
  const data: any = await teaProfileService.listEvolutions(teaProfileId);
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

export const useTeaEvolutionsQuery = (teaProfileId?: string | null) => useQuery({
  queryKey: [...queryKeys.teaEvolutions, teaProfileId || ''],
  queryFn: () => fetchTeaEvolutions(teaProfileId),
  enabled: Boolean(teaProfileId),
  refetchInterval: 15_000,
});
