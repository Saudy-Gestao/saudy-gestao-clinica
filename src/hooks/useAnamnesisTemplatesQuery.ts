import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import procedureAnamnesisTemplateService from '../services/procedureAnamnesisTemplateService';

export const fetchAnamnesisTemplates = async () => {
  const data = await procedureAnamnesisTemplateService.list({ limit: 200 });
  return Array.isArray(data?.items) ? data.items : [];
};

export const useAnamnesisTemplatesQuery = () => useQuery({
  queryKey: queryKeys.anamnesisTemplates,
  queryFn: fetchAnamnesisTemplates,
  refetchInterval: 15_000,
});
