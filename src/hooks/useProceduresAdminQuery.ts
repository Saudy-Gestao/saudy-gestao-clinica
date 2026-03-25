import { useQuery } from '@tanstack/react-query';
import procedureService from '../services/procedureService';
import { queryKeys } from '../lib/queryKeys';

export const fetchProceduresAdmin = async () => {
  const data: any = await procedureService.listProcedures({ limit: 200, offset: 0 });
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

export const useProceduresAdminQuery = () => useQuery({
  queryKey: queryKeys.proceduresAdmin,
  queryFn: fetchProceduresAdmin,
  refetchInterval: 15_000,
});
