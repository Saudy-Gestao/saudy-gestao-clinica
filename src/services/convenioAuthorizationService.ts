import api from './api';

export type ConvenioAuthorizationStatus = 'PENDING' | 'AUTHORIZED' | 'DENIED';
export type ConvenioAuthorizationSourceType = 'APPOINTMENT' | 'TEA';

export type ConvenioAuthorizationAttachment = {
  id: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: string;
};

export default {
  async list(params?: {
    search?: string;
    statuses?: ConvenioAuthorizationStatus[];
    sourceTypes?: ConvenioAuthorizationSourceType[];
    limit?: number;
    offset?: number;
  }) {
    const query = {
      search: params?.search,
      statuses: (params?.statuses || []).join(',') || undefined,
      sourceTypes: (params?.sourceTypes || []).join(',') || undefined,
      limit: params?.limit,
      offset: params?.offset,
    };
    const res = await api.get('/care/convenio-authorizations', { params: query });
    return res.data;
  },

  async updateStatus(
    sourceType: ConvenioAuthorizationSourceType,
    id: string,
    payload: { status: ConvenioAuthorizationStatus; notes?: string },
  ) {
    const res = await api.patch(`/care/convenio-authorizations/${sourceType}/${id}`, payload);
    return res.data;
  },

  async uploadAttachment(
    sourceType: ConvenioAuthorizationSourceType,
    id: string,
    payload: { fileName: string; fileBase64: string; mimeType?: string },
  ) {
    const res = await api.post(`/care/convenio-authorizations/${sourceType}/${id}/attachments`, payload);
    return res.data;
  },

  async listAttachments(sourceType: ConvenioAuthorizationSourceType, id: string) {
    const res = await api.get(`/care/convenio-authorizations/${sourceType}/${id}/attachments`);
    return res.data as { total: number; items: ConvenioAuthorizationAttachment[] };
  },

  async viewAttachment(attachmentId: string) {
    const res = await api.get(`/care/convenio-authorizations/attachments/${attachmentId}/view`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};
