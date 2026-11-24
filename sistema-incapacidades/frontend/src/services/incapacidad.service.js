import { api } from '../api/client.js';
import { buildQuery } from '../utils/query.js';

export const incapacidadService = {
  listar: (filtros, opciones) => api.get(`/incapacidades${buildQuery(filtros)}`, opciones),
  obtener: (id) => api.get(`/incapacidades/${id}`),
  crear: (datos) => api.post('/incapacidades', datos),
  actualizar: (id, datos) => api.patch(`/incapacidades/${id}`, datos),
  cambiarEstado: (id, estado, observaciones) => api.patch(`/incapacidades/${id}/estado`, { estado, observaciones }),
  historial: (id, filtros) => api.get(`/incapacidades/${id}/historial${buildQuery(filtros)}`),
  rechazos: (id) => api.get(`/incapacidades/${id}/rechazos`),
  crearRechazo: (id, datos) => api.post(`/incapacidades/${id}/rechazos`, datos),
  actualizarCorreccion: (id, accionesCorrectivas) => api.patch(`/incapacidades/rechazos/${id}`, { accionesCorrectivas })
};

export const radicacionService = {
  listar: (filtros, opciones) => api.get(`/radicaciones${buildQuery(filtros)}`, opciones),
  obtener: (id) => api.get(`/radicaciones/${id}`),
  crear: (incapacidadId, datos) => api.post(`/radicaciones/incapacidad/${incapacidadId}`, datos)
};
