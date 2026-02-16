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
  expiryDate: string; // YYYY-MM-DD — now required for create
  notes?: string;
}

export default {
  async createItem(payload: CreateInventoryPayload) {
    const url = '/admin/inventory/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async updateItem(id: number | string, payload: Partial<CreateInventoryPayload>) {
    const url = `/admin/inventory/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async deleteItem(id: number | string) {
    const url = `/admin/inventory/${id}`;
    const res = await api.delete(url);
    return res.data;
  },

  async getItems() {
    const url = '/admin/inventory/';
    const res = await api.get(url);
    return res.data;
  },
};
