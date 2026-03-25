import { useQuery } from '@tanstack/react-query';
import preAttendanceService from '../services/preAttendanceService';
import { queryKeys } from '../lib/queryKeys';

export interface QueuePatient {
  id: string;
  name: string;
  time: string;
  type: string;
  doctor: string;
  position: number;
  status: string;
  createdAt?: string;
}

const parseAgendaSummary = (agenda?: string | null) => {
  const parts = String(agenda || '')
    .split('•')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    time: parts[0] || '--:--',
    type: parts[1] || 'Consulta',
    doctor: parts[2] || 'Profissional não informado',
  };
};

export const fetchPatientQueue = async (): Promise<QueuePatient[]> => {
  const data: any = await preAttendanceService.list({ limit: 100 });
  const list: any[] = Array.isArray(data)
    ? data
    : (data?.items || data?.data || []);

  return list
    .filter((item: any) => {
      const status = String(item.status || '').trim().toLowerCase();
      return status === 'na fila da recepção' || status === 'atrasado';
    })
    .sort((a: any, b: any) => {
      const createdAtA = new Date(a.createdAt || 0).getTime();
      const createdAtB = new Date(b.createdAt || 0).getTime();
      if (createdAtA !== createdAtB) return createdAtA - createdAtB;

      const updatedAtA = new Date(a.updatedAt || 0).getTime();
      const updatedAtB = new Date(b.updatedAt || 0).getTime();
      return updatedAtA - updatedAtB;
    })
    .map((item: any, index: number) => {
      const summary = parseAgendaSummary(item.agenda);
      return {
        id: String(item.id),
        name: item.fullName || item.patientName || 'Paciente sem nome',
        time: summary.time,
        type: summary.type,
        doctor: summary.doctor,
        position: index + 1,
        status: item.status || '',
        createdAt: item.createdAt,
      };
    });
};

export const usePatientQueueQuery = () => useQuery({
  queryKey: queryKeys.patientQueue,
  queryFn: fetchPatientQueue,
  refetchInterval: 10_000,
});
