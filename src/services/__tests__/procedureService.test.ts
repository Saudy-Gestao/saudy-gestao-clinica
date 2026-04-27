import { beforeEach, describe, expect, it, vi } from 'vitest';
import procedureService from '../procedureService';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('procedureService', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('creates, updates, gets and lists procedures', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'p1' } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'p1', name: 'USG' } } as any);
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { id: 'p1', name: 'USG' } } as any)
      .mockResolvedValueOnce({ data: { items: [{ id: 'p1' }], total: 1 } } as any);

    await expect(procedureService.createProcedure({ name: 'USG', appointmentType: 'EXAME' })).resolves.toEqual({ id: 'p1' });
    await expect(procedureService.updateProcedure('p1', { durationMinutes: 30 })).resolves.toEqual({ id: 'p1', name: 'USG' });
    await expect(procedureService.getProcedure('p1')).resolves.toEqual({ id: 'p1', name: 'USG' });
    await expect(procedureService.listProcedures({ search: 'USG', limit: 10, offset: 0 })).resolves.toEqual({ items: [{ id: 'p1' }], total: 1 });

    expect(api.post).toHaveBeenCalledWith('/procedures/procedures/', { name: 'USG', appointmentType: 'EXAME' });
    expect(api.put).toHaveBeenCalledWith('/procedures/procedures/p1', { durationMinutes: 30 });
    expect(api.get).toHaveBeenNthCalledWith(1, '/procedures/procedures/p1');
    expect(api.get).toHaveBeenNthCalledWith(2, '/procedures/procedures/', { params: { search: 'USG', limit: 10, offset: 0 } });
  });
});