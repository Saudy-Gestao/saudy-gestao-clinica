import { useQuery } from '@tanstack/react-query';
import agendaService from '../services/agendaService';
import { queryKeys } from '../lib/queryKeys';

export const fetchAgendasAdmin = async (branchId?: string) => {
  return agendaService.listAgendas(branchId ? { branchId } : undefined);
};

export const useAgendasAdminQuery = (branchId?: string) => useQuery({
  queryKey: [...queryKeys.agendasAdmin, branchId || 'current'],
  queryFn: () => fetchAgendasAdmin(branchId),
  refetchInterval: 15_000,
});
