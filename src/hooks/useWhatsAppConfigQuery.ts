import { useQuery } from '@tanstack/react-query';
import whatsappService from '../services/whatsappService';
import { queryKeys } from '../lib/queryKeys';

export const fetchWhatsAppConfig = () => whatsappService.getConfig();

export const useWhatsAppConfigQuery = () => useQuery({
  queryKey: queryKeys.whatsappConfig,
  queryFn: fetchWhatsAppConfig,
  refetchInterval: 15_000,
});
