import { api } from '../api/client.js';
import { buildQuery } from '../utils/query.js';

export const userService = {
  listar: (filtros, opciones) => api.get(`/usuarios${buildQuery(filtros)}`, opciones),
  obtener: (id) => api.get(`/usuarios/${id}`),
  crear: (datos) => api.post('/usuarios', datos),
  actualizar: (id, datos) => api.patch(`/usuarios/${id}`, datos),
  desactivar: (id) => api.delete(`/usuarios/${id}`),
  roles: () => api.get('/roles'),
  permisos: () => api.get('/permisos'),
  rol: (id) => api.get(`/roles/${id}`),
  asignarPermisos: (id, permisoIds) => api.patch(`/roles/${id}/permisos`, { permisoIds })
};
