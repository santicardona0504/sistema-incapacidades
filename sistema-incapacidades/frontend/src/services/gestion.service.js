import { api } from '../api/client.js';
import { buildQuery } from '../utils/query.js';

export const conciliacionService = {
  listar: (filtros) => api.get(`/conciliaciones${buildQuery(filtros)}`),
  obtener: (id) => api.get(`/conciliaciones/${id}`),
  crear: (datos) => api.post('/conciliaciones', datos),
  agregarPago: (id, datos) => api.post(`/conciliaciones/${id}/detalles`, datos),
  quitarPago: (id, pagoId) => api.delete(`/conciliaciones/${id}/detalles/${pagoId}`),
  validar: (id, observaciones) => api.patch(`/conciliaciones/${id}/validar`, { observaciones }),
  historial: (id) => api.get(`/conciliaciones/${id}/historial`)
};

export const alertaService = {
  listar: (filtros) => api.get(`/alertas${buildQuery(filtros)}`),
  resumen: () => api.get('/alertas/resumen'),
  generar: () => api.post('/alertas/generar', {}),
  marcarLeida: (id) => api.patch(`/alertas/${id}/leida`, {}),
  marcarTodas: (umbral) => api.patch('/alertas/leidas', umbral ? { umbral } : {})
};

export const reporteService = {
  tipos: () => api.get('/reportes/tipos'),
  exportarUrl: (tipo, filtros) => `/api/reportes/${tipo}?formato=csv${buildQuery(filtros).replace('?', '&')}`,
  descargar: async (tipo, filtros, nombre) => {
    const url = reporteService.exportarUrl(tipo, filtros);
    const respuesta = await fetch(url, { credentials: 'include' });
    if (!respuesta.ok) {
      const error = new Error('No fue posible exportar el reporte');
      error.status = respuesta.status;
      throw error;
    }
    const blob = await respuesta.blob();
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombre ?? `${tipo}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(enlace.href);
  },
  consultar: (tipo, filtros) => api.get(`/reportes/${tipo}${buildQuery({ ...filtros, formato: 'json' })}`)
};

export const dashboardService = {
  resumen: () => api.get('/dashboard/resumen'),
  graficas: () => api.get('/dashboard/graficas'),
  ultimos: () => api.get('/dashboard/ultimos-registros')
};

export const auditoriaService = {
  listar: (filtros) => api.get(`/auditoria${buildQuery(filtros)}`)
};
