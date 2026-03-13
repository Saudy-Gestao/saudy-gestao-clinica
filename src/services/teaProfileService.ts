import api from './api';

export interface TeaPatientPayload {
  name?: string;
  cpf?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
  cellphone?: string;
  email?: string;
  phone?: string;
  healthInsuranceName?: string;
  healthInsuranceNumber?: string;
  observations?: string;
}

export interface TeaDataPayload {
  supportLevel?: string;
  communicationProfile?: string;
  sensoryProfile?: string;
  behaviorNotes?: string;
  comorbidities?: string[];
  therapeuticGoals?: string;
  familyGuidance?: string;
  schoolNotes?: string;
  isActive?: boolean;
}

export interface TeaUpsertPayload {
  patientId?: string;
  patient?: TeaPatientPayload;
  tea?: TeaDataPayload;
}

export default {
  async list(params?: { search?: string; limit?: number; offset?: number }) {
    const res = await api.get('/care/tea-profiles/', { params });
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get(`/care/tea-profiles/${id}`);
    return res.data;
  },

  async upsert(payload: TeaUpsertPayload) {
    const res = await api.post('/care/tea-profiles/upsert', payload);
    return res.data;
  },

  async listPlans(teaProfileId: string, params?: { search?: string; isActive?: boolean }) {
    const res = await api.get(`/care/tea-profiles/${teaProfileId}/plans`, { params });
    return res.data;
  },

  async createPlan(teaProfileId: string, payload: {
    title: string;
    objective?: string;
    priority?: string;
    status?: string;
    responsibleDoctorId?: string;
    responsibleProfessional?: string;
    targetDate?: string;
    notes?: string;
    isActive?: boolean;
  }) {
    const res = await api.post(`/care/tea-profiles/${teaProfileId}/plans`, payload);
    return res.data;
  },

  async updatePlan(planId: string, payload: {
    title?: string;
    objective?: string;
    priority?: string;
    status?: string;
    responsibleDoctorId?: string;
    responsibleProfessional?: string;
    targetDate?: string;
    notes?: string;
    isActive?: boolean;
  }) {
    const res = await api.put(`/care/tea-profiles/plans/${planId}`, payload);
    return res.data;
  },

  async deactivatePlan(planId: string) {
    const res = await api.delete(`/care/tea-profiles/plans/${planId}`);
    return res.data;
  },

  async listEvolutions(teaProfileId: string) {
    const res = await api.get(`/care/tea-profiles/${teaProfileId}/evolutions`);
    return res.data;
  },

  async createEvolution(teaProfileId: string, payload: {
    therapeuticPlanId?: string;
    sessionDate?: string;
    appointmentId?: string;
    professionalDoctorId?: string;
    professional?: string;
    interventionSummary?: string;
    patientResponse?: string;
    progressScore?: number;
    sessionGoal?: string;
    strategiesUsed?: string[];
    engagementLevel?: string;
    regulationLevel?: string;
    behaviorLevel?: string;
    familyFeedback?: string;
    homePlan?: string;
    alerts?: string;
    notes?: string;
  }) {
    const res = await api.post(`/care/tea-profiles/${teaProfileId}/evolutions`, payload);
    return res.data;
  },

  async updateEvolution(teaProfileId: string, evolutionId: string, payload: {
    therapeuticPlanId?: string;
    sessionDate?: string;
    appointmentId?: string;
    professionalDoctorId?: string;
    professional?: string;
    interventionSummary?: string;
    patientResponse?: string;
    progressScore?: number;
    sessionGoal?: string;
    strategiesUsed?: string[];
    engagementLevel?: string;
    regulationLevel?: string;
    behaviorLevel?: string;
    familyFeedback?: string;
    homePlan?: string;
    alerts?: string;
    notes?: string;
    editReason: string;
  }) {
    const res = await api.put(`/care/tea-profiles/${teaProfileId}/evolutions/${evolutionId}`, payload);
    return res.data;
  },

  async getReport(teaProfileId: string, params?: { startDate?: string; endDate?: string }) {
    const res = await api.get(`/care/tea-profiles/${teaProfileId}/reports`, { params });
    return res.data;
  },

  async getPit(teaProfileId: string) {
    const res = await api.get(`/care/tea-profiles/${teaProfileId}/pit`);
    return res.data;
  },

  async upsertPit(teaProfileId: string, payload: {
    title: string;
    startDate?: string;
    reviewDate?: string;
    status?: string;
    notes?: string;
    removedTherapies?: Array<{
      id: string;
      action?: 'KEEP_FUTURE_APPOINTMENTS' | 'CANCEL_FUTURE_APPOINTMENTS';
    }>;
    therapies?: Array<{
      id?: string;
      procedureId?: string;
      therapyType: string;
      weeklyFrequency?: number;
      preferredWeekdays?: string[];
      preferredShift?: string;
      durationMinutes?: number;
      professionalDoctorId?: string;
      professional?: string;
      notes?: string;
      isActive?: boolean;
    }>;
  }) {
    const res = await api.post(`/care/tea-profiles/${teaProfileId}/pit/upsert`, payload);
    return res.data;
  },
};
