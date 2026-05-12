import { useQuery } from '@tanstack/react-query';
import consultationService from '../services/consultationService';
import { queryKeys } from '../lib/queryKeys';

const CLINICAL_QUEUE_TYPE = 'Fila clínica';

export const fetchClinicalQueue = async () => {
  const data: any = await consultationService.list({
    queueType: CLINICAL_QUEUE_TYPE,
    includeCompleted: true,
    limit: 200,
  });

  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.items)
      ? data.items
      : (Array.isArray(data?.data)
        ? data.data
        : []));
};

export const useClinicalQueueQuery = () => useQuery({
  queryKey: queryKeys.clinicalQueue,
  queryFn: fetchClinicalQueue,
  refetchInterval: 5_000,
});
