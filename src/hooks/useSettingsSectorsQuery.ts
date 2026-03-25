import { useQuery } from '@tanstack/react-query';
import sectorService from '../services/sectorService';
import { queryKeys } from '../lib/queryKeys';

export const fetchSettingsSectors = () => sectorService.listSectors();

export const useSettingsSectorsQuery = () => useQuery({
  queryKey: queryKeys.settingsSectors,
  queryFn: fetchSettingsSectors,
  refetchInterval: 30_000,
});
