import api from './api';

export interface Module {
  id: string;
  name: string;
  label: string;
  description: string;
  icon?: string;
  category: string;
}

export const moduleService = {
  getAll: async (): Promise<Module[]> => {
    const response = await api.get('/auth/modules');
    return response.data;
  },

  getById: async (id: string): Promise<Module> => {
    const response = await api.get(`/auth/modules/${id}`);
    return response.data;
  },
};
