import api from './api';

export interface CreateFinancePayload {
  type: string;
  category?: string;
  description?: string;
  value: number;
  discount?: number;
  dueDate?: string; // YYYY-MM-DD
  paymentMethod?: string;
  relatedName?: string;
}

export default {
  async createEntry(payload: CreateFinancePayload) {
    const url = '/admin/finance/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async getEntries() {
    const url = '/admin/finance/';
    const res = await api.get(url);
    return res.data;
  },

  async updateEntry(id: string | number, payload: Partial<CreateFinancePayload & { status?: string }>) {
    const url = `/admin/finance/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },
};