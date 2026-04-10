import axios from 'axios';
import api from './api';
import { getApiBaseUrl } from './getApiBaseUrl';

const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
});

export type PreSchedulingStatus =
  | 'PENDING'
  | 'PRE_AUTHORIZED'
  | 'LINK_SENT'
  | 'WAITING_PATIENT_DOCUMENTS'
  | 'DOCUMENTS_RECEIVED'
  | 'COMPLETED'
  | 'CANCELED';

export interface PreSchedulingItem {
  id: string;
  appointmentId: string;
  patientId?: string | null;
  patientName: string;
  patientCpf?: string;
  patientPhone?: string | null;
  source?: 'COMMON' | 'BOT' | string;
  doctorName?: string | null;
  specialty?: string | null;
  convenio?: string | null;
  date?: string;
  time?: string | null;
  appointmentStatus?: string | null;
  authorizationStatus?: string;
  preSchedulingStatus: PreSchedulingStatus;
  flowId?: string | null;
  linkSentAt?: string | null;
  preAuthorizedAt?: string | null;
  guideNumber?: string | null;
  docsCount?: number;
  hasAnamnesis?: boolean;
  anamnesisAnswered?: boolean;
  anamnesisAnswersCount?: number;
  tokenAvailable?: boolean;
  isResolved?: boolean;
  isTeleconsultation?: boolean;
  teleconsultationLinkSent?: boolean;
}

export interface PublicPreSchedulingMeta {
  id: string;
  branchId?: string | null;
  patientName: string;
  appointment?: {
    specialty?: string | null;
    doctorName?: string | null;
    date?: string | null;
    time?: string | null;
  };
  status: PreSchedulingStatus;
  verified: boolean;
  verificationExpiresAt?: string | null;
  interactionCompleted?: boolean;
  documentsCount: number;
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    uploadedAt: string;
  }>;
  anamnesis?: {
    templateId: string;
    name: string;
    description?: string | null;
    answered: boolean;
    answeredAt?: string | null;
    questions: Array<{
      id: string;
      label: string;
      helpText?: string | null;
      responseType: string;
      placeholder?: string | null;
      isRequired: boolean;
      orderIndex: number;
      options: Array<{
        id: string;
        label: string;
        value: string;
        orderIndex: number;
      }>;
    }>;
    answers: Array<{
      questionId?: string | null;
      questionLabel: string;
      responseType: string;
      answerText?: string | null;
      answerValues?: string[];
      answerBoolean?: boolean | null;
      answerNumber?: number | null;
      orderIndex: number;
    }>;
  } | null;
}

const preSchedulingService = {
  async list(params?: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    includeResolved?: boolean;
    resolvedOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get('/care/pre-scheduling/', { params });
    return response.data as { total: number; items: PreSchedulingItem[] };
  },

  async preAuthorize(appointmentId: string, payload?: { guideNumber?: string; notes?: string }) {
    const response = await api.post(`/care/pre-scheduling/${appointmentId}/pre-authorize`, payload || {});
    return response.data;
  },

  async sendLink(appointmentId: string, payload?: { notes?: string }) {
    const response = await api.post(`/care/pre-scheduling/${appointmentId}/send-link`, payload || {});
    return response.data as {
      message: string;
      publicUrl: string;
      hasAnamnesis?: boolean;
      whatsappMock: {
        provider: 'mock';
        to?: string | null;
        message: string;
      };
    };
  },

  async getDocuments(appointmentId: string) {
    const response = await api.get(`/care/pre-scheduling/${appointmentId}/documents`);
    return response.data as {
      items: Array<{
        id: string;
        documentType: string;
        fileName: string;
        mimeType?: string | null;
        sizeBytes?: number | null;
        uploadedAt: string;
      }>;
      anamnesis?: {
        templateId: string;
        templateName: string;
        answered: boolean;
        answeredAt?: string | null;
        answers: Array<{
          id: string;
          questionLabel: string;
          responseType: string;
          answerText?: string | null;
          answerValues?: string[];
          answerBoolean?: boolean | null;
          answerNumber?: number | null;
          orderIndex: number;
        }>;
      } | null;
    };
  },

  async reviewDocuments(appointmentId: string, payload: { action: 'APPROVE' | 'REQUEST_RESUBMISSION' }) {
    const response = await api.post(`/care/pre-scheduling/${appointmentId}/review-documents`, payload);
    return response.data as {
      message: string;
      status: PreSchedulingStatus;
    };
  },

  async manualFinalize(appointmentId: string) {
    const response = await api.post(`/care/pre-scheduling/${appointmentId}/manual-finalize`);
    return response.data as {
      message: string;
      status: PreSchedulingStatus;
      completedAt?: string | null;
    };
  },

  async viewDocument(appointmentId: string, documentId: string) {
    const response = await api.get(`/care/pre-scheduling/${appointmentId}/documents/${documentId}/view`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  async getPublicMeta(token: string) {
    const response = await publicApi.get(`/care/pre-scheduling/public/${token}`);
    return response.data as PublicPreSchedulingMeta;
  },

  async verifyPublic(token: string, payload: {
    recognizedCpf: string;
    recognizedName?: string;
    recognizedTrust?: number;
    facialImageBase64?: string;
  }) {
    const response = await publicApi.post(`/care/pre-scheduling/public/${token}/verify`, payload);
    return response.data as {
      verified: boolean;
      trust?: number | null;
      patientName?: string | null;
      verificationExpiresAt?: string | null;
    };
  },

  async uploadPublicDocument(token: string, payload: {
    cpf?: string;
    documentType: string;
    fileName: string;
    mimeType?: string;
    fileBase64: string;
  }) {
    const response = await publicApi.post(`/care/pre-scheduling/public/${token}/upload`, payload);
    return response.data;
  },

  async submitPublicAnamnesis(token: string, payload: {
    answers: Array<{
      questionId: string;
      answerText?: string | null;
      answerValues?: string[];
      answerBoolean?: boolean | null;
      answerNumber?: number | null;
    }>;
  }) {
    const response = await publicApi.post(`/care/pre-scheduling/public/${token}/anamnesis`, payload);
    return response.data as { message: string };
  },

  async finalizePublicDocuments(token: string) {
    const response = await publicApi.post(`/care/pre-scheduling/public/${token}/finalize`);
    return response.data as {
      message: string;
      status: PreSchedulingStatus;
      patientSubmittedAt?: string | null;
    };
  },
};

export default preSchedulingService;
