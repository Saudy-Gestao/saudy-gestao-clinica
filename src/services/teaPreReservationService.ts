import api from './api';

export type TeaPreReservationStatus =
  | 'PENDING_SCHEDULING'
  | 'PROPOSED'
  | 'RESERVED'
  | 'PENDING_AUTHORIZATION'
  | 'AUTHORIZED'
  | 'CONVERTED'
  | 'EXPIRED'
  | 'CANCELED';

export default {
  async listCreated(params?: { status?: TeaPreReservationStatus; limit?: number; offset?: number }) {
    const res = await api.get('/care/tea-pre-reservations/', { params });
    return res.data;
  },

  async listPending(params?: { search?: string; status?: TeaPreReservationStatus }) {
    const res = await api.get('/care/tea-pre-reservations/pending', { params });
    return res.data;
  },

  async getSuggestions(
    pitTherapyId: string,
    params?: { daysAhead?: number; limit?: number; exclude?: string[] },
  ) {
    const requestParams = {
      daysAhead: params?.daysAhead,
      limit: params?.limit,
      exclude: Array.isArray(params?.exclude) ? params?.exclude.join(',') : undefined,
    };
    const res = await api.get(`/care/tea-pre-reservations/${pitTherapyId}/suggestions`, { params: requestParams });
    return res.data;
  },

  async getManualGrid(pitTherapyId: string, params?: { weekStart?: string }) {
    const res = await api.get(`/care/tea-pre-reservations/${pitTherapyId}/manual-grid`, { params });
    return res.data;
  },

  async create(payload: {
    pitTherapyId: string;
    suggestedDate?: string;
    suggestedTime?: string;
    status?: TeaPreReservationStatus;
    notes?: string;
    expiresAt?: string;
    recurring?: boolean;
    recurrenceWeeks?: number;
    recurringUntilDate?: string;
  }) {
    const res = await api.post('/care/tea-pre-reservations', payload);
    return res.data;
  },

  async updateStatus(id: string, payload: {
    status: TeaPreReservationStatus;
    notes?: string;
    authorizedAt?: string;
    convertedAt?: string;
    applySeries?: boolean;
  }) {
    const res = await api.patch(`/care/tea-pre-reservations/${id}/status`, payload);
    return res.data;
  },

  async convertToAppointment(id: string, payload?: { overrideStatus?: string; observation?: string; convertSeries?: boolean; seriesStartDate?: string }) {
    const res = await api.post(`/care/tea-pre-reservations/${id}/convert-to-appointment`, payload || {});
    return res.data;
  },

  async getConversionChecklist(id: string) {
    const res = await api.get(`/care/tea-pre-reservations/${id}/conversion-checklist`);
    return res.data;
  },

  async getTimeline(id: string) {
    const res = await api.get(`/care/tea-pre-reservations/${id}/timeline`);
    return res.data;
  },

  async validateWeekly(payload: {
    pitTherapyId: string;
    suggestions: Array<{ date: string; time: string }>;
  }) {
    const res = await api.post('/care/tea-pre-reservations/validate-weekly', payload);
    return res.data;
  },

  async acceptGroup(payload: {
    recurring?: boolean;
    recurrenceWeeks?: number;
    recurringUntilDate?: string;
    expiresAt?: string;
    status?: TeaPreReservationStatus;
    replaceExistingByTherapy?: boolean;
    items: Array<{
      pitTherapyId: string;
      suggestedDate: string;
      suggestedTime: string;
      durationMinutes?: number | null;
    }>;
  }) {
    const res = await api.post('/care/tea-pre-reservations/accept-group', payload);
    return res.data;
  },

  async listCancellationTherapies(params: { teaProfileId: string; fromDate?: string }) {
    const res = await api.get('/care/tea-pre-reservations/cancellation-therapies', { params });
    return res.data;
  },

  async cancelTherapySeries(payload: {
    teaProfileId: string;
    pitTherapyId?: string;
    cancelAll?: boolean;
    fromDate?: string;
    reason?: string;
  }) {
    const res = await api.post('/care/tea-pre-reservations/cancel-therapy-series', payload);
    return res.data;
  },
};
