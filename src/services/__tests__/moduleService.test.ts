import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import { moduleService } from '../moduleService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('moduleService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
  });

  it('gets all modules and by id', async () => {
    (api.get as any)
      .mockResolvedValueOnce({ data: [{ id: 'm1', name: 'dashboard' }] })
      .mockResolvedValueOnce({ data: { id: 'm1', name: 'dashboard' } });

    const all = await moduleService.getAll();
    const one = await moduleService.getById('m1');

    expect(api.get).toHaveBeenNthCalledWith(1, '/auth/modules');
    expect(api.get).toHaveBeenNthCalledWith(2, '/auth/modules/m1');
    expect(all[0].id).toBe('m1');
    expect(one.name).toBe('dashboard');
  });
});
