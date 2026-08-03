import api from './api';

export interface ReportAddendumPayload {
  worklistItemId?: string;
  reportId?: string;
  content?: string;
  status?: string;
  issuerSignedAt?: string | Date | null;
  reviewerSignedAt?: string | Date | null;
  savedAt?: string | null;
  finalizedAt?: string | Date | null;
}

export default {
  async list(params: { worklistItemId?: string; reportId?: string; status?: string; limit?: number; offset?: number }) {
    const res = await api.get('/care/report-addendums/', { params });
    return res.data;
  },

  async create(payload: ReportAddendumPayload) {
    const res = await api.post('/care/report-addendums/', payload);
    return res.data;
  },

  async update(id: string, payload: Partial<ReportAddendumPayload>) {
    const res = await api.put(`/care/report-addendums/${id}`, payload);
    return res.data;
  },

  async remove(id: string) {
    const res = await api.delete(`/care/report-addendums/${id}`);
    return res.data;
  },
};
