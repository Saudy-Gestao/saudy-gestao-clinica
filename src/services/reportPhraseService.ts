import api from './api';

export interface ReportPhrasePayload {
  examType: string;
  label: string;
  shortcut?: string;
  text: string;
}

export default {
  async list(params?: { search?: string; examType?: string; limit?: number; offset?: number }) {
    const res = await api.get('/care/report-phrases/', { params });
    return res.data;
  },

  async create(payload: ReportPhrasePayload) {
    const res = await api.post('/care/report-phrases/', payload);
    return res.data;
  },

  async update(id: string, payload: Partial<ReportPhrasePayload>) {
    const res = await api.put(`/care/report-phrases/${id}`, payload);
    return res.data;
  },

  async remove(id: string) {
    const res = await api.delete(`/care/report-phrases/${id}`);
    return res.data;
  },
};
