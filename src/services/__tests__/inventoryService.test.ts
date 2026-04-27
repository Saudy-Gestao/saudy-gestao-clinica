import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import inventoryService from '../inventoryService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('inventoryService', () => {
  beforeEach(() => {
    (api.get as any).mockReset();
    (api.post as any).mockReset();
    (api.put as any).mockReset();
    (api.delete as any).mockReset();
  });

  it('creates and lists inventory items', async () => {
    const payload = { code: 'IT-1', name: 'Luva', expiryDate: '2026-12-01' };
    (api.post as any).mockResolvedValue({ data: { id: 'inv1' } });
    (api.get as any).mockResolvedValue({ data: [{ id: 'inv1' }] });

    const created = await inventoryService.createItem(payload as any);
    const list = await inventoryService.getItems();

    expect(api.post).toHaveBeenCalledWith('/admin/inventory/', payload);
    expect(api.get).toHaveBeenCalledWith('/admin/inventory/');
    expect(created.id).toBe('inv1');
    expect(list).toEqual([{ id: 'inv1' }]);
  });

  it('updates and deletes inventory item', async () => {
    (api.put as any).mockResolvedValue({ data: { id: 'inv1', name: 'Luva P' } });
    (api.delete as any).mockResolvedValue({ data: { success: true } });

    const updated = await inventoryService.updateItem('inv1', { name: 'Luva P' });
    const removed = await inventoryService.deleteItem('inv1');

    expect(api.put).toHaveBeenCalledWith('/admin/inventory/inv1', { name: 'Luva P' });
    expect(api.delete).toHaveBeenCalledWith('/admin/inventory/inv1');
    expect(updated.name).toBe('Luva P');
    expect(removed.success).toBe(true);
  });
});
