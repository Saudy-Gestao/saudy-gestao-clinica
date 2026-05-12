import api from './api';

export interface CreateInventoryPayload {
  code: string;
  name: string;
  category?: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  unitPrice?: number;
  expiryDate?: string; // YYYY-MM-DD
  notes?: string;
}

export interface InventoryMovementPayload {
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface InventoryLotPayload {
  lotCode: string;
  quantity: number;
  expiryDate?: string; // YYYY-MM-DD
  unitPrice?: number;
  supplier?: string;
  notes?: string;
}

export interface InventoryKitPayload {
  name: string;
  description?: string;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
  }>;
}

export default {
  async createItem(payload: CreateInventoryPayload) {
    const url = '/admin/inventory/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async updateItem(id: number | string, payload: Partial<CreateInventoryPayload>) {
    const sanitizedPayload = Object.fromEntries(
      Object.entries(payload || {}).filter(([, value]) => value !== undefined)
    );
    const routes = [
      `/admin/inventory/${id}/`,
      `/admin/inventory/${id}`,
      `/admin/inventory/item/${id}/`,
      `/admin/inventory/item/${id}`,
    ];
    const methods: Array<'patch' | 'put'> = ['patch', 'put'];
    let lastErr: any = null;

    for (const route of routes) {
      for (const method of methods) {
        try {
          const res = await api.request({ url: route, method, data: sanitizedPayload });
          return res.data;
        } catch (err: any) {
          lastErr = err;
          const status = Number(err?.response?.status || 0);
          if (![404, 405, 501].includes(status)) throw err;
        }
      }
    }
    throw lastErr;
  },

  async deleteItem(id: number | string) {
    const url = `/admin/inventory/${id}/`;
    const res = await api.delete(url);
    return res.data;
  },

  async getItems() {
    const url = '/admin/inventory/';
    const res = await api.get(url);
    return res.data;
  },

  async getMovements(itemId: number | string, params?: { limit?: number; offset?: number }) {
    const url = `/admin/inventory/${itemId}/movements/`;
    const res = await api.get(url, { params });
    return res.data;
  },

  async createMovement(itemId: number | string, payload: InventoryMovementPayload) {
    const attempts: Array<{ url: string; body: any }> = [
      { url: `/admin/inventory/${itemId}/movements/`, body: payload },
      { url: `/admin/inventory/${itemId}/movements`, body: payload },
      { url: '/admin/inventory/movements/', body: { ...payload, inventoryItemId: String(itemId) } },
      { url: '/admin/inventory/movements', body: { ...payload, inventoryItemId: String(itemId) } },
    ];
    let lastErr: any = null;

    for (const attempt of attempts) {
      try {
        const res = await api.post(attempt.url, attempt.body);
        return res.data;
      } catch (err: any) {
        lastErr = err;
        const status = Number(err?.response?.status || 0);
        if (![404, 405, 501].includes(status)) throw err;
      }
    }
    throw lastErr;
  },

  async getLots(itemId: number | string, params?: { limit?: number; offset?: number }) {
    const url = `/admin/inventory/${itemId}/lots/`;
    const res = await api.get(url, { params });
    return res.data;
  },

  async createLot(itemId: number | string, payload: InventoryLotPayload) {
    const url = `/admin/inventory/${itemId}/lots/`;
    const res = await api.post(url, payload);
    return res.data;
  },

  async getKits(params?: { search?: string; limit?: number; offset?: number }) {
    const url = '/admin/inventory/kits';
    const res = await api.get(url, { params });
    return res.data;
  },

  async createKit(payload: InventoryKitPayload) {
    const url = '/admin/inventory/kits';
    const res = await api.post(url, payload);
    return res.data;
  },

  async updateKit(kitId: number | string, payload: Partial<InventoryKitPayload> & { isActive?: boolean }) {
    const url = `/admin/inventory/kits/${kitId}`;
    const res = await api.put(url, payload);
    return res.data;
  },
};
