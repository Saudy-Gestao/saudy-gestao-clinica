import api from './api';

export interface CreatePatientPayload {
  name: string;
  email?: string;
  phone?: string;
  cellphone?: string;
  birthDate?: string;
  gender?: string;
  cpf: string;
  rg?: string;
  maritalStatus?: string;
  occupation?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  hasGuardian?: boolean;
  guardianName?: string;
  guardianCpf?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
  hasHealthInsurance?: boolean;
  healthInsuranceName?: string;
  healthInsuranceNumber?: string;
  healthInsuranceExpiry?: string;
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  observations?: string;
  isActive?: boolean;
}

export type UpdatePatientPayload = Partial<CreatePatientPayload>;

export default {
  async listPatients() {
    const url = '/accounts/patients/';
    const res = await api.get(url);
    return res.data;
  },

  async getPatientById(id: string) {
    const url = `/accounts/patients/${id}`;
    const res = await api.get(url);
    return res.data;
  },

  async getPatientByCpf(cpf: string) {
    const url = '/accounts/patients/';
    const res = await api.get(url, { params: { cpf } });
    return res.data;
  },

  async createPatient(payload: CreatePatientPayload) {
    const url = '/accounts/patients/';
    const res = await api.post(url, payload);
    return res.data;
  },

  async updatePatient(id: string, payload: UpdatePatientPayload) {
    const url = `/accounts/patients/${id}`;
    const res = await api.put(url, payload);
    return res.data;
  },

  async deletePatient(id: string) {
    const url = `/accounts/patients/${id}`;
    const res = await api.delete(url);
    return res.data;
  },
};
