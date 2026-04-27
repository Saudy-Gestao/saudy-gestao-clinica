import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import sectorService from '../sectorService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('sectorService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists and gets sectors', async () => {
    (api.get as any)
      .mockResolvedValueOnce({ data: [{ id: 's1' }] })
      .mockResolvedValueOnce({ data: { id: 's1', name: 'Recepcao' } });

    const list = await sectorService.listSectors();
    const one = await sectorService.getSector('s1');

    expect(api.get).toHaveBeenNthCalledWith(1, '/auth/sectors');
    expect(api.get).toHaveBeenNthCalledWith(2, '/auth/sectors/s1');
    expect(list).toEqual([{ id: 's1' }]);
    expect(one.name).toBe('Recepcao');
  });

  it('creates, updates and deletes sector', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 's2' } });
    (api.put as any).mockResolvedValue({ data: { id: 's2', name: 'Clinico' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const created = await sectorService.createSector({ name: 'Clinico' });
    const updated = await sectorService.updateSector('s2', { name: 'Clinico' });
    const removed = await sectorService.deleteSector('s2');

    expect(api.post).toHaveBeenCalledWith('/auth/sectors', { name: 'Clinico' });
    expect(api.put).toHaveBeenCalledWith('/auth/sectors/s2', { name: 'Clinico' });
    expect(api.delete).toHaveBeenCalledWith('/auth/sectors/s2');
    expect(created.id).toBe('s2');
    expect(updated.name).toBe('Clinico');
    expect(removed.success).toBe(true);
  });
});
