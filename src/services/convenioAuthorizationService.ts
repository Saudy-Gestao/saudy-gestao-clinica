import api from './api';

export type ConvenioAuthorizationStatus = 'PENDING' | 'AUTHORIZED' | 'DENIED';
export type ConvenioAuthorizationSourceType = 'APPOINTMENT' | 'TEA';

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
};
