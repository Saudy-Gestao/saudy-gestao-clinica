import api from './api';

export interface Cbo {
  id: string;
  code: string;
  title: string;
  isActive: boolean;
}

export default {
  async listCbos(params?: { search?: string; limit?: number; offset?: number }) {
    const res = await api.get('/procedures/cbos/', { params });
    return res.data;
  },
};
