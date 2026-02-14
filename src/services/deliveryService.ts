import api from './api';

export interface CreateDeliveryPayload {
  patientName: string;
  documentType?: string;
  availableAt?: string; // ISO
  description?: string;
  responsible?: string;
  status?: string;
  deliveredTo?: string;
  deliveredAt?: string; // ISO
}

export interface UpdateDeliveryPayload {
  patientName?: string;
  documentType?: string;
  availableAt?: string; // ISO
  description?: string;
  responsible?: string;
  status?: string;
  deliveredTo?: string;
  deliveredAt?: string; // ISO
}

export default {
  async createDelivery(payload: CreateDeliveryPayload) {
    const url = '/admin/deliveries/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async getDeliveries() {
    const url = '/admin/deliveries/';
    const res = await api.get(url);
    return res.data;
  },

  async updateDelivery(id: string, payload: UpdateDeliveryPayload) {
    const url = `/admin/deliveries/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },
};
