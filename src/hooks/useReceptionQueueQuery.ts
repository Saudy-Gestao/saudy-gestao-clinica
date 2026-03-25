import { useQuery } from '@tanstack/react-query';
import preAttendanceService from '../services/preAttendanceService';
import { queryKeys } from '../lib/queryKeys';

const RECEPTION_QUEUE_TYPE = 'Autorização e Recepção';

export const fetchReceptionQueue = async () => {
  const data: any = await preAttendanceService.list({
    queueType: RECEPTION_QUEUE_TYPE,
  });

  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data)
        ? data.data
        : []));
};

export const useReceptionQueueQuery = () => useQuery({
  queryKey: queryKeys.receptionQueue,
  queryFn: fetchReceptionQueue,
  refetchInterval: 5_000,
});
