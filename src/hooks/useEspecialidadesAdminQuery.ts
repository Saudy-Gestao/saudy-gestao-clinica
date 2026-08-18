import { useQuery } from '@tanstack/react-query';
import especialidadeService from '../services/especialidadeService';
import { queryKeys } from '../lib/queryKeys';

export const fetchEspecialidadesAdmin = async () => {
  return especialidadeService.listEspecialidades();
};

export const useEspecialidadesAdminQuery = () => useQuery({
  queryKey: queryKeys.especialidadesAdmin,
  queryFn: fetchEspecialidadesAdmin,
  refetchInterval: 15_000,
});
