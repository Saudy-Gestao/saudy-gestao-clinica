import api from './api';

export interface Agenda {
  id: string;
  branchId: string;
  branch?: { id: string; tradeName: string } | null;
  doctorId: string;
  doctor?: { id: string; name: string } | null;
  weekday: string;
  shiftStart: string;
  shiftEnd: string;
  especialidadeId?: string | null;
  especialidade?: { id: string; name: string; modalidadeId: string } | null;
  roomId?: string | null;
  room?: { id: string; name: string } | null;
  startDate?: string | null;
  endDate?: string | null;
  status: 'ATIVA' | 'INATIVA' | 'BLOQUEADA';
  createdAt: string;
  updatedAt: string;
}

export interface AgendaPayload {
  branchId: string;
  doctorId: string;
  weekday: string;
  shiftStart: string;
  shiftEnd: string;
  especialidadeId?: string | null;
  roomId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: 'ATIVA' | 'INATIVA' | 'BLOQUEADA';
}

export default {
  async listAgendas(params?: { branchId?: string; doctorId?: string; status?: string }) {
    const res = await api.get('/care/agendas/', { params });
    return res.data;
  },

  async getAgenda(id: string) {
    const res = await api.get(`/care/agendas/${id}`);
    return res.data;
  },

  async createAgenda(payload: AgendaPayload) {
    const res = await api.post('/care/agendas/', payload);
    return res.data;
  },

  async updateAgenda(id: string, payload: Partial<AgendaPayload>) {
    const res = await api.put(`/care/agendas/${id}`, payload);
    return res.data;
  },

  async deleteAgenda(id: string) {
    const res = await api.delete(`/care/agendas/${id}`);
    return res.data;
  },
};
