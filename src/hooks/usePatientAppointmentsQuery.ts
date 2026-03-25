import { useQuery } from '@tanstack/react-query';
import appointmentService from '../services/appointmentService';
import { queryKeys } from '../lib/queryKeys';

export const fetchPatientAppointments = async (patientId?: string | null) => {
  if (!patientId) return [];
  const data: any = await appointmentService.list({ patientId, limit: 200, offset: 0 });
  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data?.items)
        ? data.data.items
        : (Array.isArray(data?.data)
          ? data.data
          : [])));
};

export const usePatientAppointmentsQuery = (patientId?: string | null) => useQuery({
  queryKey: [...queryKeys.patientAppointments, patientId || ''],
  queryFn: () => fetchPatientAppointments(patientId),
  enabled: Boolean(patientId),
  refetchInterval: 15_000,
});
