import { useQuery } from '@tanstack/react-query';
import appointmentService from '../services/appointmentService';
import { queryKeys } from '../lib/queryKeys';

type AppointmentQueryParams = {
  date?: string;
};

export const fetchAppointments = async (params: AppointmentQueryParams = {}) => {
  const data: any = await appointmentService.list({
    limit: 2000,
    offset: 0,
    ...(params.date ? { date: params.date } : {}),
  });
  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data)
        ? data.data
        : []));
};

export const useAppointmentsQuery = (params: AppointmentQueryParams = {}) => useQuery({
  queryKey: params.date ? [...queryKeys.appointments, params.date] : queryKeys.appointments,
  queryFn: () => fetchAppointments(params),
  refetchInterval: 10_000,
});
