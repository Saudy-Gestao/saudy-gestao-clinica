import axios from 'axios';
import { getApiBaseUrl } from './getApiBaseUrl';
import { resolveApiErrorMessage } from '../lib/apiError';

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedMessage = resolveApiErrorMessage(error, 'Não foi possível concluir a solicitação.');
    error.userMessage = normalizedMessage;
    error.message = normalizedMessage;

    const responseData = error?.response?.data;
    if (responseData && typeof responseData === 'object') {
      const hasMessage = typeof responseData.message === 'string' && responseData.message.trim();
      const hasError = typeof responseData.error === 'string' && responseData.error.trim();
      const hasDetail = typeof responseData.detail === 'string' && responseData.detail.trim();

      if (hasMessage && !responseData.originalMessage) responseData.originalMessage = responseData.message;
      if (hasError && !responseData.originalError) responseData.originalError = responseData.error;
      if (hasDetail && !responseData.originalDetail) responseData.originalDetail = responseData.detail;

      responseData.message = normalizedMessage;
      responseData.error = normalizedMessage;
      responseData.detail = normalizedMessage;
    }

    const hadToken = Boolean(localStorage.getItem('token'));
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/forgot-password') || requestUrl.includes('/auth/verify-code') || requestUrl.includes('/auth/reset-password');
    const isDicomWebEndpoint = requestUrl.includes('/dicom-web');

    if (status === 401 && hadToken && !isAuthEndpoint && !isDicomWebEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:changed'));
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
