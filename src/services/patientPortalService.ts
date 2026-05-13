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

  listSchedulingBranches() {
    return api.get<{ branches: PatientPortalSchedulingBranch[]; defaultBranchId: string | null }>('/auth/patient-portal/scheduling/branches')
      .then((r) => r.data);
  }

  listSchedulingProcedures(branchId?: string) {
    return api.get<{ procedures: PatientPortalSchedulingProcedure[]; branch: { name: string; address: string } | null }>('/auth/patient-portal/scheduling/procedures', {
      params: branchId ? { branchId } : undefined,
    }).then((r) => r.data);
  }

  listSchedulingDoctors(procedureId?: string, branchId?: string) {
    return api.get<{ doctors: PatientPortalSchedulingDoctor[] }>('/auth/patient-portal/scheduling/doctors', {
      params: { ...(procedureId ? { procedureId } : {}), ...(branchId ? { branchId } : {}) },
    }).then((r) => r.data);
  }

  getAvailableSlots(params: { doctorName: string; procedureId?: string; branchId?: string }) {
    return api.get<{ availableSlots: PatientPortalAvailableSlotDay[]; slotDurationMinutes: number }>(
      '/auth/patient-portal/scheduling/available-slots',
      { params },
    ).then((r) => r.data);
  }

  createSelfScheduledAppointment(payload: PatientPortalSelfSchedulePayload) {
    return api.post<PatientPortalCreatedAppointment>(
      '/auth/patient-portal/scheduling/appointments',
      payload,
    ).then((r) => r.data);
  }

  getReportDicomSeries(reportId: string) {
    return api.get<PatientPortalDicomSeriesResponse>(`/auth/patient-portal/me/reports/${reportId}/dicom/series`)
      .then((r) => r.data);
  }

  getReportDicomFiles(reportId: string, seriesUid?: string) {
    return api.get<{ files: PatientPortalDicomFileItem[] }>(
      `/auth/patient-portal/me/reports/${reportId}/dicom/files`,
      { params: seriesUid ? { seriesUid } : undefined },
    ).then((r) => r.data);
  }

  async downloadDicomFile(reportId: string, fileId: string): Promise<ArrayBuffer> {
    const res = await api.get(
      `/auth/patient-portal/me/reports/${reportId}/dicom/images/${fileId}`,
      { responseType: 'arraybuffer' },
    );
    return res.data as ArrayBuffer;
  }
}

export type PatientPortalSchedulingProcedure = {
  id: string;
  name: string;
  description: string | null;
  appointmentType: string;
  durationMinutes: number | null;
  modalities: string[];
};

export type PatientPortalSchedulingDoctor = {
  id: string;
  name: string;
  specialty: string | null;
  crm: string;
};

export type PatientPortalAvailableSlotDay = {
  date: string;
  slots: string[];
};

export type PatientPortalSchedulingBranch = {
  id: string;
  tradeName: string;
  address: string;
};

export type PatientPortalSelfSchedulePayload = {
  procedureId: string;
  doctorName: string;
  date: string;
  time: string;
  modalidadeAtendimento?: 'Presencial' | 'Teleconsulta';
  observations?: string;
  branchId?: string;
};

export type PatientPortalDicomSeriesItem = {
  seriesUid: string | null;
  instancesCount: number;
};

export type PatientPortalDicomSeriesResponse = {
  reportId: string;
  worklistItemId: string;
  series: PatientPortalDicomSeriesItem[];
  totalInstances: number;
};

export type PatientPortalDicomFileItem = {
  id: string;
  seriesUid: string | null;
  instanceId: string | null;
  url: string;
};

export type PatientPortalCreatedAppointment = {
  id: string;
  date: string | null;
  time: string | null;
  specialty: string | null;
  doctorName: string | null;
  status: string | null;
  type: string | null;
  durationMinutes: number | null;
  createdAt: string;
  branchName: string | null;
  branchAddress: string | null;
};

export default new PatientPortalService();
