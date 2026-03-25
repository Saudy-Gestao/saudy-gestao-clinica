import { useQuery } from '@tanstack/react-query';
import deliveryService from '../services/deliveryService';
import { queryKeys } from '../lib/queryKeys';

export const fetchDeliveries = async () => {
  const data: any = await deliveryService.getDeliveries();
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

export const useDeliveriesQuery = () => useQuery({
  queryKey: queryKeys.deliveries,
  queryFn: fetchDeliveries,
  refetchInterval: 15_000,
});
