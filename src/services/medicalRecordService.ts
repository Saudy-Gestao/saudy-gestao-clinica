import api from './api';

export interface MedicalRecordPayload {
  patientId: string;
  doctorId?: string;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  diagnosis?: string;
  treatment?: string;
  prescriptions?: string;
  examRequests?: string;
  notes?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordDate?: string;
}

export default {
  async list(params?: { patientId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }) {
    const url = '/accounts/medical-records/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async getById(id: string) {
    const url = `/accounts/medical-records/${id}`;
    const res = await api.get(url);
    return res.data;
  },

  async create(payload: MedicalRecordPayload) {
    const url = '/accounts/medical-records/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async update(id: string, payload: Partial<MedicalRecordPayload>) {
    const url = `/accounts/medical-records/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },
};
