import { useQuery } from '@tanstack/react-query';
import userService from '../services/userService';
import { queryKeys } from '../lib/queryKeys';

export const fetchSettingsUsers = () => userService.listUsers();

export const useSettingsUsersQuery = () => useQuery({
  queryKey: queryKeys.settingsUsers,
  queryFn: fetchSettingsUsers,
  refetchInterval: 30_000,
});
