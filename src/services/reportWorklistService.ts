import api from './api';

export interface ReportWorklistPayload {
  appointmentId?: string;
  externalStudyId?: string;
  accessionNumber?: string;
  patientName?: string;
  patientCpf?: string;
  patientBirthDate?: string;
  examType?: string;
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
  dicomPath?: string;
  dicomUrl?: string;
  dicomReceivedAt?: string;
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

  /**
   * Download raw DICOM blob for an item (worklist id or study UID)
   */
  async fetchDicom(key: string) {
    const res = await api.get(`/dicom/${key}/file`, { responseType: 'arraybuffer' });
    return res.data as ArrayBuffer;
  },

  /**
   * Fetch a DICOM using a full url (returned as dicomUrl field)
   */
  async fetchDicomUrl(url: string) {
    const res = await api.get(url, { responseType: 'arraybuffer' });
    return res.data as ArrayBuffer;
  },

  /**
   * Return all DICOM buffers attached to a worklist item (or study UID)
   */
  async fetchDicomSeries(key: string) {
    const res = await api.get(`/dicom/${key}/files`);
    const files: Array<{ id: string; url: string }> = res.data.files || [];
    const buffers: ArrayBuffer[] = [];
    for (const f of files) {
      const r = await api.get(f.url, { responseType: 'arraybuffer' });
      buffers.push(r.data as ArrayBuffer);
    }
    return buffers;
  },
};
