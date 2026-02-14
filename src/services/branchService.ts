import api from './api';

const branchService = {
  listBranches: async () => {
    const response = await api.get('/auth/branches');
    return response.data;
  },

  getBranch: async (id: string) => {
    const response = await api.get(`/auth/branches/${id}`);
    return response.data;
  },

  createBranch: async (data: any) => {
    const response = await api.post('/auth/branches', data);
    return response.data;
  },

  updateBranch: async (id: string, data: any) => {
    const response = await api.put(`/auth/branches/${id}`, data);
    return response.data;
  },

  deleteBranch: async (id: string) => {
    const response = await api.delete(`/auth/branches/${id}`);
    return response.data;
  },
};

export default branchService;