import api from './api';

export interface CreateProcedurePayload {
  name: string;
  description?: string;
  price?: number | null;
  acceptsInsurance?: boolean;
  acceptedInsurances?: string[];
  modalities?: string[];
  doctors?: { doctorId: string; doctorName?: string | null }[];
}

export default {
  async createProcedure(payload: CreateProcedurePayload) {
    const url = '/procedures/procedures/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async listProcedures(params?: {
    search?: string;
    acceptsInsurance?: boolean;
    doctorId?: string;
    limit?: number;
    offset?: number;
  }) {
    const url = '/procedures/procedures/';
    const res = await api.get(url, { params });
    return res.data;
  },
};
