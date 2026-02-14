import api from './api';

export interface CreateDoctorPayload {
  crm: string;
  crmState: string;
  name: string;
  email?: string;
  phone?: string;
  cellphone?: string;
  birthDate?: string; // YYYY-MM-DD
  gender?: string; // MALE | FEMALE | OTHER
  cpf: string;
  rg?: string;
  specialty?: string;
  specialties?: string[];
  consultationFee?: number;
  biography?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  workingDays?: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
}

export default {
  async createDoctor(payload: CreateDoctorPayload) {
    // Use absolute URL to point to local API (dev) as requested
    const url = 'http://localhost:3001/doctors/';
    const res = await api.post(url, payload);
    return res.data;
  },
};
