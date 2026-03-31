import { useQuery } from '@tanstack/react-query';
import ticketService, { type TicketStatus, type TicketType } from '../services/ticketService';
import { queryKeys } from '../lib/queryKeys';

export const fetchMyTickets = (filters?: { status?: TicketStatus | 'ALL'; type?: TicketType | 'ALL'; search?: string }) =>
  ticketService.listMine(filters);

export const useMyTicketsQuery = (filters?: { status?: TicketStatus | 'ALL'; type?: TicketType | 'ALL'; search?: string }) =>
  useQuery({
    queryKey: [...queryKeys.myTickets, filters?.status || 'ALL', filters?.type || 'ALL', filters?.search || ''],
    queryFn: () => fetchMyTickets(filters),
    refetchInterval: 30_000,
  });
