import api from './api';

export type AppointmentAttachment = {
  id: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string;
};

export default {
  async uploadAttachment(
    appointmentId: string,
    payload: { fileName: string; fileBase64: string; mimeType?: string },
  ) {
    const res = await api.post(`/care/appointments/${appointmentId}/attachments`, payload);
    return res.data;
  },

  async listAttachments(appointmentId: string) {
    const res = await api.get(`/care/appointments/${appointmentId}/attachments`);
    return res.data as { total: number; items: AppointmentAttachment[] };
  },

  async viewAttachment(attachmentId: string) {
    const res = await api.get(`/care/appointments/attachments/${attachmentId}/view`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};
