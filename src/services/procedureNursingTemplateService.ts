import api from './api';

export type NursingQuestionOptionPayload = {
  label: string;
  value: string;
  orderIndex?: number;
};

export type NursingQuestionPayload = {
  label: string;
  helpText?: string | null;
  responseType: string;
  placeholder?: string | null;
  isRequired?: boolean;
  orderIndex?: number;
  options?: NursingQuestionOptionPayload[];
};

export type ProcedureNursingTemplatePayload = {
  procedureId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  collectHeight?: boolean;
  collectWeight?: boolean;
  collectBloodPressure?: boolean;
  collectTemperature?: boolean;
  collectHeartRate?: boolean;
  collectOxygenSaturation?: boolean;
  collectGlucose?: boolean;
  collectPregnancyCheck?: boolean;
  questions: NursingQuestionPayload[];
};

export type ProcedureNursingTemplateItem = {
  id: string;
  procedureId: string;
  branchId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  collectHeight: boolean;
  collectWeight: boolean;
  collectBloodPressure: boolean;
  collectTemperature: boolean;
  collectHeartRate: boolean;
  collectOxygenSaturation: boolean;
  collectGlucose: boolean;
  collectPregnancyCheck: boolean;
  procedure?: {
    id: string;
    name: string;
  } | null;
  questions: Array<{
    id: string;
    label: string;
    helpText?: string | null;
    responseType: string;
    placeholder?: string | null;
    isRequired: boolean;
    orderIndex: number;
    options: Array<{
      id: string;
      label: string;
      value: string;
      orderIndex: number;
    }>;
  }>;
};

export default {
  async list(params?: {
    search?: string;
    procedureId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const res = await api.get('/procedures/nursing-templates', { params });
    return res.data as { total: number; items: ProcedureNursingTemplateItem[] };
  },

  async getById(id: string) {
    const res = await api.get(`/procedures/nursing-templates/${id}`);
    return res.data as ProcedureNursingTemplateItem;
  },

  async create(payload: ProcedureNursingTemplatePayload) {
    const res = await api.post('/procedures/nursing-templates', payload);
    return res.data as ProcedureNursingTemplateItem;
  },

  async update(id: string, payload: Partial<ProcedureNursingTemplatePayload>) {
    const res = await api.put(`/procedures/nursing-templates/${id}`, payload);
    return res.data as ProcedureNursingTemplateItem;
  },

  async deactivate(id: string) {
    const res = await api.delete(`/procedures/nursing-templates/${id}`);
    return res.data as { success: boolean };
  },
};
