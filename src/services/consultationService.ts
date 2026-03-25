import api from './api';

export interface ConsultationPayload {
  patientName: string;
  appointmentId?: string;
  doctorId?: string;
  doctorName?: string;
  convenio?: string;
  convenioStatus?: string;
  scheduledFor?: string;
  queueType?: string;
  agenda?: string;
  totem?: string;
  queue?: string;
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
  glucose?: string;
  bmi?: string;
  anamnese?: string;
  mainComplaint?: string;
  diseaseHistory?: string;
  allergies?: string;
  medications?: string;
  antecedentes?: string;
  pregnant?: string;
  triageNotes?: string;
}

export interface ConsultationNursingAnswerPayload {
  questionId?: string | null;
  questionLabel: string;
  responseType: string;
  answerText?: string | null;
  answerValues?: string[];
  answerBoolean?: boolean | null;
  answerNumber?: number | null;
  orderIndex?: number;
}

export interface ConsultationNursingPayload {
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
  glucose?: string;
  pregnant?: string;
  triageNotes?: string;
  answers?: ConsultationNursingAnswerPayload[];
}

export default {
  async list(params?: { search?: string; convenioStatus?: string; queueType?: string; limit?: number; offset?: number }) {
    const url = '/care/consultations/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async create(payload: ConsultationPayload) {
    const url = '/care/consultations/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async update(id: string, payload: Partial<ConsultationPayload>) {
    const url = `/care/consultations/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async submitNursingTriage(id: string, payload: ConsultationNursingPayload) {
    const url = `/care/consultations/${id}/nursing-triage`;
    const res = await api.post(url, payload);
    return res.data;
  },

  async remove(id: string) {
    const url = `/care/consultations/${id}`;
    const res = await api.delete(url);
    return res.data;
  },
};
