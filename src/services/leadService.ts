import api from './api';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST';

export interface LeadItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  source?: string | null;
  companyName?: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface LeadsListResponse {
  items: LeadItem[];
  total: number;
}

export interface CreateLeadPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string;
  companyName?: string;
}

const normalizeLeadResponse = (data: unknown): LeadsListResponse => {
  if (Array.isArray(data)) {
    return {
      items: data as LeadItem[],
      total: data.length,
    };
  }

  const typed = (data || {}) as { items?: LeadItem[]; data?: LeadItem[]; total?: number };
  const items = Array.isArray(typed.items)
    ? typed.items
    : Array.isArray(typed.data)
      ? typed.data
      : [];

  return {
    items,
    total: Number.isFinite(Number(typed.total)) ? Number(typed.total) : items.length,
  };
};

export default {
  async list(params?: { status?: LeadStatus | 'ALL'; search?: string }) {
    const res = await api.get('/admin/leads', { params });
    return normalizeLeadResponse(res.data);
  },

  async create(payload: CreateLeadPayload) {
    const res = await api.post('/admin/leads', payload);
    return res.data as LeadItem;
  },

  async updateStatus(id: string, status: LeadStatus) {
    const res = await api.patch(`/admin/leads/${id}`, { status });
    return res.data as LeadItem;
  },
};
