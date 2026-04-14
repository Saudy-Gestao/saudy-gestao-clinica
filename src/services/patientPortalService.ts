import api from './patientPortalApi';

export type PatientPortalSummary = {
  patient: {
    id: string;
    name: string;
    cpf: string;
    birthDate: string | null;
    email: string | null;
    cellphone: string | null;
  };
  stats: {
    consultationsCount: number;
    examsCount: number;
    reportsCount: number;
  };
};

export type PatientPortalProfileItem = {
  id: string;
  branchId: string | null;
  name: string | null;
  cpf: string;
  birthDate: string | null;
  email: string | null;
  cellphone: string | null;
  relationship: string;
  profileType: 'SELF' | 'DEPENDENT';
  authorizationSource: 'OWNER' | 'GUARDIAN_CPF' | 'EXPLICIT_AUTHORIZATION';
  selected: boolean;
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
};

export type PatientPortalDeliveryRequestItem = {
  id: string;
  patientName: string;
  documentType: string;
  availableAt: string;
  description: string | null;
  responsible: string | null;
  status: string;
  deliveredTo: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientPortalAppointmentItem = {
  id: string;
  date: string | null;
  time: string | null;
  status: string | null;
  specialty: string | null;
  doctorName: string | null;
  type: string | null;
  convenio: string | null;
  observations: string | null;
  accessionNumber?: string | null;
  createdAt: string;
};

export type PatientPortalReportItem = {
  id: string;
  status: string | null;
  exam: string | null;
  requestingDoctor: string | null;
  reportingDoctor: string | null;
  reviewingDoctor: string | null;
  conclusion: string | null;
  description: string | null;
  issuerSignedAt: string | null;
  reviewerSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  appointment?: {
    id: string;
    date: string | null;
    time: string | null;
    specialty: string | null;
    doctorName: string | null;
    type: string | null;
    status: string | null;
  } | null;
  worklistItem?: {
    id: string;
    dicomUrl: string | null;
    dicomStudyUid: string | null;
    dicomReceivedAt: string | null;
  } | null;
};

export type PatientPortalUpcomingConsultationItem = {
  id: string;
  date: string | null;
  time: string | null;
  status: string | null;
  specialty: string | null;
  doctorName: string | null;
  convenio: string | null;
  preScheduling: {
    hasAnamnesis: boolean;
    hasFlow: boolean;
    flowStatus: string | null;
    documentsCount: number;
    anamnesisAnswered: boolean;
    interactionCompleted: boolean;
    publicToken: string | null;
    publicUrl: string | null;
    canPrepare: boolean;
  };
};

export type PatientPortalPreSchedulingLinkResponse = {
  appointmentId: string;
  publicToken: string;
  publicUrl: string;
  hasAnamnesis: boolean;
  flowStatus: string;
  documentsCount: number;
  anamnesisAnswered: boolean;
  interactionCompleted: boolean;
  expiresAt: string | null;
};

export type PatientPortalPhysicalDeliveryRequestResponse = {
  message: string;
  request: {
    id: string;
    status: string;
    availableAt: string;
  };
};

export type PatientPortalReportShareLinkResponse = {
  reportId: string;
  url: string;
  expiresAt: string;
  expiresInHours: number;
};

export type PatientPortalAccessLogItem = {
  id: string;
  event: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'RATE_LIMITED';
  message: string;
  ip: string;
  patientId?: string | null;
  cpf?: string | null;
  createdAt: string;
};

export type PatientPortalDocumentItem = {
  id: string;
  source: 'pre-scheduling' | 'appointment-attachment' | 'report';
  sourceId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  label: string;
  uploadedAt: string;
  appointment?: {
    id: string;
    date: string | null;
    time: string | null;
    specialty: string | null;
    status: string | null;
    type: string | null;
  } | null;
};

class PatientPortalService {
  getSummary() {
    return api.get<PatientPortalSummary>('/auth/patient-portal/me').then((response) => response.data);
  }

  listProfiles() {
    return api.get<{ principalPatientId: string; activePatientId: string; profiles: PatientPortalProfileItem[] }>(
      '/auth/patient-portal/me/profiles',
    ).then((response) => response.data);
  }

  listConsultations(params?: { limit?: number; offset?: number }) {
    return api.get<PaginatedResult<PatientPortalAppointmentItem>>('/auth/patient-portal/me/consultations', { params })
      .then((response) => response.data);
  }

  listExams(params?: { limit?: number; offset?: number }) {
    return api.get<PaginatedResult<PatientPortalAppointmentItem>>('/auth/patient-portal/me/exams', { params })
      .then((response) => response.data);
  }

  listReports(params?: { limit?: number; offset?: number }) {
    return api.get<PaginatedResult<PatientPortalReportItem>>('/auth/patient-portal/me/reports', { params })
      .then((response) => response.data);
  }

  listUpcomingConsultations(params?: { limit?: number; offset?: number }) {
    return api.get<PaginatedResult<PatientPortalUpcomingConsultationItem>>('/auth/patient-portal/me/upcoming-consultations', { params })
      .then((response) => response.data);
  }

  getPreSchedulingLink(appointmentId: string) {
    return api.post<PatientPortalPreSchedulingLinkResponse>(`/auth/patient-portal/me/upcoming-consultations/${appointmentId}/pre-scheduling-link`)
      .then((response) => response.data);
  }

  requestPhysicalReportDelivery(reportId: string, payload?: { preferredDate?: string; notes?: string }) {
    return api.post<PatientPortalPhysicalDeliveryRequestResponse>(
      `/auth/patient-portal/me/reports/${reportId}/request-physical-delivery`,
      payload || {},
    ).then((response) => response.data);
  }

  async downloadReportPdf(reportId: string) {
    const response = await api.get(`/auth/patient-portal/me/reports/${reportId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  generateReportShareLink(reportId: string, payload?: { expiresInHours?: number }) {
    return api.post<PatientPortalReportShareLinkResponse>(
      `/auth/patient-portal/me/reports/${reportId}/share-link`,
      payload || {},
    ).then((response) => response.data);
  }

  listDeliveryRequests(params?: { limit?: number; offset?: number }) {
    return api.get<PaginatedResult<PatientPortalDeliveryRequestItem>>('/auth/patient-portal/me/delivery-requests', { params })
      .then((response) => response.data);
  }

  listAccessLogs(params?: { limit?: number }) {
    return api.get<PaginatedResult<PatientPortalAccessLogItem>>('/auth/patient-portal/me/access-logs', { params })
      .then((response) => response.data);
  }

  listDocuments(params?: { limit?: number; offset?: number }) {
    return api.get<PaginatedResult<PatientPortalDocumentItem>>('/auth/patient-portal/me/documents', { params })
      .then((response) => response.data);
  }

  async downloadDocument(source: 'pre-scheduling' | 'appointment-attachment' | 'report', documentId: string) {
    const response = await api.get(`/auth/patient-portal/me/documents/${source}/${documentId}/view`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  }
}

export default new PatientPortalService();
