import { useQuery } from '@tanstack/react-query';
import whatsappService from '../services/whatsappService';
import { queryKeys } from '../lib/queryKeys';

export const fetchWhatsAppPageData = async () => {
  const [templates, notificationConfig, variables, logs] = await Promise.all([
    whatsappService.listTemplates(),
    whatsappService.getNotificationConfig(),
    whatsappService.getAvailableVariables(),
    whatsappService.listLogs({ limit: 50, offset: 0 }),
  ]);

  return {
    templates: Array.isArray(templates) ? templates : [],
    notificationConfig: notificationConfig || null,
    variables: Array.isArray(variables) ? variables : [],
    logs: Array.isArray((logs as any)?.items) ? (logs as any).items : [],
  };
};

export const useWhatsAppPageDataQuery = () => useQuery({
  queryKey: queryKeys.whatsappPageData,
  queryFn: fetchWhatsAppPageData,
  refetchInterval: 15_000,
});
