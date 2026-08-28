import api from './api';

export interface InternPayload {
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  institution?: string;
  course?: string;
  startDate?: string;
  endDate?: string;
  professionalIds: string[];
  isActive?: boolean;
}

export default {
  async listInterns(search?: string) {
    const res = await api.get('/accounts/interns/', { params: search ? { search } : undefined });
    return res.data;
  },
  async createIntern(payload: InternPayload) {
    const res = await api.post('/accounts/interns/', payload);
    return res.data;
  },
  async updateIntern(id: string, payload: Partial<InternPayload>) {
    const res = await api.put(`/accounts/interns/${id}`, payload);
    return res.data;
  },
  async deleteIntern(id: string) {
    const res = await api.delete(`/accounts/interns/${id}`);
    return res.data;
  },
};
