import api from './api';

export type HumanConversationStatus = 'QUEUED' | 'ASSIGNED' | 'CLOSED';
export type HumanConversationConfigScope = 'COMPANY' | 'BRANCH';

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
  humanProtocolNumber?: string | null;
  humanProtocolStartedAt?: string | null;
  humanProtocolClosedAt?: string | null;
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
  providerMessageId?: string | null;
  metadata?: Record<string, unknown> | null;
  message: string;
  createdAt: string;
}

export interface HumanConversationProtocolSummary {
  number: string;
  startedAt?: string | null;
  closedAt?: string | null;
}

export interface HumanConversationPatientInfo {
  id: string;
  name?: string | null;
  cpf?: string | null;
  cellphone?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  healthInsuranceName?: string | null;
  healthInsuranceNumber?: string | null;
  email?: string | null;
  address?: string | null;
  observations?: string | null;
}

export interface HumanConversationPatientAppointment {
  id: string;
  date?: string | null;
  time?: string | null;
  type?: string | null;
  status?: string | null;
  doctorName?: string | null;
  specialty?: string | null;
  convenio?: string | null;
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

export interface HumanConversationSettings {
  id: string;
  branchId: string;
  idleTimeoutMinutes: number;
  closeWarningMinutes: number;
}

export interface HumanConversationMedia {
  id: string;
  conversationId: string;
  branchId: string;
  phone: string;
  appointmentId?: string | null;
  mediaType: string;
  mediaUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  mediaId?: string | null;
  providerMessageId?: string | null;
  createdAt: string;
}

export interface HumanConversationTemplate {
  id: string;
  companyId: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
  name: string;
  text: string;
  shortcut: string | null;
  createdAt: string;
  updatedAt: string;
}

const whatsappConversationService = {
  async listFlows(): Promise<HumanConversationFlow[]> {
    const res = await api.get('/care/whatsapp/conversations/flows');
    return res.data?.items || [];
  },

  async listOperators(scope: HumanConversationConfigScope = 'COMPANY'): Promise<{
    settings: HumanConversationSettings;
    items: HumanConversationOperatorConfig[];
  }> {
    try {
      const res = await api.get('/care/whatsapp/conversations/operators', {
        params: { scope },
      });
      return {
        settings: res.data?.settings,
        items: res.data?.items || [],
      };
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      const canFallbackToLegacy = scope === 'COMPANY' && (status === 400 || status === 404 || status === 405);

      if (!canFallbackToLegacy) throw error;

      const fallbackRes = await api.get('/care/whatsapp/conversations/operators');
      return {
        settings: fallbackRes.data?.settings,
        items: fallbackRes.data?.items || [],
      };
    }
  },

  async listTemplates(): Promise<HumanConversationTemplate[]> {
    const res = await api.get('/care/whatsapp/conversations/templates');
    return res.data?.items || [];
  },

  async createTemplate(payload: { name: string; text: string }): Promise<HumanConversationTemplate> {
    const res = await api.post('/care/whatsapp/conversations/templates', payload);
    return res.data;
  },

  async updateTemplate(id: string, payload: { name?: string; text?: string }): Promise<HumanConversationTemplate> {
    const res = await api.put(`/care/whatsapp/conversations/templates/${id}`, payload);
    return res.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/care/whatsapp/conversations/templates/${id}`);
  },

  async saveTemplateShortcut(templateId: string, shortcut: string | null): Promise<{ shortcut: string | null }> {
    const res = await api.put(`/care/whatsapp/conversations/templates/${templateId}/shortcut`, { shortcut });
    return res.data;
  },

  async saveSettings(payload: {
    idleTimeoutMinutes: number;
    closeWarningMinutes: number;
  }, options?: {
    scope?: HumanConversationConfigScope;
    inheritFromCompany?: boolean;
  }) {
    const scope = options?.scope || 'COMPANY';
    const body = {
      ...payload,
      inheritFromCompany: Boolean(options?.inheritFromCompany),
    };

    try {
      const res = await api.put('/care/whatsapp/conversations/settings', body, {
        params: { scope },
      });
      return res.data;
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      const canFallbackToLegacy = scope === 'COMPANY' && (status === 400 || status === 404 || status === 405);

      if (!canFallbackToLegacy) throw error;

      const fallbackRes = await api.put('/care/whatsapp/conversations/settings', payload);
      return fallbackRes.data;
    }
  },

  async saveOperatorConfig(userId: string, payload: {
    isActive: boolean;
    maxActiveConversations: number;
    flowKeys: string[];
  }, options?: {
    scope?: HumanConversationConfigScope;
    inheritFromCompany?: boolean;
  }) {
    const scope = options?.scope || 'COMPANY';
    const body = {
      ...payload,
      inheritFromCompany: Boolean(options?.inheritFromCompany),
    };

    try {
      const res = await api.put(`/care/whatsapp/conversations/operators/${userId}`, body, {
        params: { scope },
      });
      return res.data;
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      const canFallbackToLegacy = scope === 'COMPANY' && (status === 400 || status === 404 || status === 405);

      if (!canFallbackToLegacy) throw error;

      const fallbackRes = await api.put(`/care/whatsapp/conversations/operators/${userId}`, payload);
      return fallbackRes.data;
    }
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

  async getMessages(conversationId: string, params?: { protocolNumber?: string }): Promise<{
    conversation: HumanConversationItem;
    patient?: HumanConversationPatientInfo | null;
    appointments?: {
      next?: HumanConversationPatientAppointment | null;
      recent: HumanConversationPatientAppointment[];
    };
    items: HumanConversationMessage[];
    media?: HumanConversationMedia[];
  }> {
    const res = await api.get(`/care/whatsapp/conversations/${conversationId}/messages`, { params });
    return res.data;
  },

  async getProtocolHistory(conversationId: string, protocolNumber: string): Promise<{
    conversation?: HumanConversationItem;
    protocol?: HumanConversationProtocolSummary | null;
    items: HumanConversationMessage[];
  }> {
    const normalizedProtocol = String(protocolNumber || '').trim();
    if (!normalizedProtocol) {
      return { items: [] };
    }

    try {
      const res = await api.get(`/care/whatsapp/conversations/${conversationId}/protocols/${encodeURIComponent(normalizedProtocol)}`);
      return {
        conversation: res.data?.conversation,
        protocol: res.data?.protocol || null,
        items: res.data?.items || [],
      };
    } catch {
      const fallback = await this.getMessages(conversationId, { protocolNumber: normalizedProtocol });
      const metadataFiltered = (fallback.items || []).filter((message) => {
        const value = String((message.metadata as any)?.protocolNumber || '').trim();
        return value === normalizedProtocol;
      });

      return {
        conversation: fallback.conversation,
        protocol: {
          number: normalizedProtocol,
          startedAt: fallback.conversation?.humanProtocolStartedAt || null,
          closedAt: fallback.conversation?.humanProtocolClosedAt || null,
        },
        items: metadataFiltered,
      };
    }
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
