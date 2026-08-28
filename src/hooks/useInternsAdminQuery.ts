import { useQuery } from '@tanstack/react-query';
import internService from '../services/internService';
import { queryKeys } from '../lib/queryKeys';

export const useInternsAdminQuery = (search?: string) => useQuery({
  queryKey: [...queryKeys.internsAdmin, search || ''],
  queryFn: () => internService.listInterns(search),
});
