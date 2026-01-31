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
}

export default {
  async createPatient(payload: CreatePatientPayload) {
    const url = 'http://localhost:3001/patients/';
    const res = await api.post(url, payload);
    return res.data;
  },
};
