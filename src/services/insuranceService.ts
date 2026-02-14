import api from './api';

export interface CreateInsurancePayload {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export default {
  async listInsurances(params?: {
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const url = '/procedures/insurances/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async createInsurance(payload: CreateInsurancePayload) {
    const url = '/procedures/insurances/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async updateInsurance(id: string, payload: Partial<CreateInsurancePayload>) {
    const url = `/procedures/insurances/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async deleteInsurance(id: string) {
    const url = `/procedures/insurances/${id}`;
    const res = await api.delete(url);
    return res.data;
  },
};
