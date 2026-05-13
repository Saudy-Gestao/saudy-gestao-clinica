import { useQuery } from '@tanstack/react-query';
import insuranceService from '../services/insuranceService';
import { queryKeys } from '../lib/queryKeys';

export const useInsuranceDetailQuery = (id: string | undefined) => useQuery({
  queryKey: [...queryKeys.insuranceDetail, id],
  queryFn: () => insuranceService.getInsurance(id!),
  enabled: Boolean(id),
});

export const useInsuranceProceduresQuery = (insuranceId: string | undefined) => useQuery({
  queryKey: [...queryKeys.insuranceProcedures, insuranceId],
  queryFn: () => insuranceService.listInsuranceProcedures(insuranceId!),
  enabled: Boolean(insuranceId),
});
