import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import authService from '../authService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    localStorage.clear();
  });

  it('logs in, stores token and hydrates user from /auth/users/:id', async () => {
    (api.post as any).mockResolvedValue({
      data: {
        token: 'jwt-123',
        user: { id: 'u1', name: 'Old Name' },
      },
    });
    (api.get as any).mockResolvedValue({
      data: { id: 'u1', name: 'Updated Name' },
    });

    const result = await authService.login({ email: 'user@mail.com', password: '123456' } as any);

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@mail.com',
      password: '123456',
    });
    expect(api.get).toHaveBeenCalledWith('/auth/users/u1');
    expect(localStorage.getItem('token')).toBe('jwt-123');
    expect(localStorage.getItem('user')).toContain('Updated Name');
    expect(result.token).toBe('jwt-123');
  });

  it('falls back to original user when hydration request fails', async () => {
    (api.post as any).mockResolvedValue({
      data: {
        token: 'jwt-456',
        user: { id: 'u2', name: 'Fallback Name' },
      },
    });
    (api.get as any).mockRejectedValue(new Error('network'));

    await authService.loginAdm({ email: 'adm@mail.com', password: 'abc123' } as any);

    expect(api.post).toHaveBeenCalledWith('/auth/adm/login', {
      email: 'adm@mail.com',
      password: 'abc123',
    });
    expect(localStorage.getItem('user')).toContain('Fallback Name');
  });

  it('register endpoints store auth and support password/reset flows', async () => {
    (api.post as any)
      .mockResolvedValueOnce({ data: { token: 't1', user: { id: 'u3', name: 'User 3' } } })
      .mockResolvedValueOnce({ data: { token: 't2', user: { id: 'u4', name: 'User 4' } } })
      .mockResolvedValueOnce({ data: undefined })
      .mockResolvedValueOnce({ data: undefined })
      .mockResolvedValueOnce({ data: undefined })
      .mockResolvedValueOnce({ data: { message: 'codigo enviado' } })
      .mockResolvedValueOnce({ data: { token: 't3', user: { id: 'u5', name: 'Adm' } } });

    (api.get as any).mockResolvedValue({ data: null });

    const registerResult = await authService.register({ name: 'A' } as any);
    const registerCompanyResult = await authService.registerCompany({ company: {} } as any);
    await authService.sendResetCode('foo@bar.com');
    await authService.verifyResetCode('foo@bar.com', '1234');
    await authService.resetPassword({} as any);
    const requestResult = await authService.requestAdmRegisterCode({} as any);
    const verifyResult = await authService.verifyAdmRegisterCode({} as any);

    expect(registerResult.token).toBe('t1');
    expect(registerCompanyResult.token).toBe('t2');
    expect(requestResult).toEqual({ message: 'codigo enviado' });
    expect(verifyResult.token).toBe('t3');
    expect(api.post).toHaveBeenCalledWith('/auth/register', { name: 'A' });
    expect(api.post).toHaveBeenCalledWith('/auth/register', { company: {} });
    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { identifier: 'foo@bar.com' });
    expect(api.post).toHaveBeenCalledWith('/auth/verify-code', { identifier: 'foo@bar.com', code: '1234' });
    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {});
    expect(api.post).toHaveBeenCalledWith('/auth/adm/request-register-code', {});
    expect(api.post).toHaveBeenCalledWith('/auth/adm/verify-register-code', {});
  });

  it('logout clears storage and helper getters behave as expected', () => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ id: 'u9', name: 'User 9' }));

    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getToken()).toBe('jwt');
    expect(authService.getCurrentUser()).toEqual({ id: 'u9', name: 'User 9' });

    localStorage.setItem('user', '{invalid-json');
    expect(authService.getCurrentUser()).toBeNull();

    authService.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
