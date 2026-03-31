import { useQuery } from '@tanstack/react-query';
import tissBatchService from '../services/tissBatchService';
import { queryKeys } from '../lib/queryKeys';

export const fetchTissBatches = async () => {
  const response = await tissBatchService.list();
  return Array.isArray(response?.items) ? response.items : [];
};

export const useTissBatchesQuery = () => useQuery({
  queryKey: queryKeys.tissBatches,
  queryFn: fetchTissBatches,
  refetchInterval: 20_000,
  refetchIntervalInBackground: true,
});
