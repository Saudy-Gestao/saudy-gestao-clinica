import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import branchService from '../branchService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('branchService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists and gets branch by id', async () => {
    (api.get as any)
      .mockResolvedValueOnce({ data: [{ id: 'b1' }] })
      .mockResolvedValueOnce({ data: { id: 'b1', name: 'Centro' } });

    const list = await branchService.listBranches();
    const item = await branchService.getBranch('b1');

    expect(api.get).toHaveBeenNthCalledWith(1, '/auth/branches');
    expect(api.get).toHaveBeenNthCalledWith(2, '/auth/branches/b1');
    expect(list).toEqual([{ id: 'b1' }]);
    expect(item.name).toBe('Centro');
  });

  it('creates, updates and deletes branch', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'b2' } });
    (api.put as any).mockResolvedValue({ data: { id: 'b2', tradeName: 'Filial Sul' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const created = await branchService.createBranch({ tradeName: 'Filial Sul' });
    const updated = await branchService.updateBranch('b2', { tradeName: 'Filial Sul' });
    const removed = await branchService.deleteBranch('b2');

    expect(api.post).toHaveBeenCalledWith('/auth/branches', { tradeName: 'Filial Sul' });
    expect(api.put).toHaveBeenCalledWith('/auth/branches/b2', { tradeName: 'Filial Sul' });
    expect(api.delete).toHaveBeenCalledWith('/auth/branches/b2');
    expect(created.id).toBe('b2');
    expect(updated.tradeName).toBe('Filial Sul');
    expect(removed).toEqual({ success: true });
  });
});
