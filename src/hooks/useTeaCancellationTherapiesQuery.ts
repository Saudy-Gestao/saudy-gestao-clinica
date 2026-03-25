import { useQuery } from '@tanstack/react-query';
import teaPreReservationService from '../services/teaPreReservationService';
import { queryKeys } from '../lib/queryKeys';

type Params = {
  teaProfileId?: string | null;
  fromDate?: string;
};

export const fetchTeaCancellationTherapies = async (params: Params) => {
  if (!params.teaProfileId) return [];
  const data: any = await teaPreReservationService.listCancellationTherapies({
    teaProfileId: params.teaProfileId,
    fromDate: params.fromDate,
  });
  return Array.isArray(data?.items) ? data.items : [];
};

export const useTeaCancellationTherapiesQuery = (params: Params) => useQuery({
  queryKey: [...queryKeys.teaCancellationTherapies, params.teaProfileId || '', params.fromDate || ''],
  queryFn: () => fetchTeaCancellationTherapies(params),
  enabled: Boolean(params.teaProfileId),
  refetchInterval: 15_000,
});
