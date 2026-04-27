import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import accessService from '../accessService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('accessService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists accesses', async () => {
    (api.get as any).mockResolvedValue({ data: [{ id: 'a1' }] });

    const result = await accessService.listAccesses();

    expect(api.get).toHaveBeenCalledWith('/auth/accesses');
    expect(result).toEqual([{ id: 'a1' }]);
  });

  it('creates, updates and deletes access', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'a2' } });
    (api.put as any).mockResolvedValue({ data: { id: 'a2', description: 'Recepcao' } });
    (api.delete as any).mockResolvedValue({ data: undefined });

    const created = await accessService.createAccess({ description: 'Recepcao', moduleIds: ['m1'] });
    const updated = await accessService.updateAccess('a2', { description: 'Recepcao' });
    const removed = await accessService.deleteAccess('a2');

    expect(api.post).toHaveBeenCalledWith('/auth/accesses', { description: 'Recepcao', moduleIds: ['m1'] });
    expect(api.put).toHaveBeenCalledWith('/auth/accesses/a2', { description: 'Recepcao' });
    expect(api.delete).toHaveBeenCalledWith('/auth/accesses/a2');
    expect(created.id).toBe('a2');
    expect(updated.description).toBe('Recepcao');
    expect(removed).toBeUndefined();
  });
});
