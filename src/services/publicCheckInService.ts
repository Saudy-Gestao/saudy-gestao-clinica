import axios from 'axios';
import { getApiBaseUrl } from './getApiBaseUrl';
import publicCheckInSessionService from './publicCheckInSessionService';

const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
});

publicApi.interceptors.request.use((config) => {
  const token = publicCheckInSessionService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface PublicCheckInPayload {
  branchId: string;
  patientId?: string;
  patientCpf?: string;
  patientName?: string;
  trust?: number;
  totem?: number;
}

export interface PublicBranchInfo {
  id: string;
  tradeName: string;
  phone?: string | null;
  publicCheckInEnabled: boolean;
}

export interface PublicCheckInAppointment {
  id: string;
  doctorName?: string | null;
  specialty?: string | null;
  date?: string | null;
  time?: string | null;
  status?: string | null;
  convenio?: string | null;
  type?: string | null;
}

export interface PublicCheckInResponse {
  status: 'QUEUED' | 'NO_CONFIRMED_APPOINTMENTS' | 'PATIENT_NOT_FOUND' | 'FACIAL_NOT_RECOGNIZED';
  message: string;
  patient?: {
    id: string;
    name: string;
    cpf: string;
  };
  appointments?: PublicCheckInAppointment[];
  trust?: number | null;
  preAttendance?: {
    id: string;
    status?: string | null;
    queue?: string | null;
    queueType?: string | null;
    agenda?: string | null;
  };
}

const publicCheckInService = {
  async getBranchInfo(branchId: string): Promise<PublicBranchInfo> {
    const response = await publicApi.get(`/care/public-check-in/branch/${branchId}`);
    return response.data;
  },

  async facialCheckIn(payload: PublicCheckInPayload): Promise<PublicCheckInResponse> {
    const response = await publicApi.post('/care/public-check-in/facial', payload);
    return response.data;
  },
};

export default publicCheckInService;
