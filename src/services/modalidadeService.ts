import api from './api';

export interface Modalidade {
  id: string;
  branchId?: string | null;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdByUserId?: string | null;
  createdByName?: string | null;
  updatedByUserId?: string | null;
  updatedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModalidadeAuditLogEntry {
  id: string;
  modalidadeId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  performedByUserId?: string | null;
  performedByName?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface CreateModalidadePayload {
  name: string;
  description?: string;
  force?: boolean;
}

export default {
  async listModalidades(params?: {
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const res = await api.get('/procedures/modalidades/', { params });
    return res.data;
  },

  async getModalidade(id: string) {
    const res = await api.get(`/procedures/modalidades/${id}`);
    return res.data;
  },

  async createModalidade(payload: CreateModalidadePayload) {
    const res = await api.post('/procedures/modalidades/', payload);
    return res.data;
  },

  async updateModalidade(id: string, payload: Partial<CreateModalidadePayload> & { isActive?: boolean }) {
    const res = await api.put(`/procedures/modalidades/${id}`, payload);
    return res.data;
  },

  async deleteModalidade(id: string) {
    const res = await api.delete(`/procedures/modalidades/${id}`);
    return res.data;
  },

  async getModalidadeAuditLog(id: string) {
    const res = await api.get(`/procedures/modalidades/${id}/audit`);
    return res.data;
  },
};
