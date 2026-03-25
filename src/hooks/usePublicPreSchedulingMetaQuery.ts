import { useQuery } from '@tanstack/react-query';
import preSchedulingService from '../services/preSchedulingService';
import { queryKeys } from '../lib/queryKeys';

export const usePublicPreSchedulingMetaQuery = (token?: string) => useQuery({
  queryKey: [...queryKeys.publicPreSchedulingMeta, token || ''],
  queryFn: () => preSchedulingService.getPublicMeta(token || ''),
  enabled: Boolean(token),
  retry: false,
});
