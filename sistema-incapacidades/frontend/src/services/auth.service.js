import { api } from '../api/client.js';

export const authService = {
  login: (credenciales) => api.post('/auth/login', credenciales),
  me: (opciones) => api.get('/auth/me', opciones),
  logout: () => api.post('/auth/logout')
};
