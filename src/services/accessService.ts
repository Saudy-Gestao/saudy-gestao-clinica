import api from './api';
import type { Module } from './moduleService';

export interface Access {
  id: string;
  description: string;
  isTemplate?: boolean;
  modules: Module[];
}

export interface AccessCreateData {
  description: string;
  moduleIds: string[];
}

export interface AccessUpdateData {
  description?: string;
  moduleIds?: string[];
}

const accessService = {
  listAccesses: async (): Promise<Access[]> => {
    const response = await api.get('/auth/accesses');
    return response.data;
  },

  createAccess: async (data: AccessCreateData): Promise<Access> => {
    const response = await api.post('/auth/accesses', data);
    return response.data;
  },

  updateAccess: async (id: string, data: AccessUpdateData): Promise<Access> => {
    const response = await api.put(`/auth/accesses/${id}`, data);
    return response.data;
  },

  deleteAccess: async (id: string): Promise<void> => {
    const response = await api.delete(`/auth/accesses/${id}`);
    return response.data;
  },

  cloneTemplate: async (template: Access): Promise<Access> => {
    const response = await api.post('/auth/accesses', {
      description: `${template.description} (personalizado)`,
      moduleIds: template.modules.map((m) => m.id),
    });
    return response.data;
  },
};

export default accessService;