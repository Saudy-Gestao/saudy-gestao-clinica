import { useQuery } from '@tanstack/react-query';
import whatsappService from '../services/whatsappService';
import { queryKeys } from '../lib/queryKeys';
import type { WhatsAppConfigScope } from '../services/whatsappService';

export const fetchWhatsAppConfig = (options?: {
  scope?: WhatsAppConfigScope;
  branchId?: string;
}) => whatsappService.getConfig(options);

export const useWhatsAppConfigQuery = (options?: {
  scope?: WhatsAppConfigScope;
  branchId?: string;
}) => useQuery({
  queryKey: [...queryKeys.whatsappConfig, options?.scope || 'BRANCH', options?.branchId || ''],
  queryFn: () => fetchWhatsAppConfig(options),
  refetchInterval: 15_000,
});
