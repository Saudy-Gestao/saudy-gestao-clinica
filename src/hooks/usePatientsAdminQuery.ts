import { useQuery } from '@tanstack/react-query';
import patientService from '../services/patientService';
import { queryKeys } from '../lib/queryKeys';

export const fetchPatientsAdmin = async () => {
  return patientService.listPatients();
};

export const usePatientsAdminQuery = () => useQuery({
  queryKey: queryKeys.patientsAdmin,
  queryFn: fetchPatientsAdmin,
  refetchInterval: 15_000,
});
