import api from './api';

export type TissBatchStatus = 'DRAFT' | 'GENERATED' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CLOSED';

export interface TissBatchItem {
  id: string;
  batchId: string;
  invoiceId: string;
  guideNumber: string;
  status: string;
  returnStatus?: 'ACCEPTED' | 'PARTIAL' | 'REJECTED' | null;
  returnCode?: string | null;
  returnMessage?: string | null;
  glosaValue?: number | null;
  isRepresented?: boolean;
  representedAt?: string | null;
  invoice?: {
    id: string;
    number: string;
    patientName?: string | null;
    total?: number;
  };
}

export interface TissBatch {
  id: string;
  batchNumber: string;
  competenceMonth: string;
  convention: string;
  status: TissBatchStatus;
  protocolNumber?: string | null;
  generatedXmlAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  invoicesCount?: number;
  totalValue?: number;
  items?: TissBatchItem[];
}

export default {
  async list(params?: { competenceMonth?: string; convention?: string; status?: string; search?: string }) {
    const res = await api.get('/admin/tiss-batches', { params });
    return res.data as { items: TissBatch[]; total: number; limit: number; offset: number };
  },

  async create(payload: { competenceMonth: string; convention: string; invoiceIds: string[] }) {
    const res = await api.post('/admin/tiss-batches', payload);
    return res.data as TissBatch;
  },

  async updateStatus(id: string, payload: { status: TissBatchStatus; protocolNumber?: string }) {
    const res = await api.patch(`/admin/tiss-batches/${id}/status`, payload);
    return res.data as TissBatch;
  },

  async registerProtocol(id: string, payload: { protocolNumber: string }) {
    const res = await api.patch(`/admin/tiss-batches/${id}/protocol`, payload);
    return res.data as TissBatch;
  },

  async registerReturn(id: string, payload: {
    items: Array<{
      itemId?: string;
      guideNumber?: string;
      status: 'ACCEPTED' | 'PARTIAL' | 'REJECTED';
      returnCode?: string;
      returnMessage?: string;
      glosaValue?: number;
    }>;
  }) {
    const res = await api.post(`/admin/tiss-batches/${id}/return`, payload);
    return res.data as TissBatch;
  },

  async represent(id: string, payload?: { itemIds?: string[]; competenceMonth?: string }) {
    const res = await api.post(`/admin/tiss-batches/${id}/represent`, payload || {});
    return res.data as TissBatch;
  },

  async downloadXml(id: string) {
    const res = await api.get(`/admin/tiss-batches/${id}/xml`, { responseType: 'blob' });
    return res.data as Blob;
  },
};
