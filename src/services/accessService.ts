import api from './api';
import type { Module } from './moduleService';

export interface Access {
  id: string;
  description: string;
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
    const response = await api.get('/accesses');
    return response.data;
  },

  createAccess: async (data: AccessCreateData): Promise<Access> => {
    const response = await api.post('/accesses', data);
    return response.data;
  },

  updateAccess: async (id: string, data: AccessUpdateData): Promise<Access> => {
    const response = await api.put(`/accesses/${id}`, data);
    return response.data;
  },

  deleteAccess: async (id: string): Promise<void> => {
    const response = await api.delete(`/accesses/${id}`);
    return response.data;
  },
};

export default accessService;