import { useQuery } from '@tanstack/react-query';
import userService from '../services/userService';
import authService from '../services/authService';
import { queryKeys } from '../lib/queryKeys';

const getCachedUser = () => {
  const user = authService.getCurrentUser();
  return user && (user as any).id ? user : null;
};

export const useCurrentUserProfileQuery = () => {
  const cachedUser = getCachedUser();
  const userId = String((cachedUser as any)?.id || '');

  return useQuery({
    queryKey: [...queryKeys.currentUserProfile, userId],
    queryFn: () => userService.getUser(userId),
    enabled: Boolean(userId),
    initialData: cachedUser || undefined,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
