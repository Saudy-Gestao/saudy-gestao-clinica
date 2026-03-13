import api from './api';

export interface CreateProcedurePayload {
  name: string;
  description?: string;
  price?: number | null;
  durationMinutes?: number | null;
  acceptsInsurance?: boolean;
  acceptedInsurances?: string[];
  acceptedSubInsurances?: Record<string, string[]>;
  modalities?: string[];
  doctors?: { doctorId: string; doctorName?: string | null }[];
  procedureMaterials?: { inventoryItemId: string; quantity: number }[];
}

export interface UpdateProcedurePayload {
  name?: string;
  description?: string;
  price?: number | null;
  durationMinutes?: number | null;
  acceptsInsurance?: boolean;
  acceptedInsurances?: string[];
  acceptedSubInsurances?: Record<string, string[]>;
  modalities?: string[];
  doctors?: { doctorId: string; doctorName?: string | null }[];
  procedureMaterials?: { inventoryItemId: string; quantity: number }[];
  isActive?: boolean;
}

export default {
  async createProcedure(payload: CreateProcedurePayload) {
    const url = '/procedures/procedures/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async updateProcedure(id: string, payload: UpdateProcedurePayload) {
    const url = `/procedures/procedures/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async getProcedure(id: string) {
    const url = `/procedures/procedures/${id}`;
    const res = await api.get(url);
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
