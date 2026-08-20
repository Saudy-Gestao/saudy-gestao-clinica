import { useQuery } from '@tanstack/react-query';
import agendaService from '../services/agendaService';
import { queryKeys } from '../lib/queryKeys';

export const fetchAgendasAdmin = async () => {
  return agendaService.listAgendas();
};

export const useAgendasAdminQuery = () => useQuery({
  queryKey: queryKeys.agendasAdmin,
  queryFn: fetchAgendasAdmin,
  refetchInterval: 15_000,
});
