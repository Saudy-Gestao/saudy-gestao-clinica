import { useQuery } from '@tanstack/react-query';
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

const PERSISTED_RESERVATION_SLOT_STATUSES = new Set([
  'RESERVED',
  'PROPOSED',
  'PENDING_AUTHORIZATION',
  'AUTHORIZED',
  'CONVERTED',
]);

export const fetchTeaWeeklyAgenda = async (): Promise<TeaAgendaItem[]> => {
  const [pendingReservationData, createdReservationData, doctorData, sectorData]: any[] = await Promise.all([
    teaPreReservationService.listPending(),
    teaPreReservationService.listCreated({ limit: 4000, offset: 0 }),
    doctorService.listDoctors(),
    sectorService.listSectors(),
  ]);

  const pendingItems: any[] = Array.isArray(pendingReservationData)
    ? pendingReservationData
    : (Array.isArray(pendingReservationData?.items)
      ? pendingReservationData.items
      : (Array.isArray(pendingReservationData?.data?.items)
        ? pendingReservationData.data.items
        : (Array.isArray(pendingReservationData?.data) ? pendingReservationData.data : [])));
  const createdItems: any[] = Array.isArray(createdReservationData?.items)
    ? createdReservationData.items
    : (Array.isArray(createdReservationData?.data?.items) ? createdReservationData.data.items : []);
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

  const normalizeDateToIso = (value: unknown) => {
    const parsed = dayjs(String(value || ''));
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
  };

  const allowedReservationIds = new Set(
    pendingItems
      .map((item: any) => String(item?.preReservationId || '').trim())
      .filter(Boolean),
  );
  const allowedTherapyIds = new Set(
    pendingItems
      .map((item: any) => String(item?.pitTherapyId || '').trim())
      .filter(Boolean),
  );

  const agendaItems: TeaAgendaItem[] = [];
  const seen = new Set<string>();

  createdItems
    .filter((item: any) => {
      const status = String(item?.status || '').trim().toUpperCase();
      const reservationKey = String(item?.preReservationId || item?.id || '').trim();
      const therapyKey = String(item?.pitTherapyId || reservationKey).trim();
      const matchesTeaFlow = (
        (reservationKey && allowedReservationIds.has(reservationKey))
        || (therapyKey && allowedTherapyIds.has(therapyKey))
      );
      return Boolean(
        matchesTeaFlow
        && therapyKey
        && status
        && PERSISTED_RESERVATION_SLOT_STATUSES.has(status),
      );
    })
    .forEach((it: any) => {
      const reservationKey = String(it?.preReservationId || it?.id || '').trim();
      const therapyKey = String(it?.pitTherapyId || reservationKey).trim();
      const doctorId = String(it?.professionalDoctorId || it?.professional?.id || it?.pitTherapy?.professionalDoctorId || '').trim();
      const doctorName = String(it?.professionalName || it?.professional?.name || '').trim();
      const roomName = roomByDoctorId.get(doctorId) || roomByDoctorName.get(doctorName.toLowerCase()) || '';

      const pushAgendaItem = (dateRaw: unknown, timeRaw: unknown, slotIndex?: number) => {
        const date = normalizeDateToIso(dateRaw);
        const time = String(timeRaw || '').trim();
        if (!date || !time) return;

        const signature = [therapyKey, date, time].join('#');
        if (seen.has(signature)) return;
        seen.add(signature);

        agendaItems.push({
          id: slotIndex === undefined ? `reservation-${reservationKey}-${date}-${time}` : `reservation-${reservationKey}-${slotIndex}-${date}-${time}`,
          patientName: String(it?.patient?.name || ''),
          doctorName,
          specialty: String(it?.procedureName || it?.procedure?.name || it?.therapyType || ''),
          roomName,
          date,
          time,
          type: 'RESERVA TEA',
          status: String(it?.status || 'RESERVED'),
          source: 'RESERVATION' as const,
        });
      };

      const weeklyPatternSlots = Array.isArray(it?.weeklySlotPattern) ? it.weeklySlotPattern : [];
      weeklyPatternSlots.forEach((slot: any, index: number) => {
        pushAgendaItem(slot?.date || slot?.suggestedDate, slot?.time || slot?.suggestedTime, index);
      });

      pushAgendaItem(it?.slotSuggestion?.suggestedDate || it?.suggestedDate, it?.slotSuggestion?.suggestedTime || it?.suggestedTime);
    });

  return agendaItems.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
};

export const useTeaWeeklyAgendaQuery = () => useQuery({
  queryKey: queryKeys.teaWeeklyAgenda,
  queryFn: fetchTeaWeeklyAgenda,
  refetchInterval: 30_000,
});
