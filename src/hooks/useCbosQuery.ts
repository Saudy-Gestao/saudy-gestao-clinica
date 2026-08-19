import { useQuery } from '@tanstack/react-query';
import cboService from '../services/cboService';
import { queryKeys } from '../lib/queryKeys';

export const fetchCbos = async () => {
  return cboService.listCbos({ limit: 500 });
};

export const useCbosQuery = () => useQuery({
  queryKey: queryKeys.cbosCatalog,
  queryFn: fetchCbos,
  staleTime: 5 * 60_000,
});
