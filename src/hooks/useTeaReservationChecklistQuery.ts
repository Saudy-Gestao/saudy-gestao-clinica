import { useQuery } from '@tanstack/react-query';
import teaPreReservationService from '../services/teaPreReservationService';
import { queryKeys } from '../lib/queryKeys';

export interface TeaChecklistReservationRef {
  reservationId: string;
  procedureName: string;
}

export interface TeaConversionChecklistItem {
  key: string;
  label: string;
  valid: boolean;
  message: string;
  procedureName?: string;
}

export const fetchTeaReservationChecklist = async (
  reservations: TeaChecklistReservationRef[],
): Promise<TeaConversionChecklistItem[]> => {
  if (!reservations.length) return [];

  const allItems: TeaConversionChecklistItem[] = [];
  for (const reservation of reservations) {
    const data: any = await teaPreReservationService.getConversionChecklist(reservation.reservationId);
    const checks: TeaConversionChecklistItem[] = Array.isArray(data?.checks)
      ? data.checks
      : (Array.isArray(data?.items) ? data.items : []);

    allItems.push(
      ...checks.map((item) => ({
        ...item,
        key: `${reservation.reservationId}-${item.key}`,
        procedureName: reservation.procedureName,
      })),
    );
  }

  return allItems;
};

export const useTeaReservationChecklistQuery = (
  reservations: TeaChecklistReservationRef[],
  enabled = true,
) => useQuery({
  queryKey: [
    ...queryKeys.teaReservationChecklist,
    reservations.map((item) => `${item.reservationId}:${item.procedureName}`).join('|'),
  ],
  queryFn: () => fetchTeaReservationChecklist(reservations),
  enabled: enabled && reservations.length > 0,
});
