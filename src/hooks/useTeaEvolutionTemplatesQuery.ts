import { useQuery } from '@tanstack/react-query';
import teaEvolutionTemplateService from '../services/teaEvolutionTemplateService';
import { queryKeys } from '../lib/queryKeys';

export const fetchTeaEvolutionTemplates = async () => {
  const data: any = await teaEvolutionTemplateService.list({ limit: 200, offset: 0 });
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

export const useTeaEvolutionTemplatesQuery = () => useQuery({
  queryKey: queryKeys.teaEvolutionTemplates,
  queryFn: fetchTeaEvolutionTemplates,
  refetchInterval: 15_000,
});
