import api from './api';

const accessService = {
  listAccesses: async () => {
    const response = await api.get('/accesses');
    return response.data;
  },

  createAccess: async (data: any) => {
    const response = await api.post('/accesses', data);
    return response.data;
  },

  updateAccess: async (id: string, data: any) => {
    const response = await api.put(`/accesses/${id}`, data);
    return response.data;
  },

  deleteAccess: async (id: string) => {
    const response = await api.delete(`/accesses/${id}`);
    return response.data;
  },
};

export default accessService;