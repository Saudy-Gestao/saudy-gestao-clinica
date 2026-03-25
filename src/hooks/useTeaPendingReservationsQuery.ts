import { useQuery } from '@tanstack/react-query';
import teaPreReservationService from '../services/teaPreReservationService';
import { queryKeys } from '../lib/queryKeys';
import type { TeaPreReservationStatus } from '../services/teaPreReservationService';

type Params = {
  search?: string;
  status?: string | null;
};

export const fetchTeaPendingReservations = async (params: Params) => {
  const data: any = await teaPreReservationService.listPending({
    search: params.search || undefined,
    status: (params.status || undefined) as TeaPreReservationStatus | undefined,
  });

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

export const useTeaPendingReservationsQuery = (params: Params) => useQuery({
  queryKey: [...queryKeys.teaPendingReservations, params.search || '', params.status || ''],
  queryFn: () => fetchTeaPendingReservations(params),
  refetchInterval: 30_000,
});
