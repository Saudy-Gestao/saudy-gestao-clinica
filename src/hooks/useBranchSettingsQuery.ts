import { useQuery } from '@tanstack/react-query';
import branchSettingsService from '../services/branchSettingsService';
import { queryKeys } from '../lib/queryKeys';

export const fetchBranchSettings = (branchId: string) => branchSettingsService.getBranchSettings(branchId);

export const useBranchSettingsQuery = (branchId: string | null) => useQuery({
  queryKey: [...queryKeys.settingsBranchSettings, branchId || ''],
  queryFn: () => fetchBranchSettings(branchId as string),
  enabled: Boolean(branchId),
  refetchInterval: 30_000,
});
