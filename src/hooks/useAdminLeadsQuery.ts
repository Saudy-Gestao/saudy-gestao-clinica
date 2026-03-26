import { useQuery } from '@tanstack/react-query';
import leadService, { type LeadStatus } from '../services/leadService';
import { queryKeys } from '../lib/queryKeys';

export const fetchAdminLeads = (filters?: { status?: LeadStatus | 'ALL'; search?: string }) =>
  leadService.list(filters);

export const useAdminLeadsQuery = (filters?: { status?: LeadStatus | 'ALL'; search?: string }) =>
  useQuery({
    queryKey: [...queryKeys.adminLeads, filters?.status || 'ALL', filters?.search || ''],
    queryFn: () => fetchAdminLeads(filters),
    refetchInterval: 30_000,
  });
