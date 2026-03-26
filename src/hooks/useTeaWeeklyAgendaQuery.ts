import { useQuery } from '@tanstack/react-query';
import appointmentService from '../services/appointmentService';
import teaPreReservationService from '../services/teaPreReservationService';
import doctorService from '../services/doctorService';
import sectorService from '../services/sectorService';
import { queryKeys } from '../lib/queryKeys';
import dayjs from 'dayjs';

export type TeaAgendaItem = {
  id: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  roomName: string;
  date: string;
  time: string;
  type: string;
  status: string;
  source: 'APPOINTMENT' | 'RESERVATION';
};

export const fetchTeaWeeklyAgenda = async (): Promise<TeaAgendaItem[]> => {
  const [data, reservationData, doctorData, sectorData]: any[] = await Promise.all([
    appointmentService.list({ limit: 4000, offset: 0 }),
    teaPreReservationService.listCreated({ limit: 4000, offset: 0 }),
    doctorService.listDoctors(),
    sectorService.listSectors(),
  ]);

  const rawItems: any[] = Array.isArray(data)
    ? data
    : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.data?.items) ? data.data.items : []));
  const reservedItems: any[] = Array.isArray(reservationData?.items) ? reservationData.items : [];
  const doctors: any[] = Array.isArray(doctorData)
    ? doctorData
    : (Array.isArray(doctorData?.items) ? doctorData.items : (Array.isArray(doctorData?.data?.items) ? doctorData.data.items : []));
  const sectors: any[] = Array.isArray(sectorData)
    ? sectorData
    : (Array.isArray(sectorData?.items) ? sectorData.items : (Array.isArray(sectorData?.data?.items) ? sectorData.data.items : []));

  const roomById = new Map<string, string>();
  sectors.forEach((sector: any) => {
    const roomId = String(sector?.id || '').trim();
    const roomName = String(sector?.name || '').trim();
    const branchName = String(sector?.branch?.tradeName || sector?.branch?.socialName || '').trim();
    if (!roomId || !roomName) return;
    roomById.set(roomId, branchName ? `${roomName} (${branchName})` : roomName);
  });

  const roomByDoctorId = new Map<string, string>();
  const roomByDoctorName = new Map<string, string>();
  doctors.forEach((doctor: any) => {
    const doctorId = String(doctor?.id || doctor?.doctorId || '').trim();
    const doctorName = String(doctor?.name || doctor?.nome || doctor?.fullName || '').trim();
    const roomId = Array.isArray(doctor?.roomIds) && doctor.roomIds.length > 0
      ? String(doctor.roomIds[0] || '').trim()
      : String(doctor?.roomId || '').trim();
    const roomName = roomById.get(roomId) || '';

    if (doctorId && roomName) roomByDoctorId.set(doctorId, roomName);
    if (doctorName && roomName) roomByDoctorName.set(doctorName.toLowerCase(), roomName);
  });

  const buildAgendaSignature = (payload: {
    patientName?: string;
    doctorName?: string;
    specialty?: string;
    date?: string;
    time?: string;
  }) => [
    String(payload.patientName || '').trim().toLowerCase(),
    String(payload.doctorName || '').trim().toLowerCase(),
    String(payload.specialty || '').trim().toLowerCase(),
    String(payload.date || '').trim(),
    String(payload.time || '').trim(),
  ].join('|');

  const convertedReservationSignatures = new Set(
    reservedItems
      .filter((it: any) => String(it?.status || '').toUpperCase() === 'CONVERTED')
      .map((it: any) => buildAgendaSignature({
        patientName: String(it?.patient?.name || ''),
        doctorName: String(it?.professionalName || ''),
        specialty: String(it?.procedureName || ''),
        date: it?.suggestedDate ? dayjs(it.suggestedDate).format('YYYY-MM-DD') : '',
        time: String(it?.suggestedTime || ''),
      })),
  );

  const mappedAppointments: TeaAgendaItem[] = rawItems
    .map((it: any) => ({
      id: `appointment-${String(it?.id || '')}`,
      patientName: String(it?.patientName || it?.patient_name || it?.patient?.name || it?.pacienteNome || ''),
      doctorName: String(it?.doctorName || it?.doctor_name || it?.doctor?.name || it?.medicoNome || ''),
      specialty: String(it?.specialty || it?.procedure || it?.procedureName || it?.procedimento || it?.especialidade || ''),
      roomName: (() => {
        const doctorId = String(it?.doctorId || it?.doctor?.id || '').trim();
        const doctorName = String(it?.doctorName || it?.doctor_name || it?.doctor?.name || it?.medicoNome || '').trim().toLowerCase();
        return roomByDoctorId.get(doctorId) || roomByDoctorName.get(doctorName) || '';
      })(),
      date: String(it?.date || it?.data || ''),
      time: String(it?.time || it?.hora || ''),
      type: String(it?.type || it?.tipoConsulta || ''),
      status: String(it?.status || ''),
      source: 'APPOINTMENT' as const,
    }))
    .filter((item) => item.id && item.date && item.time)
    .filter((item) => (
      String(item.type || '').toUpperCase().includes('TEA')
      || convertedReservationSignatures.has(buildAgendaSignature(item))
    ));

  const mappedReservations: TeaAgendaItem[] = reservedItems
    .map((it: any) => ({
      id: `reservation-${String(it?.id || '')}`,
      patientName: String(it?.patient?.name || ''),
      doctorName: String(it?.professionalName || ''),
      specialty: String(it?.procedureName || ''),
      roomName: (() => {
        const doctorId = String(it?.professionalDoctorId || it?.professional?.id || it?.pitTherapy?.professionalDoctorId || '').trim();
        const doctorName = String(it?.professionalName || '').trim().toLowerCase();
        return roomByDoctorId.get(doctorId) || roomByDoctorName.get(doctorName) || '';
      })(),
      date: it?.suggestedDate ? dayjs(it.suggestedDate).format('YYYY-MM-DD') : '',
      time: String(it?.suggestedTime || ''),
      type: 'RESERVA TEA',
      status: String(it?.status || 'RESERVED'),
      source: 'RESERVATION' as const,
    }))
    .filter((item) => item.id && item.date && item.time);

  const reservationStatusesThatOccupy = new Set(['RESERVED', 'PROPOSED', 'PENDING_AUTHORIZATION', 'AUTHORIZED']);
  const occupyingReservations = mappedReservations.filter((item) => reservationStatusesThatOccupy.has(String(item.status || '').toUpperCase()));
  const dedupedBySignature = new Map<string, TeaAgendaItem>();
  [...occupyingReservations, ...mappedAppointments].forEach((item) => {
    const signature = buildAgendaSignature(item);
    const current = dedupedBySignature.get(signature);
    if (!current || item.source === 'APPOINTMENT') {
      dedupedBySignature.set(signature, item);
    }
  });

  return Array.from(dedupedBySignature.values());
};

export const useTeaWeeklyAgendaQuery = () => useQuery({
  queryKey: queryKeys.teaWeeklyAgenda,
  queryFn: fetchTeaWeeklyAgenda,
  refetchInterval: 30_000,
});
