import { useQuery } from '@tanstack/react-query';
import appointmentService from '../services/appointmentService';
import { queryKeys } from '../lib/queryKeys';

export const fetchAppointments = async () => {
  const data: any = await appointmentService.list({ limit: 2000, offset: 0 });
  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data)
        ? data.data
        : []));
};

export const useAppointmentsQuery = () => useQuery({
  queryKey: queryKeys.appointments,
  queryFn: fetchAppointments,
  refetchInterval: 10_000,
});
