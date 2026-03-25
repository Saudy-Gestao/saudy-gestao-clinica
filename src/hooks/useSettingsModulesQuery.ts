import { useQuery } from '@tanstack/react-query';
import { moduleService } from '../services/moduleService';
import { queryKeys } from '../lib/queryKeys';

export const fetchSettingsModules = () => moduleService.getAll();

export const useSettingsModulesQuery = () => useQuery({
  queryKey: queryKeys.settingsModules,
  queryFn: fetchSettingsModules,
  refetchInterval: 60_000,
});
