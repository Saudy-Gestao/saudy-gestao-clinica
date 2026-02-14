import api from './api';

export interface AppointmentPayload {
  patientName?: string;
  patientCpf?: string;
  patientId?: string;
  doctorName?: string;
  specialty?: string;
  convenio?: string;
  date?: string;
  time?: string;
  type?: string;
  status?: string;
  observations?: string;
  totem?: number;
}

export default {
  async list(params?: { search?: string; status?: string; specialty?: string; convenio?: string; limit?: number; offset?: number }) {
    const url = '/care/appointments/';
    const res = await api.get(url, { params });
    return res.data;
  },

  async create(payload: AppointmentPayload) {
    const url = '/care/appointments/';
    const res = await api.post(url, payload);
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
};
