import { beforeEach, describe, expect, it, vi } from 'vitest';
import userService from '../userService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('userService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists, gets, creates, updates and deletes users', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: [{ id: 'u1' }] } as any)
      .mockResolvedValueOnce({ data: { id: 'u1', name: 'Maria' } } as any);
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'u2' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'u1', name: 'Maria Silva' } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    await expect(userService.listUsers()).resolves.toEqual([{ id: 'u1' }]);
    await expect(userService.getUser('u1')).resolves.toEqual({ id: 'u1', name: 'Maria' });
    await expect(userService.createUser({ name: 'Nova' })).resolves.toEqual({ id: 'u2' });
    await expect(userService.updateUser('u1', { name: 'Maria Silva' })).resolves.toEqual({ id: 'u1', name: 'Maria Silva' });
    await expect(userService.deleteUser('u1')).resolves.toEqual({ success: true });

    expect(api.get).toHaveBeenNthCalledWith(1, '/auth/users');
    expect(api.get).toHaveBeenNthCalledWith(2, '/auth/users/u1');
    expect(api.post).toHaveBeenCalledWith('/auth/users', { name: 'Nova' });
    expect(api.put).toHaveBeenCalledWith('/auth/users/u1', { name: 'Maria Silva' });
    expect(api.delete).toHaveBeenCalledWith('/auth/users/u1');
  });

  it('adds access to user only when it is not already present', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { accesses: [{ id: 'a1' }] } } as any)
      .mockResolvedValueOnce({ data: { accesses: [{ id: 'a1' }, { id: 'a2' }] } } as any);
    vi.mocked(api.put)
      .mockResolvedValueOnce({ data: { accessIds: ['a1', 'a2'] } } as any)
      .mockResolvedValueOnce({ data: { accessIds: ['a1', 'a2'] } } as any);

    const appended = await userService.addAccessToUser('u1', 'a2');
    const unchanged = await userService.addAccessToUser('u1', 'a2');

    expect(api.put).toHaveBeenNthCalledWith(1, '/auth/users/u1', { accessIds: ['a1', 'a2'] });
    expect(api.put).toHaveBeenNthCalledWith(2, '/auth/users/u1', { accessIds: ['a1', 'a2'] });
    expect(appended.accessIds).toEqual(['a1', 'a2']);
    expect(unchanged.accessIds).toEqual(['a1', 'a2']);
  });
});