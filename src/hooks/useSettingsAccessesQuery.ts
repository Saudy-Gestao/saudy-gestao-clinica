import { useQuery } from '@tanstack/react-query';
import userService from '../services/userService';
import { queryKeys } from '../lib/queryKeys';

export const fetchSettingsAccesses = async () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return [];

  const user = JSON.parse(userStr);
  if (!user?.id) return [];

  const freshUser = await userService.getUser(user.id);
  return freshUser.accesses || [];
};

export const useSettingsAccessesQuery = () => useQuery({
  queryKey: queryKeys.settingsAccesses,
  queryFn: fetchSettingsAccesses,
  refetchInterval: 30_000,
});
