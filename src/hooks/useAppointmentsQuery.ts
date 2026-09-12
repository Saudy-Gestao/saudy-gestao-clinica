import { useQuery } from '@tanstack/react-query';
import appointmentService from '../services/appointmentService';
import { queryKeys } from '../lib/queryKeys';

type AppointmentQueryParams = {
  date?: string;
  startDate?: string;
  endDate?: string;
  branchId?: string;
};

export const fetchAppointments = async (params: AppointmentQueryParams = {}) => {
  const data: any = await appointmentService.list({
    limit: 2000,
    offset: 0,
    ...(params.date ? { date: params.date } : {}),
    ...(params.startDate ? { startDate: params.startDate } : {}),
    ...(params.endDate ? { endDate: params.endDate } : {}),
    ...(params.branchId ? { branchId: params.branchId } : {}),
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
  queryKey: [...queryKeys.appointments, params.date || 'all', params.startDate || '', params.endDate || '', params.branchId || 'current'],
  queryFn: () => fetchAppointments(params),
  refetchInterval: 10_000,
});
