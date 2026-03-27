import api from './api';

export interface ReportAuditLogItem {
  id: string;
  branchId: string;
  reportId?: string | null;
  addendumId?: string | null;
  action: string;
  performedByUserId?: string | null;
  performedByName?: string | null;
  details?: string | null;
  createdAt: string;
}

export default {
  async list(params: { reportId?: string; addendumId?: string; limit?: number; offset?: number }) {
    const res = await api.get('/care/report-audit-logs/', { params });
    return res.data as { items: ReportAuditLogItem[]; total: number };
  },
};
