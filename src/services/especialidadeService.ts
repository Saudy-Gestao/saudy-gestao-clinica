import api from './api';

export interface Especialidade {
  id: string;
  branchId?: string | null;
  modalidadeId: string;
  modalidade?: { id: string; name: string } | null;
  name: string;
  metodos: string[];
  cboId?: string | null;
  cbo?: { id: string; code: string; title: string } | null;
  isActive: boolean;
  createdByUserId?: string | null;
  createdByName?: string | null;
  updatedByUserId?: string | null;
  updatedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EspecialidadeAuditLogEntry {
  id: string;
  especialidadeId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  performedByUserId?: string | null;
  performedByName?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface CreateEspecialidadePayload {
  modalidadeId: string;
  name: string;
  metodos?: string[];
  cboId?: string | null;
  force?: boolean;
}

export default {
  async listEspecialidades(params?: {
    modalidadeId?: string;
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const res = await api.get('/procedures/especialidades/', { params });
    return res.data;
  },

  async getEspecialidade(id: string) {
    const res = await api.get(`/procedures/especialidades/${id}`);
    return res.data;
  },

  async createEspecialidade(payload: CreateEspecialidadePayload) {
    const res = await api.post('/procedures/especialidades/', payload);
    return res.data;
  },

  async updateEspecialidade(id: string, payload: Partial<Omit<CreateEspecialidadePayload, 'modalidadeId'>> & { isActive?: boolean }) {
    const res = await api.put(`/procedures/especialidades/${id}`, payload);
    return res.data;
  },

  async deleteEspecialidade(id: string) {
    const res = await api.delete(`/procedures/especialidades/${id}`);
    return res.data;
  },

  async getEspecialidadeAuditLog(id: string) {
    const res = await api.get(`/procedures/especialidades/${id}/audit`);
    return res.data;
  },
};
