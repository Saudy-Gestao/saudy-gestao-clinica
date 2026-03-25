import { useQuery } from '@tanstack/react-query';
import companyService from '../services/companyService';
import { queryKeys } from '../lib/queryKeys';

export const fetchSettingsCompanies = () => companyService.listCompanies();

export const useSettingsCompaniesQuery = () => useQuery({
  queryKey: queryKeys.settingsCompanies,
  queryFn: fetchSettingsCompanies,
  refetchInterval: 30_000,
});
