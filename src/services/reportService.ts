import api from './api';

export interface ReportPayload {
  patientName?: string;
  cpf?: string;
  birthDate?: string;
  requestingDoctor?: string;
  reportingDoctor?: string;
  reviewingDoctor?: string;
  reportingDoctorId?: string;
  reviewingDoctorId?: string;
  description?: string;
  conclusion?: string;
  notes?: string;
  status?: string;
  exam?: string;
  scheduledFor?: string;
  responsibleDoctor?: string;
  observation?: string;
  worklistItemId?: string;
  appointmentId?: string;
  issuerSignedAt?: string | null;
  reviewerSignedAt?: string | null;
  signIssuer?: boolean;
  signReviewer?: boolean;
}

export interface TemporaryPriorStudyUploadPayload {
  files?: Array<{ fileName?: string; base64: string }>;
  filesBase64?: string[];
  zipBase64?: string;
  zipFileName?: string;
  description?: string;
  ttlHours?: number;
}

export default {
  async list(params?: { search?: string; status?: string; exam?: string; worklistItemId?: string; appointmentId?: string; mine?: boolean; limit?: number; offset?: number }) {
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

  async uploadTemporaryPriorStudy(reportId: string, payload: TemporaryPriorStudyUploadPayload) {
    const res = await api.post(`/care/reports/${reportId}/temporary-prior-studies`, payload);
    return res.data;
  },

  async listTemporaryPriorStudies(reportId: string) {
    const res = await api.get(`/care/reports/${reportId}/temporary-prior-studies`);
    return res.data;
  },

  async deleteTemporaryPriorStudy(reportId: string, temporaryStudyId: string) {
    const res = await api.delete(`/care/reports/${reportId}/temporary-prior-studies/${temporaryStudyId}`);
    return res.data;
  },
};
