import { useQuery } from '@tanstack/react-query';
import branchService from '../services/branchService';
import { queryKeys } from '../lib/queryKeys';

export const fetchSettingsBranches = () => branchService.listBranches();

export const useSettingsBranchesQuery = () => useQuery({
  queryKey: queryKeys.settingsBranches,
  queryFn: fetchSettingsBranches,
  refetchInterval: 30_000,
});
