import api from './api';

export interface EnvelopmentPayload {
  patientName: string;
  dateTime?: string;
  responsible?: string;
  status?: string;
  pages?: number;
  documentType?: string;
  description?: string;
  fileName?: string;
  fileUrl?: string;
}

export default {
  async list(params?: { search?: string; status?: string; documentType?: string; limit?: number; offset?: number }) {
    const url = '/care/envelopments/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async create(payload: EnvelopmentPayload) {
    const url = '/care/envelopments/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async update(id: string, payload: Partial<EnvelopmentPayload>) {
    const url = `/care/envelopments/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async remove(id: string) {
    const url = `/care/envelopments/${id}`;
    const res = await api.delete(url);
    return res.data;
  },
};
