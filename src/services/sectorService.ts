import api from './api';

const sectorService = {
  listSectors: async () => {
    const response = await api.get('/sectors');
    return response.data;
  },

  getSector: async (id: string) => {
    const response = await api.get(`/sectors/${id}`);
    return response.data;
  },

  createSector: async (data: any) => {
    const response = await api.post('/sectors', data);
    return response.data;
  },

  updateSector: async (id: string, data: any) => {
    const response = await api.put(`/sectors/${id}`, data);
    return response.data;
  },

  deleteSector: async (id: string) => {
    const response = await api.delete(`/sectors/${id}`);
    return response.data;
  },
};

export default sectorService;