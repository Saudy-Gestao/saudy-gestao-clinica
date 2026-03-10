import api from './api';

export interface ReportWorklistPayload {
  externalStudyId?: string;
  accessionNumber?: string;
  patientName: string;
  patientCpf?: string;
  patientBirthDate?: string;
  examType: string;
  scheduledAt?: string;
  convenio?: string;
  requestingDoctor?: string;
  assignedTo?: string;
  priority?: string;
  status?: string;
  reportText?: string;
  issuerSignedAt?: string;
  reviewerSignedAt?: string;
  dicomStudyUid?: string;
  dicomSeriesUid?: string;
  metadata?: Record<string, unknown>;
}

export default {
  async list(params?: { search?: string; status?: string; examType?: string; limit?: number; offset?: number }) {
    const res = await api.get('/care/report-worklist/', { params });
    return res.data;
  },

  async create(payload: ReportWorklistPayload) {
    const res = await api.post('/care/report-worklist/', payload);
    return res.data;
  },

  async update(id: string, payload: Partial<ReportWorklistPayload>) {
    const res = await api.put(`/care/report-worklist/${id}`, payload);
    return res.data;
  },

  async remove(id: string) {
    const res = await api.delete(`/care/report-worklist/${id}`);
    return res.data;
  },
};
