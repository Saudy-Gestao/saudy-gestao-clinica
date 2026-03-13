import api from './api';

export interface TeaEvolutionTemplatePayload {
  procedureId: string;
  name?: string;
  sessionGoal?: string;
  interventionSummary?: string;
  patientResponse?: string;
  familyFeedback?: string;
  homePlan?: string;
  strategiesUsed?: string[];
  isActive?: boolean;
}

export default {
  async list(params?: { search?: string; procedureId?: string; isActive?: boolean; limit?: number; offset?: number }) {
    const res = await api.get('/care/tea-evolution-templates', { params });
    return res.data;
  },

  async resolve(params: { procedureId?: string; procedureName?: string }) {
    const res = await api.get('/care/tea-evolution-templates/resolve', { params });
    return res.data;
  },

  async upsert(payload: TeaEvolutionTemplatePayload) {
    const res = await api.post('/care/tea-evolution-templates', payload);
    return res.data;
  },

  async update(id: string, payload: Partial<TeaEvolutionTemplatePayload>) {
    const res = await api.put(`/care/tea-evolution-templates/${id}`, payload);
    return res.data;
  },

  async deactivate(id: string) {
    const res = await api.delete(`/care/tea-evolution-templates/${id}`);
    return res.data;
  },
};
