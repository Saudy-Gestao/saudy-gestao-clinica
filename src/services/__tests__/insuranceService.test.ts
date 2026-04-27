import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import insuranceService from '../insuranceService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('insuranceService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('lists insurances with params', async () => {
    (api.get as any).mockResolvedValue({ data: { total: 1, items: [{ id: 'i1' }] } });

    const result = await insuranceService.listInsurances({ search: 'amil', isActive: true });

    expect(api.get).toHaveBeenCalledWith('/procedures/insurances/', {
      params: { search: 'amil', isActive: true },
    });
    expect(result.total).toBe(1);
  });

  it('creates, updates and deletes insurance', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'i2' } });
    (api.put as any).mockResolvedValue({ data: { id: 'i2', name: 'Unimed' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const created = await insuranceService.createInsurance({ name: 'Unimed' });
    const updated = await insuranceService.updateInsurance('i2', { name: 'Unimed' });
    const removed = await insuranceService.deleteInsurance('i2');

    expect(api.post).toHaveBeenCalledWith('/procedures/insurances/', { name: 'Unimed' });
    expect(api.put).toHaveBeenCalledWith('/procedures/insurances/i2', { name: 'Unimed' });
    expect(api.delete).toHaveBeenCalledWith('/procedures/insurances/i2');
    expect(created.id).toBe('i2');
    expect(updated.name).toBe('Unimed');
    expect(removed.success).toBe(true);
  });
});
