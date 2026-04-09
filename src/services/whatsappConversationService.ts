import api from './api';

export type HumanConversationStatus = 'QUEUED' | 'ASSIGNED' | 'CLOSED';

export interface HumanConversationFlow {
  key: string;
  label: string;
}

export interface HumanConversationItem {
  id: string;
  branchId: string;
  phone: string;
  patientId?: string | null;
  patientName?: string | null;
  humanStatus?: HumanConversationStatus | null;
  humanFlowKey?: string | null;
  humanFlowLabel?: string | null;
  humanAssignedUserId?: string | null;
  humanAssignedUserName?: string | null;
  humanAssignedAt?: string | null;
  humanClosedAt?: string | null;
  humanClosedByUserName?: string | null;
  lastInboundMessage?: string | null;
  lastOutboundMessage?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface HumanConversationMessage {
  id: string;
  conversationId: string;
  branchId: string;
  phone: string;
  flowKey?: string | null;
  authorType: 'PATIENT' | 'BOT' | 'OPERATOR' | 'SYSTEM';
  authorUserId?: string | null;
  authorName?: string | null;
  message: string;
  createdAt: string;
}

export interface HumanConversationOperatorConfig {
  userId: string;
  userName: string;
  userEmail: string;
  branchName?: string | null;
  isActive: boolean;
  maxActiveConversations: number;
  flowKeys: string[];
  activeConversationCount: number;
}

const whatsappConversationService = {
  async listFlows(): Promise<HumanConversationFlow[]> {
    const res = await api.get('/care/whatsapp/conversations/flows');
    return res.data?.items || [];
  },

  async listOperators(): Promise<HumanConversationOperatorConfig[]> {
    const res = await api.get('/care/whatsapp/conversations/operators');
    return res.data?.items || [];
  },

  async saveOperatorConfig(userId: string, payload: {
    isActive: boolean;
    maxActiveConversations: number;
    flowKeys: string[];
  }) {
    const res = await api.put(`/care/whatsapp/conversations/operators/${userId}`, payload);
    return res.data;
  },

  async listConversations(params?: {
    status?: HumanConversationStatus | 'ALL';
    search?: string;
    flowKey?: string;
    mineOnly?: boolean;
  }): Promise<HumanConversationItem[]> {
    const res = await api.get('/care/whatsapp/conversations', { params });
    return res.data?.items || [];
  },

  async getMessages(conversationId: string): Promise<{
    conversation: HumanConversationItem;
    items: HumanConversationMessage[];
  }> {
    const res = await api.get(`/care/whatsapp/conversations/${conversationId}/messages`);
    return res.data;
  },

  async claimConversation(conversationId: string) {
    const res = await api.post(`/care/whatsapp/conversations/${conversationId}/claim`, {});
    return res.data;
  },

  async sendMessage(conversationId: string, message: string) {
    const res = await api.post(`/care/whatsapp/conversations/${conversationId}/messages`, { message });
    return res.data;
  },

  async closeConversation(conversationId: string, message?: string) {
    const res = await api.post(`/care/whatsapp/conversations/${conversationId}/close`, { message });
    return res.data;
  },
};

export default whatsappConversationService;
