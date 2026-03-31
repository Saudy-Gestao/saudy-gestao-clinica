import api from './api';

export type TicketType = 'BUG' | 'ERROR' | 'IMPROVEMENT';
export type TicketStatus = 'OPEN' | 'TRIAGE' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketSort = 'NEWEST' | 'OLDEST' | 'PRIORITY_HIGH' | 'PRIORITY_LOW';

export interface TicketItem {
  id: string;
  flow: string;
  module: string;
  type: TicketType;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt?: string;
  createdByName?: string | null;
  createdByEmail?: string | null;
  branchName?: string | null;
  hasUnreadUserMessage?: boolean;
  hasUnreadAdminMessage?: boolean;
  resolutionConfirmationDeadlineAt?: string | null;
  resolutionConfirmedAt?: string | null;
}

export type TicketMessageAuthorRole = 'USER' | 'ADMIN' | 'SYSTEM';

export interface TicketMessageItem {
  id: string;
  ticketId: string;
  authorRole: TicketMessageAuthorRole;
  authorUserId?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  message: string;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
  attachmentObjectName?: string | null;
  createdAt: string;
}

export interface TicketsListResponse {
  items: TicketItem[];
  total: number;
  unreadCount?: number;
}

export interface CreateTicketPayload {
  flow: string;
  module: string;
  type: TicketType;
  description: string;
}

const normalizeTicketsResponse = (data: unknown): TicketsListResponse => {
  if (Array.isArray(data)) {
    return {
      items: data as TicketItem[],
      total: data.length,
    };
  }

  const typed = (data || {}) as { items?: TicketItem[]; data?: TicketItem[]; total?: number; unreadCount?: number };
  const items = Array.isArray(typed.items)
    ? typed.items
    : Array.isArray(typed.data)
      ? typed.data
      : [];

  return {
    items,
    total: Number.isFinite(Number(typed.total)) ? Number(typed.total) : items.length,
    unreadCount: Number.isFinite(Number(typed.unreadCount)) ? Number(typed.unreadCount) : undefined,
  };
};

export default {
  async create(payload: CreateTicketPayload) {
    const res = await api.post('/care/tickets', payload);
    return res.data as TicketItem;
  },

  async list(params?: {
    status?: TicketStatus | 'ALL';
    type?: TicketType | 'ALL';
    priority?: TicketPriority | 'ALL';
    sort?: TicketSort;
    search?: string;
  }) {
    const res = await api.get('/admin/tickets', { params });
    return normalizeTicketsResponse(res.data);
  },

  async listMine(params?: { status?: TicketStatus | 'ALL'; type?: TicketType | 'ALL'; search?: string }) {
    const res = await api.get('/care/tickets/mine', { params });
    return normalizeTicketsResponse(res.data);
  },

  async updateStatus(id: string, status: TicketStatus) {
    const res = await api.patch(`/admin/tickets/${id}/status`, { status });
    return res.data as TicketItem;
  },

  async updatePriority(id: string, priority: TicketPriority) {
    const res = await api.patch(`/admin/tickets/${id}/priority`, { priority });
    return res.data as TicketItem;
  },

  async getAdminById(id: string) {
    const res = await api.get(`/admin/tickets/${id}`);
    return res.data as TicketItem;
  },

  async listAdminMessages(ticketId: string) {
    const res = await api.get(`/admin/tickets/${ticketId}/messages`);
    const typed = (res.data || {}) as { items?: TicketMessageItem[] };
    return Array.isArray(typed.items) ? typed.items : [];
  },

  async sendAdminMessage(ticketId: string, payload: {
    message: string;
    attachment?: { name: string; mimeType: string; sizeBytes: number; base64: string } | null;
  }) {
    const res = await api.post(`/admin/tickets/${ticketId}/messages`, payload);
    return res.data as TicketMessageItem;
  },

  async listMyMessages(ticketId: string) {
    const res = await api.get(`/care/tickets/${ticketId}/messages`);
    const typed = (res.data || {}) as { items?: TicketMessageItem[] };
    return Array.isArray(typed.items) ? typed.items : [];
  },

  async getMineById(id: string) {
    const res = await api.get(`/care/tickets/${id}`);
    return res.data as TicketItem;
  },

  async sendMyMessage(ticketId: string, payload: {
    message: string;
    attachment?: { name: string; mimeType: string; sizeBytes: number; base64: string } | null;
  }) {
    const res = await api.post(`/care/tickets/${ticketId}/messages`, payload);
    return res.data as TicketMessageItem;
  },

  async confirmMyTicketClose(ticketId: string) {
    const res = await api.post(`/care/tickets/${ticketId}/confirm-close`);
    return res.data as TicketItem;
  },

  async viewAdminMessageAttachment(messageId: string) {
    const res = await api.get(`/admin/tickets/messages/${messageId}/attachment/view`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  async viewMyMessageAttachment(messageId: string) {
    const res = await api.get(`/care/tickets/messages/${messageId}/attachment/view`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};
