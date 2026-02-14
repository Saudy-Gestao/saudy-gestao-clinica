import api from './api';

export interface PreAttendancePayload {
  patientId?: string;
  fullName: string;
  cpf: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  convenio?: string;
  convenioType?: string;
  convenioValidUntil?: string;
  convenioNumber?: string;
  convenioStatus?: string;
  convenioNotes?: string;
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
  glucose?: string;
  bmi?: string;
  mainComplaint?: string;
  diseaseHistory?: string;
  allergies?: string;
  medications?: string;
  antecedentes?: string;
  triageNotes?: string;
  notes?: string;
  totem?: number;
  status?: string;
  queue?: string;
  queueType?: string;
  agenda?: string;
}

export default {
  async list(params?: { search?: string; status?: string; queueType?: string; limit?: number; offset?: number }) {
    const url = '/care/pre-attendances/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async create(payload: PreAttendancePayload) {
    const url = '/care/pre-attendances/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async update(id: string, payload: Partial<PreAttendancePayload>) {
    const url = `/care/pre-attendances/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async remove(id: string) {
    const url = `/care/pre-attendances/${id}`;
    const res = await api.delete(url);
    return res.data;
  },
};
