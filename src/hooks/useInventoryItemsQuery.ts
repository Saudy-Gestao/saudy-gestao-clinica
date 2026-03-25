import { useQuery } from '@tanstack/react-query';
import inventoryService from '../services/inventoryService';
import { queryKeys } from '../lib/queryKeys';

export const fetchInventoryItems = async () => {
  const data: any = await inventoryService.getItems();
  return Array.isArray(data)
    ? data
    : (Array.isArray(data?.data)
      ? data.data
      : (Array.isArray(data?.items)
        ? data.items
        : []));
};

export const useInventoryItemsQuery = () => useQuery({
  queryKey: queryKeys.inventoryItems,
  queryFn: fetchInventoryItems,
  refetchInterval: 15_000,
});
