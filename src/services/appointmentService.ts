import api from './api';

export interface AppointmentPayload {
  patientName?: string;
  patientCpf?: string;
  patientId?: string;
  doctorName?: string;
  roomId?: string;
  medicalEquipmentId?: string;
  specialty?: string;
  durationMinutes?: number;
  convenio?: string;
  convenioNumber?: string;
  convenioValidUntil?: string;
  convenioStatus?: string;
  insurance?: string;
  healthInsuranceName?: string;
  date?: string;
  time?: string;
  type?: string;
  status?: string;
  authorizationStatus?: 'PENDING' | 'AUTHORIZED' | 'DENIED';
  authorizationNotes?: string;
  observations?: string;
  totem?: number;
  rescheduledFromAppointmentId?: string;
}

export default {
  async list(params?: {
    search?: string;
    status?: string;
    authorizationStatus?: string;
    specialty?: string;
    convenio?: string;
    patientId?: string;
    patientCpf?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const url = '/care/appointments/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async create(payload: AppointmentPayload) {
    const url = '/care/appointments/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async getById(id: string) {
    const url = `/care/appointments/${id}`;
    const res = await api.get(url);
    return res.data;
  },

  async update(id: string, payload: Partial<AppointmentPayload>) {
    const url = `/care/appointments/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async remove(id: string) {
    const url = `/care/appointments/${id}`;
    const res = await api.delete(url);
    return res.data;
  },

  async createWorklist(id: string) {
    const url = `/care/appointments/${id}/create-worklist`;
    const res = await api.post(url);
    return res.data;
  },

  async listOnline() {
    const res = await api.get<{ appointments: OnlineAppointment[] }>('/care/appointments/online');
    return res.data.appointments;
  },

  async resolveOnline(id: string, action: 'confirm' | 'reject', reason?: string) {
    const res = await api.patch(`/care/appointments/online/${id}`, { action, reason });
    return res.data;
  },
};

export type OnlineAppointment = {
  id: string;
  patientName: string | null;
  patientCpf: string | null;
  doctorName: string | null;
  specialty: string | null;
  date: string | null;
  time: string | null;
  type: string | null;
  convenio: string | null;
  observations: string | null;
  durationMinutes: number | null;
  createdAt: string;
};
