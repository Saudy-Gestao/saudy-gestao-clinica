import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import leadService from '../leadService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('leadService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.patch as any).mockReset();
  });

  it('normalizes list response from array and from items/data structures', async () => {
    (api.get as any)
      .mockResolvedValueOnce({ data: [{ id: 'l1' }] })
      .mockResolvedValueOnce({ data: { items: [{ id: 'l2' }], total: 10 } })
      .mockResolvedValueOnce({ data: { data: [{ id: 'l3' }] } });

    const fromArray = await leadService.list();
    const fromItems = await leadService.list({ status: 'NEW' });
    const fromData = await leadService.list({ search: 'joao' });

    expect(api.get).toHaveBeenNthCalledWith(1, '/admin/leads', { params: undefined });
    expect(api.get).toHaveBeenNthCalledWith(2, '/admin/leads', { params: { status: 'NEW' } });
    expect(api.get).toHaveBeenNthCalledWith(3, '/admin/leads', { params: { search: 'joao' } });

    expect(fromArray).toEqual({ items: [{ id: 'l1' }], total: 1 });
    expect(fromItems).toEqual({ items: [{ id: 'l2' }], total: 10 });
    expect(fromData).toEqual({ items: [{ id: 'l3' }], total: 1 });
  });

  it('creates lead and updates lead status', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'l4', status: 'NEW' } });
    (api.patch as any).mockResolvedValue({ data: { id: 'l4', status: 'CONTACTED' } });

    const created = await leadService.create({ name: 'Ana', email: 'ana@mail.com' });
    const updated = await leadService.updateStatus('l4', 'CONTACTED');

    expect(api.post).toHaveBeenCalledWith('/admin/leads', { name: 'Ana', email: 'ana@mail.com' });
    expect(api.patch).toHaveBeenCalledWith('/admin/leads/l4', { status: 'CONTACTED' });
    expect(created.id).toBe('l4');
    expect(updated.status).toBe('CONTACTED');
  });
});
