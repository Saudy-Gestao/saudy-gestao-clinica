import api from './api';

const userService = {
  listUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },

  getUser: async (id: string) => {
    const response = await api.get(`/auth/users/${id}`);
    return response.data;
  },

  createUser: async (data: any) => {
    const response = await api.post('/auth/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: any) => {
    const response = await api.put(`/auth/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  },
};

export default userService;