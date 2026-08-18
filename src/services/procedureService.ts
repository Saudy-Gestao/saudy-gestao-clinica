import api from './api';

export interface CreateProcedurePayload {
  name: string;
  description?: string;
  appointmentType?: 'CONSULTA' | 'EXAME';
  price?: number | null;
  durationMinutes?: number | null;
  modalities?: string[];
  modalidadeId?: string | null;
  branchIds?: string[];
  doctors?: { doctorId: string; doctorName?: string | null }[];
  procedureMaterials?: { inventoryItemId: string; quantity: number }[];
  procedureKitBindings?: Array<{
    inventoryKitId: string;
    insuranceName?: string | null;
    isActive?: boolean;
  }>;
}

export interface UpdateProcedurePayload {
  name?: string;
  description?: string;
  appointmentType?: 'CONSULTA' | 'EXAME';
  price?: number | null;
  durationMinutes?: number | null;
  modalities?: string[];
  modalidadeId?: string | null;
  branchIds?: string[];
  doctors?: { doctorId: string; doctorName?: string | null }[];
  procedureMaterials?: { inventoryItemId: string; quantity: number }[];
  procedureKitBindings?: Array<{
    inventoryKitId: string;
    insuranceName?: string | null;
    isActive?: boolean;
  }>;
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
    doctorId?: string;
    limit?: number;
    offset?: number;
  }) {
    const url = '/procedures/procedures/';
    const res = await api.get(url, { params });
    return res.data;
  },
};
