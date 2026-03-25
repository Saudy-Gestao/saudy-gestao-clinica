import { useQuery } from '@tanstack/react-query';
import financeService from '../services/financeService';
import { queryKeys } from '../lib/queryKeys';

export const fetchFinanceEntries = async () => {
  const data: any = await financeService.getEntries();
  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.data)
      ? data.data
      : (Array.isArray(data?.items)
        ? data.items
        : []));
};

export const useFinanceEntriesQuery = () => useQuery({
  queryKey: queryKeys.financeEntries,
  queryFn: fetchFinanceEntries,
  refetchInterval: 15_000,
});
