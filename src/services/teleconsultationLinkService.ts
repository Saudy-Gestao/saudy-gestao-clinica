import axios from 'axios';
import api from './api';
import { getApiBaseUrl } from './getApiBaseUrl';

const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
});

export interface TeleconsultationEligibility {
  preAttendanceId: string;
  appointmentId: string;
  isTeleconsultation: boolean;
  isAuthorized: boolean;
  isPreAttendanceComplete: boolean;
  attachmentsCount: number;
  canSendLink: boolean;
  reasons: string[];
  patientName?: string | null;
  patientPhone?: string | null;
  doctorName?: string | null;
  specialty?: string | null;
  date?: string | null;
  time?: string | null;
}

export interface TeleconsultationSendLinkResponse {
  message: string;
  links: {
    patientUrl: string;
    doctorUrl: string;
    expiresAt: string;
  };
  whatsappMock: {
    provider: 'mock';
    to?: string | null;
    message: string;
  };
}

export interface TeleconsultationPublicTokenMeta {
  valid: boolean;
  role: 'PATIENT' | 'DOCTOR' | string;
  appointment: {
    id: string;
    patientName?: string | null;
    doctorName?: string | null;
    specialty?: string | null;
    date?: string | null;
    time?: string | null;
  };
  window?: {
    allowJoinFromMinutesBefore?: number;
  };
  tokenMeta?: {
    expiresAt?: string | null;
  };
}

export interface TeleconsultationSignalEvent {
  id: number;
  type: string;
  payload?: any;
  fromRole: 'PATIENT' | 'DOCTOR' | string;
  toRole: 'PATIENT' | 'DOCTOR' | 'ALL' | string;
  createdAt: string;
}

const teleconsultationLinkService = {
  async getPreAttendanceEligibility(preAttendanceId: string) {
    const response = await api.get(`/care/teleconsultation-links/pre-attendance/${preAttendanceId}/eligibility`);
    return response.data as TeleconsultationEligibility;
  },

  async sendWhatsAppLink(preAttendanceId: string, payload?: { notes?: string }) {
    const response = await api.post(`/care/teleconsultation-links/pre-attendance/${preAttendanceId}/send-whatsapp-link`, payload || {});
    return response.data as TeleconsultationSendLinkResponse;
  },

  async sendWhatsAppLinkByAppointment(appointmentId: string, payload?: { notes?: string; sendPatientMessage?: boolean }) {
    const response = await api.post(`/care/teleconsultation-links/appointment/${appointmentId}/send-whatsapp-link`, payload || {});
    return response.data as TeleconsultationSendLinkResponse;
  },

  async resolvePublicToken(token: string) {
    const response = await publicApi.get('/care/teleconsultation-links/public', {
      params: { token },
    });
    return response.data as TeleconsultationPublicTokenMeta;
  },

  async sendPublicSignal(token: string, signal: { type: string; payload?: any; toRole?: 'PATIENT' | 'DOCTOR' | 'ALL' }) {
    const response = await publicApi.post('/care/teleconsultation-links/public/signal', {
      token,
      type: signal.type,
      payload: signal.payload ?? {},
      toRole: signal.toRole,
    });
    return response.data as { ok: boolean; eventId: number };
  },

  async pullPublicSignals(token: string, lastEventId = 0, limit = 40) {
    const response = await publicApi.get('/care/teleconsultation-links/public/signal', {
      params: { token, lastEventId, limit },
    });
    return response.data as { events: TeleconsultationSignalEvent[]; lastEventId: number };
  },
};

export default teleconsultationLinkService;
