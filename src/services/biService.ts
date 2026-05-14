import api from './api';

export type BIOverviewParams = {
  startDate: string;
  endDate: string;
  branchId?: string | null;
  sectorId?: string | null;
  doctorId?: string | null;
  insuranceId?: string | null;
  procedureId?: string | null;
};

const biService = {
  async getOverview(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/overview', { params });
    return response.data;
  },

  async getOccupancy(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/occupancy', { params });
    return response.data;
  },

  async getFinancial(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/financial', { params });
    return response.data;
  },

  async getClinical(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/clinical', { params });
    return response.data;
  },
  async getResources(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/resources', { params });
    return response.data;
  },
  async getAuthorizations(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/authorizations', { params });
    return response.data;
  },
  async getTea(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/tea', { params });
    return response.data;
  },
  async getReports(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/reports', { params });
    return response.data;
  },
  async getCommunication(params: BIOverviewParams) {
    const response = await api.get('/admin/bi/communication', { params });
    return response.data;
  },

  async generateWidgets(
    data: Record<string, unknown>,
    period: { startDate: string; endDate: string },
    filters: Record<string, unknown>,
    panelName: string,
    userPrompt: string,
  ) {
    const response = await api.post('/admin/bi/widgets', { data, period, filters, panelName, userPrompt });
    return response.data as {
      widgets: {
        id: string;
        type: 'metric' | 'text' | 'bar_chart' | 'area_chart' | 'pie_chart' | 'ranking';
        title: string;
        value?: string;
        hint?: string;
        color?: string;
        content?: string;
        data?: { label: string; value: number }[];
        items?: { label: string; value: string; score?: number }[];
      }[];
      generatedAt: string;
    };
  },

  async getInsights(
    data: Record<string, unknown>,
    period: { startDate: string; endDate: string },
    filters?: Record<string, unknown>,
    force?: boolean,
  ) {
    const response = await api.post('/admin/bi/insights', { data, period, filters, force });
    return response.data as {
      summary: string;
      positives: string[];
      negatives: string[];
      alerts: { text: string; priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO' }[];
      suggestions: { text: string; timeframe: 'imediato' | 'esta semana' | 'este mês'; owner: string }[];
      generatedAt: string;
      expiresAt: string;
      fromCache: boolean;
    };
  },
};

export default biService;
