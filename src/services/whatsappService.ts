import api from './api';

export interface WhatsAppConfig {
  id: string;
  branchId: string;
  accountSid: string;
  authToken?: string;
  fromNumber: string;
  appId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessageTemplate {
  id: string;
  branchId: string;
  type:
    | 'APPOINTMENT_CREATED'
    | 'APPOINTMENT_CONFIRMATION'
    | 'NO_SHOW'
    | 'CONFIRMATION_REPLY_CONFIRMED'
    | 'CONFIRMATION_REPLY_RESCHEDULE';
  name: string;
  message: string;
  hsmTemplateName?: string | null;
  hsmTemplateId?: string | null;
  hsmTemplateStatus?: string | null;
  hsmTemplateApproved: boolean;
  importedFromGupshupSync: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppNotificationConfig {
  id: string;
  branchId: string;
  sendOnAppointmentCreated: boolean;
  sendConfirmationEnabled: boolean;
  confirmationHoursBefore: number;
  sendReminderEnabled: boolean;
  reminderHoursBefore: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessageLog {
  id: string;
  branchId: string;
  appointmentId?: string;
  patientName?: string;
  patientPhone: string;
  messageType: string;
  message: string;
  status: string;
  errorMessage?: string;
  providerMessageId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableVariable {
  key: string;
  description: string;
}

export default {
  // ===== Config =====
  
  async getConfig(): Promise<WhatsAppConfig | null> {
    const res = await api.get('/care/whatsapp/config');
    return res.data;
  },

  async saveConfig(data: { accountSid: string; authToken?: string; fromNumber: string; appId?: string; isActive?: boolean }): Promise<WhatsAppConfig> {
    const res = await api.post('/care/whatsapp/config', data);
    return res.data;
  },

  async deleteConfig(): Promise<void> {
    await api.delete('/care/whatsapp/config');
  },

  // ===== Templates =====
  
  async listTemplates(): Promise<WhatsAppMessageTemplate[]> {
    const res = await api.get('/care/whatsapp/templates');
    return res.data;
  },

  async saveTemplate(data: {
    id?: string;
    type: string;
    name: string;
    message: string;
    hsmTemplateName?: string;
    isActive?: boolean;
  }): Promise<WhatsAppMessageTemplate> {
    const res = await api.post('/care/whatsapp/templates', data);
    return res.data;
  },

  async getTemplate(id: string): Promise<WhatsAppMessageTemplate> {
    const res = await api.get(`/care/whatsapp/templates/${id}`);
    return res.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/care/whatsapp/templates/${id}`);
  },

  async syncHsmStatus(): Promise<{ synced: number; created: number; updated: number; gupshupTemplates: Record<string, { status: string; id: string | null }> }> {
    const res = await api.post('/care/whatsapp/templates/sync-hsm', {});
    return res.data;
  },

  async loadDefaultTemplates(): Promise<{ success: boolean; created: number; updated: number; total: number }> {
    const res = await api.post('/care/whatsapp/templates/load-defaults', {});
    return res.data;
  },

  async pushTemplateToGupshup(id: string): Promise<{ success: boolean; gupshupResponse: any }> {
    const res = await api.post(`/care/whatsapp/templates/${id}/push-to-gupshup`, {});
    return res.data;
  },

  // ===== Notification Config =====
  
  async getNotificationConfig(): Promise<WhatsAppNotificationConfig | null> {
    const res = await api.get('/care/whatsapp/notification-config');
    return res.data;
  },

  async saveNotificationConfig(data: {
    sendOnAppointmentCreated?: boolean;
    sendConfirmationEnabled?: boolean;
    confirmationHoursBefore?: number;
    sendReminderEnabled?: boolean;
    reminderHoursBefore?: number;
  }): Promise<WhatsAppNotificationConfig> {
    const res = await api.post('/care/whatsapp/notification-config', data);
    return res.data;
  },

  // ===== Messages =====
  
  async sendMessage(data: {
    appointmentId: string;
    messageType: string;
    customMessage?: string;
  }): Promise<any> {
    const res = await api.post('/care/whatsapp/send', data);
    return res.data;
  },

  async testMessage(data: { phone: string; message: string }): Promise<any> {
    const res = await api.post('/care/whatsapp/test', data);
    return res.data;
  },

  async previewMessage(data: { appointmentId: string; template: string }): Promise<any> {
    const res = await api.post('/care/whatsapp/preview', data);
    return res.data;
  },

  // ===== Logs =====
  
  async listLogs(params?: {
    appointmentId?: string;
    status?: string;
    messageType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: WhatsAppMessageLog[]; total: number; limit: number; offset: number }> {
    const res = await api.get('/care/whatsapp/logs', { params });
    return res.data;
  },

  async getLog(id: string): Promise<WhatsAppMessageLog> {
    const res = await api.get(`/care/whatsapp/logs/${id}`);
    return res.data;
  },

  // ===== Helpers =====
  
  async getAvailableVariables(): Promise<AvailableVariable[]> {
    const res = await api.get('/care/whatsapp/available-variables');
    return res.data;
  },
};
