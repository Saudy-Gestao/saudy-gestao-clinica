import { useQuery } from '@tanstack/react-query';
import publicCheckInService from '../services/publicCheckInService';
import { queryKeys } from '../lib/queryKeys';

export const usePublicBranchInfoQuery = (branchId?: string, enabled = true) => useQuery({
  queryKey: [...queryKeys.publicBranchInfo, branchId || ''],
  queryFn: () => publicCheckInService.getBranchInfo(branchId || ''),
  enabled: Boolean(branchId) && enabled,
  retry: false,
});
