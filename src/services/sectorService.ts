import api from './api';

const sectorService = {
  listSectors: async () => {
    const response = await api.get('/auth/sectors');
    return response.data;
  },

  getSector: async (id: string) => {
    const response = await api.get(`/auth/sectors/${id}`);
    return response.data;
  },

  createSector: async (data: any) => {
    const response = await api.post('/auth/sectors', data);
    return response.data;
  },

  updateSector: async (id: string, data: any) => {
    const response = await api.put(`/auth/sectors/${id}`, data);
    return response.data;
  },

  deleteSector: async (id: string) => {
    const response = await api.delete(`/auth/sectors/${id}`);
    return response.data;
  },

  createDefaultSectors: async (branchId: string) => {
    const response = await api.post(`/auth/branches/${branchId}/default-sectors`);
    return response.data;
  },
};

export default sectorService;