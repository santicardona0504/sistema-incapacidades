import { api } from '../api/client.js';
import { buildQuery } from '../utils/query.js';

export const cobroService = {
  listar: (filtros, opciones) => api.get(`/cobros${buildQuery(filtros)}`, opciones),
  pendientes: (filtros) => api.get(`/cobros/pendientes${buildQuery(filtros)}`),
  obtener: (id) => api.get(`/cobros/${id}`),
  crear: (datos) => api.post('/cobros', datos),
  actualizar: (id, datos) => api.patch(`/cobros/${id}`, datos),
  gestiones: (id) => api.get(`/cobros/${id}/gestiones`),
  registrarGestion: (id, datos) => api.post(`/cobros/${id}/gestiones`, datos),
  radicacionesDeIncapacidad: (incapacidadId) => api.get(`/cobros/incapacidad/${incapacidadId}/radicaciones`)
};

export const pagoService = {
  listar: (filtros, opciones) => api.get(`/pagos${buildQuery(filtros)}`, opciones),
  pendientes: (filtros) => api.get(`/pagos/pendientes${buildQuery(filtros)}`),
  obtener: (id) => api.get(`/pagos/${id}`),
  crear: (datos) => api.post('/pagos', datos),
  adjuntarSoporte: (id, soporteDocumentoId) => api.patch(`/pagos/${id}/soporte`, { soporteDocumentoId })
};
