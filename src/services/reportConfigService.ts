import api from './api';

export interface ReportConfigPayload {
  requiresReviewer: boolean;
}

export default {
  async get() {
    const res = await api.get('/care/report-config/');
    return res.data;
  },

  async update(payload: ReportConfigPayload) {
    const res = await api.put('/care/report-config/', payload);
    return res.data;
  },
};
