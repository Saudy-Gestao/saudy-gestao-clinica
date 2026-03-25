import { useQuery } from '@tanstack/react-query';
import invoiceService from '../services/invoiceService';
import { queryKeys } from '../lib/queryKeys';

export const fetchInvoices = async () => {
  const response: any = await invoiceService.getInvoices();
  return Array.isArray(response) ? response : (Array.isArray(response?.items) ? response.items : []);
};

export const useInvoicesQuery = () => useQuery({
  queryKey: queryKeys.invoices,
  queryFn: fetchInvoices,
  refetchInterval: 15_000,
});
