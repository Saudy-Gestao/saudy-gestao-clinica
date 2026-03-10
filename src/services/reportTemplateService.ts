import api from './api';

export interface ReportTemplatePayload {
  name: string;
  examType: string;
  group?: string;
  content: string;
}

export default {
  async list(params?: { search?: string; examType?: string; limit?: number; offset?: number }) {
    const res = await api.get('/care/report-templates/', { params });
    return res.data;
  },

  async create(payload: ReportTemplatePayload) {
    const res = await api.post('/care/report-templates/', payload);
    return res.data;
  },

  async update(id: string, payload: Partial<ReportTemplatePayload>) {
    const res = await api.put(`/care/report-templates/${id}`, payload);
    return res.data;
  },

  async remove(id: string) {
    const res = await api.delete(`/care/report-templates/${id}`);
    return res.data;
  },
};
