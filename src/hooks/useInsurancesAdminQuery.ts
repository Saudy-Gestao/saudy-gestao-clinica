import { useQuery } from '@tanstack/react-query';
import insuranceService from '../services/insuranceService';
import { queryKeys } from '../lib/queryKeys';

export const fetchInsurancesAdmin = async () => {
  return insuranceService.listInsurances();
};

export const useInsurancesAdminQuery = () => useQuery({
  queryKey: queryKeys.insurancesAdmin,
  queryFn: fetchInsurancesAdmin,
  refetchInterval: 15_000,
});
