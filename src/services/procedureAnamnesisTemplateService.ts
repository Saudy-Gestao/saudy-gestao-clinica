import api from './api';

export type AnamnesisQuestionOptionPayload = {
  label: string;
  value: string;
  orderIndex?: number;
};

export type AnamnesisQuestionPayload = {
  label: string;
  helpText?: string | null;
  responseType: string;
  placeholder?: string | null;
  isRequired?: boolean;
  orderIndex?: number;
  options?: AnamnesisQuestionOptionPayload[];
};

export type ProcedureAnamnesisTemplatePayload = {
  procedureId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  questions: AnamnesisQuestionPayload[];
};

export type ProcedureAnamnesisTemplateItem = {
  id: string;
  procedureId: string;
  branchId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  procedure?: {
    id: string;
    name: string;
  } | null;
  questions: Array<{
    id: string;
    label: string;
    helpText?: string | null;
    responseType: string;
    placeholder?: string | null;
    isRequired: boolean;
    orderIndex: number;
    options: Array<{
      id: string;
      label: string;
      value: string;
      orderIndex: number;
    }>;
  }>;
};

export default {
  async list(params?: {
    search?: string;
    procedureId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const res = await api.get('/procedures/anamnesis-templates', { params });
    return res.data as { total: number; items: ProcedureAnamnesisTemplateItem[] };
  },

  async getById(id: string) {
    const res = await api.get(`/procedures/anamnesis-templates/${id}`);
    return res.data as ProcedureAnamnesisTemplateItem;
  },

  async create(payload: ProcedureAnamnesisTemplatePayload) {
    const res = await api.post('/procedures/anamnesis-templates', payload);
    return res.data as ProcedureAnamnesisTemplateItem;
  },

  async update(id: string, payload: Partial<ProcedureAnamnesisTemplatePayload>) {
    const res = await api.put(`/procedures/anamnesis-templates/${id}`, payload);
    return res.data as ProcedureAnamnesisTemplateItem;
  },

  async deactivate(id: string) {
    const res = await api.delete(`/procedures/anamnesis-templates/${id}`);
    return res.data as { success: boolean };
  },
};
