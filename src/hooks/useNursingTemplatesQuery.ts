import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import procedureNursingTemplateService from '../services/procedureNursingTemplateService';

export const fetchNursingTemplates = async () => {
  const data = await procedureNursingTemplateService.list({ limit: 200 });
  return Array.isArray(data?.items) ? data.items : [];
};

export const useNursingTemplatesQuery = () => useQuery({
  queryKey: queryKeys.nursingTemplates,
  queryFn: fetchNursingTemplates,
  refetchInterval: 15_000,
});
