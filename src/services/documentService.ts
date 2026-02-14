import api from './api';

export interface DocumentPayload {
  patientName?: string;
  documentType: string;
  description?: string;
  status?: string;
  fileName?: string;
  fileUrl?: string;
}

export default {
  async list(params?: { search?: string; status?: string; documentType?: string; limit?: number; offset?: number }) {
    const url = '/care/documents/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async create(payload: DocumentPayload) {
    const url = '/care/documents/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async update(id: string, payload: Partial<DocumentPayload>) {
    const url = `/care/documents/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async remove(id: string) {
    const url = `/care/documents/${id}`;
    const res = await api.delete(url);
    return res.data;
  },
};
