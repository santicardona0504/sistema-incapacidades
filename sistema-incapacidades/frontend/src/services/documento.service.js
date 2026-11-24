import { api } from '../api/client.js';
import { buildQuery } from '../utils/query.js';

export const documentoService = {
  listar: (filtros) => api.get(`/documentos${buildQuery(filtros)}`),
  obtener: (id) => api.get(`/documentos/${id}`),
  subir: (incapacidadId, formData) => api.post(`/documentos/incapacidad/${incapacidadId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  urlDescarga: (id) => `/api/documentos/${id}/descargar`,
  descargar: async (id, nombre) => {
    const respuesta = await fetch(documentoService.urlDescarga(id), { credentials: 'include' });
    if (!respuesta.ok) throw new Error('No fue posible descargar el documento');
    const blob = await respuesta.blob();
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombre ?? 'documento';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(enlace.href);
  }
};

export const historialService = {
  listar: (filtros) => api.get(`/historial${buildQuery(filtros)}`)
};
