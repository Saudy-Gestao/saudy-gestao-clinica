import axios from 'axios';
import { getApiBaseUrl } from './getApiBaseUrl';

const TOKEN_KEY = 'patient_portal_token';

const patientPortalApi = axios.create({
  baseURL: getApiBaseUrl(),
});

patientPortalApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

patientPortalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const isAuthEndpoint = requestUrl.includes('/auth/patient-portal/request-code') || requestUrl.includes('/auth/patient-portal/verify-code');

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('patient_portal_user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('patient-auth:changed'));
        if (window.location.pathname.startsWith('/portal') && window.location.pathname !== '/portal/login') {
          window.location.replace('/portal/login');
        }
      }
    }

    return Promise.reject(error);
  },
);

export default patientPortalApi;

