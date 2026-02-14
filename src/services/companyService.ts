import api from './api';

const companyService = {
  listCompanies: async () => {
    const response = await api.get('/auth/companies');
    return response.data;
  },

  getCompany: async (id: string) => {
    const response = await api.get(`/auth/companies/${id}`);
    return response.data;
  },

  updateCompany: async (id: string, data: any) => {
    const response = await api.put(`/auth/companies/${id}`, data);
    return response.data;
  },

  createCompany: async (data: any) => {
    const response = await api.post('/auth/companies', data);
    return response.data;
  },

  deleteCompany: async (id: string) => {
    const response = await api.delete(`/auth/companies/${id}`);
    return response.data;
  },
};

export default companyService;