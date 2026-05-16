import { useQuery } from '@tanstack/react-query';
import { fetchPatientAppointments } from './usePatientAppointmentsQuery';
import { queryKeys } from '../lib/queryKeys';

export interface PatientTodayAppointment {
  id: string;
  doctorName: string;
  specialty: string;
  time: string;
  status: string;
  room?: string;
}

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const fetchPatientTodayAppointments = async (patientId?: string | null): Promise<PatientTodayAppointment[]> => {
  const appointments = await fetchPatientAppointments(patientId);
  const today = formatLocalDate(new Date());

  return appointments
    .filter((appointment: any) => String(appointment.date || '').slice(0, 10) === today)
    .map((appointment: any) => ({
      id: String(appointment.id),
      doctorName: appointment.doctorName || appointment.doctor_name || appointment.doctor?.name || 'Médico não informado',
      specialty: appointment.specialty || appointment.doctor?.specialty || '-',
      time: appointment.time || '--:--',
      status: appointment.status || 'SCHEDULED',
      room: appointment.room || appointment.roomNumber || '-',
    }));
};

export const usePatientTodayAppointmentsQuery = (patientId?: string | null) => useQuery({
  queryKey: [...queryKeys.patientTodayAppointments, patientId || ''],
  queryFn: () => fetchPatientTodayAppointments(patientId),
  enabled: Boolean(patientId),
  refetchInterval: 15_000,
});
