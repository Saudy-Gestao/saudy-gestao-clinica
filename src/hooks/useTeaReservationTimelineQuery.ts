import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import teaPreReservationService from '../services/teaPreReservationService';
import { queryKeys } from '../lib/queryKeys';

export interface TeaTimelineReservationRef {
  reservationId: string;
  procedureName: string;
}

export interface TeaTimelineEventItem {
  id: string;
  eventType: string;
  eventLabel: string;
  actor?: string;
  payload?: any;
  createdAt: string;
}

const getTimelineEventLabel = (event: any) => {
  const nextStatus = String(event?.payload?.nextStatus || event?.payload?.requestedStatus || '');
  if (event?.eventType === 'STATUS_CHANGED') {
    if (nextStatus === 'PROPOSED') return 'Enviado para aprovação dos pais';
    if (nextStatus === 'PENDING_AUTHORIZATION') return 'Aprovação dos pais registrada';
    if (nextStatus === 'AUTHORIZED') return 'Autorização do convênio aprovada';
    if (nextStatus === 'CONVERTED') return 'Convertido em agendamento';
    if (nextStatus === 'RESERVED') return 'Horários reservados';
    if (nextStatus === 'CANCELED') return 'Pré-reserva cancelada';
    if (nextStatus === 'EXPIRED') return 'Pré-reserva expirada';
  }

  return event?.eventLabel || event?.eventType || 'Evento';
};

export const fetchTeaReservationTimeline = async (
  reservations: TeaTimelineReservationRef[],
): Promise<TeaTimelineEventItem[]> => {
  if (!reservations.length) return [];

  const timelineResponses = await Promise.all(
    reservations.map(async (reservation) => {
      const data: any = await teaPreReservationService.getTimeline(reservation.reservationId);
      const events = Array.isArray(data?.events) ? data.events : [];

      return events.map((event: any) => ({
        ...event,
        id: `${event.id}-${reservation.reservationId}`,
        eventLabel: `[${reservation.procedureName}] ${getTimelineEventLabel(event)}`,
      })) as TeaTimelineEventItem[];
    }),
  );

  return timelineResponses
    .flat()
    .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
};

export const useTeaReservationTimelineQuery = (
  reservations: TeaTimelineReservationRef[],
  enabled = true,
) => useQuery({
  queryKey: [
    ...queryKeys.teaReservationTimeline,
    reservations.map((item) => `${item.reservationId}:${item.procedureName}`).join('|'),
  ],
  queryFn: () => fetchTeaReservationTimeline(reservations),
  enabled: enabled && reservations.length > 0,
});
