import { useQuery } from '@tanstack/react-query';
import doctorService from '../services/doctorService';
import { queryKeys } from '../lib/queryKeys';

export const fetchDoctorsAdmin = async () => {
  return doctorService.listDoctors();
};

export const useDoctorsAdminQuery = () => useQuery({
  queryKey: queryKeys.doctorsAdmin,
  queryFn: fetchDoctorsAdmin,
  refetchInterval: 15_000,
});
