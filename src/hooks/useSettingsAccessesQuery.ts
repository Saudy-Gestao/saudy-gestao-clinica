import { useQuery } from '@tanstack/react-query';
import accessService from '../services/accessService';
import { queryKeys } from '../lib/queryKeys';

export const fetchSettingsAccesses = async () => accessService.listAccesses();

export const useSettingsAccessesQuery = () => useQuery({
  queryKey: queryKeys.settingsAccesses,
  queryFn: fetchSettingsAccesses,
  refetchInterval: 30_000,
});
