import api from './api';

export interface CreateInvoicePayload {
  number?: string;
  patientName?: string;
  issuedAt?: string; // ISO
  dueDate?: string; // YYYY-MM-DD
  convention?: string; // convenio
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

  async getInvoices() {
    const url = '/admin/invoices/';
    const res = await api.get(url);
    return res.data;
  },
};
