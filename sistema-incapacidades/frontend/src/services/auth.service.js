import { api } from '../api/client.js';

export const authService = {
  login: (credenciales) => api.post('/auth/login', credenciales),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};
