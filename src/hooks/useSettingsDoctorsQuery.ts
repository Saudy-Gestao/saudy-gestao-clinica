import { useQuery } from '@tanstack/react-query';
import doctorService from '../services/doctorService';
import { queryKeys } from '../lib/queryKeys';

export const fetchSettingsDoctors = () => doctorService.listDoctors();

export const useSettingsDoctorsQuery = () => useQuery({
  queryKey: queryKeys.settingsDoctors,
  queryFn: fetchSettingsDoctors,
  refetchInterval: 30_000,
});
