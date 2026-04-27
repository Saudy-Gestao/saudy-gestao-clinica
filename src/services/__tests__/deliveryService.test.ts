import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import deliveryService from '../deliveryService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('deliveryService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
  });

  it('creates and lists deliveries', async () => {
    (api.post as any).mockResolvedValue({ data: { id: 'd1' } });
    (api.get as any).mockResolvedValue({ data: [{ id: 'd1' }] });

    const created = await deliveryService.createDelivery({ patientName: 'Maria' });
    const list = await deliveryService.getDeliveries();

    expect(api.post).toHaveBeenCalledWith('/admin/deliveries/', { patientName: 'Maria' });
    expect(api.get).toHaveBeenCalledWith('/admin/deliveries/');
    expect(created.id).toBe('d1');
    expect(list).toEqual([{ id: 'd1' }]);
  });

  it('updates delivery by id', async () => {
    (api.put as any).mockResolvedValue({ data: { id: 'd1', status: 'ENTREGUE' } });

    const updated = await deliveryService.updateDelivery('d1', { status: 'ENTREGUE' });

    expect(api.put).toHaveBeenCalledWith('/admin/deliveries/d1', { status: 'ENTREGUE' });
    expect(updated.status).toBe('ENTREGUE');
  });
});
