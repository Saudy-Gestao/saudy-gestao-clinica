import { useQuery } from '@tanstack/react-query';
import teaProfileService from '../services/teaProfileService';
import { queryKeys } from '../lib/queryKeys';

export const fetchTeaPit = async (teaProfileId?: string | null) => {
  if (!teaProfileId) return null;
  return teaProfileService.getPit(teaProfileId);
};

export const useTeaPitQuery = (teaProfileId?: string | null) => useQuery({
  queryKey: [...queryKeys.teaPit, teaProfileId || ''],
  queryFn: () => fetchTeaPit(teaProfileId),
  enabled: Boolean(teaProfileId),
  refetchInterval: 15_000,
});
