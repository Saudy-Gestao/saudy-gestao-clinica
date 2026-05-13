import api from './api';

export interface CreateInsurancePayload {
  name: string;
  code?: string;
  description?: string;
  tissRegistroAns?: string;
  tissOperadoraCnpj?: string;
  tissVersao?: string;
  tissPrestadorCnpj?: string;
  tissPrestadorCnes?: string;
  tissCodigoPrestadorOperadora?: string;
  isActive?: boolean;
  subInsurances?: string[];
}

export interface InsuranceProcedurePayload {
  procedureId: string;
  subInsuranceId?: string | null;
  price?: number | null;
  isActive?: boolean;
}

export interface UpdateInsuranceProcedurePayload {
  price?: number | null;
  isActive?: boolean;
  subInsuranceId?: string | null;
}

export default {
  async listInsurances(params?: {
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const res = await api.get('/procedures/insurances/', { params });
    return res.data;
  },

  async getInsurance(id: string) {
    const res = await api.get(`/procedures/insurances/${id}`);
    return res.data;
  },

  async createInsurance(payload: CreateInsurancePayload) {
    const res = await api.post('/procedures/insurances/', payload);
    return res.data;
  },

  async updateInsurance(id: string, payload: Partial<CreateInsurancePayload>) {
    const res = await api.put(`/procedures/insurances/${id}`, payload);
    return res.data;
  },

  async deleteInsurance(id: string) {
    const res = await api.delete(`/procedures/insurances/${id}`);
    return res.data;
  },

  // InsuranceProcedure
  async listInsuranceProcedures(insuranceId: string, params?: {
    subInsuranceId?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const res = await api.get(`/procedures/insurances/${insuranceId}/procedures`, { params });
    return res.data;
  },

  async addInsuranceProcedure(insuranceId: string, payload: InsuranceProcedurePayload) {
    const res = await api.post(`/procedures/insurances/${insuranceId}/procedures`, payload);
    return res.data;
  },

  async updateInsuranceProcedure(insuranceId: string, id: string, payload: UpdateInsuranceProcedurePayload) {
    const res = await api.put(`/procedures/insurances/${insuranceId}/procedures/${id}`, payload);
    return res.data;
  },

  async removeInsuranceProcedure(insuranceId: string, id: string) {
    const res = await api.delete(`/procedures/insurances/${insuranceId}/procedures/${id}`);
    return res.data;
  },
};
