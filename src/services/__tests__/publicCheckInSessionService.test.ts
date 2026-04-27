import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: postMock,
    })),
  },
}));

vi.mock('../getApiBaseUrl', () => ({
  getApiBaseUrl: vi.fn(() => 'https://api.test'),
}));

import publicCheckInSessionService from '../publicCheckInSessionService';

describe('publicCheckInSessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    postMock.mockReset();
  });

  it('logs in, persists token and user, and emits auth changed event', async () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    postMock.mockResolvedValue({
      data: {
        token: 'totem-token',
        user: { id: 'u1', name: 'Totem User' },
      },
    });

    const response = await publicCheckInSessionService.login({
      email: 'totem@saudy.com',
      password: '123456',
    });

    expect(postMock).toHaveBeenCalledWith('/auth/login', {
      email: 'totem@saudy.com',
      password: '123456',
    });
    expect(localStorage.getItem('publicCheckInToken')).toBe('totem-token');
    expect(localStorage.getItem('publicCheckInUser')).toBe(JSON.stringify({ id: 'u1', name: 'Totem User' }));
    expect(response.token).toBe('totem-token');
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'public-check-in-auth:changed' }));

    dispatchEventSpy.mockRestore();
  });

  it('does not persist auth data when login response has no token', async () => {
    postMock.mockResolvedValue({
      data: {
        user: { id: 'u1', name: 'Totem User' },
      },
    });

    await publicCheckInSessionService.login({
      email: 'totem@saudy.com',
      password: '123456',
    } as any);

    expect(localStorage.getItem('publicCheckInToken')).toBeNull();
    expect(localStorage.getItem('publicCheckInUser')).toBeNull();
  });

  it('reads auth state, handles invalid stored user, and clears session on logout', () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    localStorage.setItem('publicCheckInToken', 'stored-token');
    localStorage.setItem('publicCheckInUser', JSON.stringify({ id: 'u2', name: 'Stored User' }));

    expect(publicCheckInSessionService.getToken()).toBe('stored-token');
    expect(publicCheckInSessionService.getCurrentUser()).toEqual({ id: 'u2', name: 'Stored User' });
    expect(publicCheckInSessionService.isAuthenticated()).toBe(true);
    expect(publicCheckInSessionService.getAuthChangedEventName()).toBe('public-check-in-auth:changed');

    localStorage.setItem('publicCheckInUser', '{invalid-json');
    expect(publicCheckInSessionService.getCurrentUser()).toBeNull();

    publicCheckInSessionService.logout();

    expect(localStorage.getItem('publicCheckInToken')).toBeNull();
    expect(localStorage.getItem('publicCheckInUser')).toBeNull();
    expect(publicCheckInSessionService.isAuthenticated()).toBe(false);
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'public-check-in-auth:changed' }));

    dispatchEventSpy.mockRestore();
  });
});