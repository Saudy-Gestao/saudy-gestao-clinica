import api from './patientPortalApi';
import { onlyDigits } from '../utils/formatters';

export type PatientPortalUser = {
  id: string;
  branchId: string | null;
  name: string | null;
  cpf: string;
  birthDate: string | null;
  email: string | null;
  cellphone: string | null;
  relationship?: string | null;
  profileType?: 'SELF' | 'DEPENDENT' | null;
};

export type CompanyOption = {
  patientId: string;
  branchId: string | null;
  branchName: string;
};

type RequestCodeResponse =
  | {
      requiresCompanySelection: true;
      companies: CompanyOption[];
    }
  | {
      requiresCompanySelection?: false;
      message: string;
      challengeToken: string;
      destination: string;
      expiresInMinutes: number;
    };

type VerifyCodeResponse = {
  token: string;
  patient: PatientPortalUser;
  profiles?: PatientPortalUser[];
  principal?: {
    id: string;
    name: string | null;
    cpf: string;
  };
};

const TOKEN_KEY = 'patient_portal_token';
const USER_KEY = 'patient_portal_user';

class PatientPortalAuthService {
  requestCode(cpf: string, birthDate: string, selectedPatientId?: string) {
    return api.post<RequestCodeResponse>('/auth/patient-portal/request-code', {
      cpf: onlyDigits(cpf),
      birthDate,
      ...(selectedPatientId ? { selectedPatientId } : {}),
    }).then((response) => response.data);
  }

  async verifyCode(challengeToken: string, code: string) {
    const data = await api.post<VerifyCodeResponse>('/auth/patient-portal/verify-code', {
      challengeToken,
      code: onlyDigits(code),
    }).then((response) => response.data);

    if (data?.token) {
      // sessionStorage is cleared when the browser tab closes, reducing PII exposure
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.patient || null));
      window.dispatchEvent(new Event('patient-auth:changed'));
    }

    return data;
  }

  async selectProfile(patientId: string) {
    const data = await api.post<VerifyCodeResponse>('/auth/patient-portal/me/select-profile', { patientId })
      .then((response) => response.data);

    if (data?.token) {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(data.patient || null));
      window.dispatchEvent(new Event('patient-auth:changed'));
    }
    return data;
  }

  logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('patient-auth:changed'));
  }

  isAuthenticated() {
    return Boolean(sessionStorage.getItem(TOKEN_KEY));
  }

  getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser() {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PatientPortalUser;
    } catch {
      return null;
    }
  }
}

export default new PatientPortalAuthService();
