import { useQuery } from '@tanstack/react-query';
import sectorService from '../services/sectorService';
import { queryKeys } from '../lib/queryKeys';

export const fetchRoomsAdmin = async () => {
  const data: any = await sectorService.listSectors();
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

export const useRoomsAdminQuery = () => useQuery({
  queryKey: queryKeys.roomsAdmin,
  queryFn: fetchRoomsAdmin,
  refetchInterval: 15_000,
});
