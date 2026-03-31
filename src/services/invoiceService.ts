import api from './api';

export interface CreateInvoicePayload {
  number?: string;
  patientName?: string;
  issuedAt?: string; // ISO
  dueDate?: string; // YYYY-MM-DD
  convention?: string; // convenio
  operatorGuideNumber?: string;
  authorizationPassword?: string;
  authorizationDate?: string; // YYYY-MM-DD
  authorizationExpiryDate?: string; // YYYY-MM-DD
  authorizedAttendanceType?: string;
  packageValue?: number;
  materialsValue?: number;
  feesValue?: number;
  dailyValue?: number;
  gasesValue?: number;
  opmeValue?: number;
  expectedDiscountValue?: number;
  expectedGlosaValue?: number;
  value: number;
  discount?: number;
  paymentMethod?: string;
}

export default {
  async createInvoice(payload: CreateInvoicePayload) {
    const url = '/admin/invoices/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async updateInvoice(id: string | number, payload: Partial<CreateInvoicePayload & { status?: string }>) {
    const url = `/admin/invoices/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async getInvoices() {
    const url = '/admin/invoices/';
    const res = await api.get(url);
    return res.data;
  },
};
