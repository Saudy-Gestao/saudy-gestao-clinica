/* eslint-disable @typescript-eslint/no-explicit-any */

import { useQuery } from '@tanstack/react-query';
import teaPreReservationService from '../services/teaPreReservationService';
import agendaService from '../services/agendaService';
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
  branchId?: string;
  unitName?: string;
  roomId?: string;
};

export type TeaAgendaResource = {
  id: string;
  branchId: string;
  unitName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  roomId: string;
  roomName: string;
  weekday: string;
  shiftStart: string;
  shiftEnd: string;
  startDate: string;
  endDate: string;
};

export type TeaWeeklyAgendaData = {
  items: TeaAgendaItem[];
  agendas: TeaAgendaResource[];
};

const PERSISTED_RESERVATION_SLOT_STATUSES = new Set([
  'RESERVED',
  'PROPOSED',
  'PENDING_AUTHORIZATION',
  'AUTHORIZED',
  'CONVERTED',
]);

export const fetchTeaWeeklyAgenda = async (): Promise<TeaWeeklyAgendaData> => {
  const [pendingReservationData, createdReservationData, doctorData, sectorData, agendaData]: any[] = await Promise.all([
    teaPreReservationService.listPending(),
    teaPreReservationService.listCreated({ limit: 4000, offset: 0 }),
    doctorService.listDoctors(),
    sectorService.listSectors(),
    agendaService.listAgendas({ status: 'ATIVA' }),
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
  const agendaRecords: any[] = Array.isArray(agendaData?.items)
    ? agendaData.items
    : (Array.isArray(agendaData?.data?.items) ? agendaData.data.items : (Array.isArray(agendaData) ? agendaData : []));

  const roomById = new Map<string, { displayName: string; unitName: string }>();
  sectors.forEach((sector: any) => {
    const roomId = String(sector?.id || '').trim();
    const roomName = String(sector?.name || '').trim();
    const branchName = String(sector?.branch?.tradeName || sector?.branch?.socialName || sector?.branch?.name || '').trim();
    if (!roomId || !roomName) return;
    roomById.set(roomId, {
      displayName: branchName ? `${roomName} (${branchName})` : roomName,
      unitName: branchName,
    });
  });

  const roomByDoctorId = new Map<string, string>();
  const roomByDoctorName = new Map<string, string>();
  doctors.forEach((doctor: any) => {
    const doctorId = String(doctor?.id || doctor?.doctorId || '').trim();
    const doctorName = String(doctor?.name || doctor?.nome || doctor?.fullName || '').trim();
    const roomId = Array.isArray(doctor?.roomIds) && doctor.roomIds.length > 0
      ? String(doctor.roomIds[0] || '').trim()
      : String(doctor?.roomId || '').trim();
    const roomName = roomById.get(roomId)?.displayName || '';

    if (doctorId && roomName) roomByDoctorId.set(doctorId, roomName);
    if (doctorName && roomName) roomByDoctorName.set(doctorName.toLowerCase(), roomName);
  });

  const normalizeAgendaDate = (value: unknown) => {
    const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = dayjs(String(value || ''));
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
  };

  const agendaResources: TeaAgendaResource[] = agendaRecords
    .filter((agenda: any) => String(agenda?.status || 'ATIVA').toUpperCase() === 'ATIVA')
    .map((agenda: any) => {
      const branchId = String(agenda?.branchId || agenda?.branch?.id || '').trim();
      const unitName = String(agenda?.branch?.tradeName || agenda?.branch?.socialName || agenda?.branch?.name || '').trim();
      const doctorId = String(agenda?.doctorId || agenda?.doctor?.id || '').trim();
      const doctorName = String(agenda?.doctor?.name || '').trim();
      const roomId = String(agenda?.roomId || agenda?.room?.id || '').trim();
      const roomName = String(agenda?.room?.name || '').trim();
      const displayRoomName = roomName
        ? (unitName ? `${roomName} (${unitName})` : roomName)
        : `Agenda · ${doctorName || 'Profissional não informado'}${unitName ? ` (${unitName})` : ''}`;

      return {
        id: String(agenda?.id || '').trim(),
        branchId,
        unitName,
        doctorId,
        doctorName,
        specialty: String(agenda?.especialidade?.name || '').trim(),
        roomId,
        roomName: displayRoomName,
        weekday: String(agenda?.weekday || '').trim(),
        shiftStart: String(agenda?.shiftStart || '').trim(),
        shiftEnd: String(agenda?.shiftEnd || '').trim(),
        startDate: normalizeAgendaDate(agenda?.startDate),
        endDate: normalizeAgendaDate(agenda?.endDate),
      };
    })
    .filter((agenda) => Boolean(agenda.id && agenda.branchId && agenda.doctorId));

  const agendaByDoctorId = new Map<string, TeaAgendaResource>();
  agendaResources.forEach((agenda) => {
    if (agenda.doctorId && !agendaByDoctorId.has(agenda.doctorId)) agendaByDoctorId.set(agenda.doctorId, agenda);
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
      const directRoomId = String(it?.roomId || it?.room?.id || '').trim();
      const directRoomName = String(it?.roomName || it?.room?.name || '').trim();
      const directRoom = roomById.get(directRoomId);
      const doctorAgenda = agendaByDoctorId.get(doctorId);
      const roomName = directRoom?.displayName
        || (directRoomName ? `${directRoomName}${doctorAgenda?.unitName ? ` (${doctorAgenda.unitName})` : ''}` : '')
        || roomByDoctorId.get(doctorId)
        || roomByDoctorName.get(doctorName.toLowerCase())
        || doctorAgenda?.roomName
        || '';
      const unitName = directRoom?.unitName || doctorAgenda?.unitName || '';

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
          branchId: doctorAgenda?.branchId || '',
          unitName,
          roomId: directRoomId || doctorAgenda?.roomId || '',
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

  return {
    items: agendaItems.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    agendas: agendaResources,
  };
};

export const useTeaWeeklyAgendaQuery = () => useQuery({
  queryKey: queryKeys.teaWeeklyAgenda,
  queryFn: fetchTeaWeeklyAgenda,
  refetchInterval: 30_000,
});
