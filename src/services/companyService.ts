import api from './api';

const companyService = {
  listCompanies: async () => {
    const response = await api.get('/companies');
    return response.data;
  },

  getCompany: async (id: string) => {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },

  updateCompany: async (id: string, data: any) => {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },

  createCompany: async (data: any) => {
    const response = await api.post('/companies', data);
    return response.data;
  },

  deleteCompany: async (id: string) => {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
  },
};

export default companyService;