import { useQuery } from '@tanstack/react-query';
import modalidadeService from '../services/modalidadeService';
import { queryKeys } from '../lib/queryKeys';

export const fetchModalidadesAdmin = async () => {
  return modalidadeService.listModalidades();
};

export const useModalidadesAdminQuery = () => useQuery({
  queryKey: queryKeys.modalidadesAdmin,
  queryFn: fetchModalidadesAdmin,
  refetchInterval: 15_000,
});
