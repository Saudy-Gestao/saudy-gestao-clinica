import { useQuery } from '@tanstack/react-query';
import doctorService from '../services/doctorService';
import { queryKeys } from '../lib/queryKeys';

export const fetchDoctorsAdmin = async (branchId?: string) => {
  return doctorService.listDoctors(branchId);
};

export const useDoctorsAdminQuery = (branchId?: string) => useQuery({
  queryKey: branchId ? [...queryKeys.doctorsAdmin, branchId] : queryKeys.doctorsAdmin,
  queryFn: () => fetchDoctorsAdmin(branchId),
  refetchInterval: 15_000,
});
