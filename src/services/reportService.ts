import api from './api';

export interface ReportPayload {
  patientName: string;
  cpf?: string;
  birthDate?: string;
  requestingDoctor?: string;
  reportingDoctor?: string;
  reviewingDoctor?: string;
  description?: string;
  conclusion?: string;
  notes?: string;
  status?: string;
  exam?: string;
  scheduledFor?: string;
  responsibleDoctor?: string;
  observation?: string;
}

export default {
  async list(params?: { search?: string; status?: string; exam?: string; limit?: number; offset?: number }) {
    const url = '/care/reports/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async create(payload: ReportPayload) {
    const url = '/care/reports/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async update(id: string, payload: Partial<ReportPayload>) {
    const url = `/care/reports/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async remove(id: string) {
    const url = `/care/reports/${id}`;
    const res = await api.delete(url);
    return res.data;
  },

  async spellCheck(html: string): Promise<{ correctedHtml: string }> {
    const res = await api.post('/care/spell-check', { html });
    return res.data;
  },
};
