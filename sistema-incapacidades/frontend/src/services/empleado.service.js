import { api } from '../api/client.js';
import { buildQuery } from '../utils/query.js';

export const empleadoService = {
  listar: (filtros, opciones) => api.get(`/empleados${buildQuery(filtros)}`, opciones),
  obtener: (id) => api.get(`/empleados/${id}`),
  crear: (datos) => api.post('/empleados', datos),
  actualizar: (id, datos) => api.patch(`/empleados/${id}`, datos),
  cambiarEstado: (id, activo) => api.patch(`/empleados/${id}/estado`, { activo }),
  historial: (id, filtros) => api.get(`/empleados/${id}/incapacidades${buildQuery(filtros)}`)
};

export const entidadService = {
  listar: (filtros, opciones) => api.get(`/entidades${buildQuery(filtros)}`, opciones),
  crear: (datos) => api.post('/entidades', datos),
  actualizar: (id, datos) => api.patch(`/entidades/${id}`, datos),
  cambiarEstado: (id, activa) => api.patch(`/entidades/${id}/estado`, { activa })
};
