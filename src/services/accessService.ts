import api from './api';

const accessService = {
  listAccesses: async () => {
    const response = await api.get('/auth/accesses');
    return response.data;
  },

  createAccess: async (data: any) => {
    const response = await api.post('/auth/accesses', data);
    return response.data;
  },

  updateAccess: async (id: string, data: any) => {
    const response = await api.put(`/auth/accesses/${id}`, data);
    return response.data;
  },

  deleteAccess: async (id: string) => {
    const response = await api.delete(`/auth/accesses/${id}`);
    return response.data;
  },
};

export default accessService;