import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import financeService from '../financeService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('financeService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
  });

  it('creates and lists finance entries', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'f1' } });
    (api.get as any).mockResolvedValue({ data: [{ id: 'f1' }] });

    const created = await financeService.createEntry({ type: 'RECEITA', value: 100 } as any);
    const list = await financeService.getEntries();

    expect(api.post).toHaveBeenCalledWith('/admin/finance/', { type: 'RECEITA', value: 100 });
    expect(api.get).toHaveBeenCalledWith('/admin/finance/');
    expect(created.id).toBe('f1');
    expect(list).toEqual([{ id: 'f1' }]);
  });

  it('updates finance entry by id', async () => {
    (api.put as any).mockResolvedValue({ data: { id: 'f1', status: 'PAGO' } });

    const updated = await financeService.updateEntry('f1', { status: 'PAGO' } as any);

    expect(api.put).toHaveBeenCalledWith('/admin/finance/f1', { status: 'PAGO' });
    expect(updated.status).toBe('PAGO');
  });
});
