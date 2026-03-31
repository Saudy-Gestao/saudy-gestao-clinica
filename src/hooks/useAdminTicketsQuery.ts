import { useQuery } from '@tanstack/react-query';
import ticketService, { type TicketPriority, type TicketSort, type TicketStatus, type TicketType } from '../services/ticketService';
import { queryKeys } from '../lib/queryKeys';

export const fetchAdminTickets = (filters?: {
  status?: TicketStatus | 'ALL';
  type?: TicketType | 'ALL';
  priority?: TicketPriority | 'ALL';
  sort?: TicketSort;
  search?: string;
}) =>
  ticketService.list(filters);

export const useAdminTicketsQuery = (filters?: {
  status?: TicketStatus | 'ALL';
  type?: TicketType | 'ALL';
  priority?: TicketPriority | 'ALL';
  sort?: TicketSort;
  search?: string;
}) =>
  useQuery({
    queryKey: [
      ...queryKeys.adminTickets,
      filters?.status || 'ALL',
      filters?.type || 'ALL',
      filters?.priority || 'ALL',
      filters?.sort || 'NEWEST',
      filters?.search || '',
    ],
    queryFn: () => fetchAdminTickets(filters),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
  });
