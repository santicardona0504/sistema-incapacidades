import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
  timeoutErrorMessage: 'La solicitud agotó el tiempo de espera',
  headers: { Accept: 'application/json' }
});

api.interceptors.response.use(
  (respuesta) => respuesta.data,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const datos = error.response?.data ?? {};
    const esTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message ?? '');
    const fallo = new Error(esTimeout ? 'La solicitud agotó el tiempo de espera' : datos.message ?? 'No fue posible completar la solicitud');
    fallo.status = esTimeout ? 408 : error.response?.status ?? 0;
    fallo.details = datos.details;
    fallo.ok = false;
    return Promise.reject(fallo);
  }
);

export function esCancelado(error) {
  return error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
}

export function mensajeError(error) {
  if (error?.details && Array.isArray(error.details)) {
    return error.details.map((detalle) => `${detalle.campo}: ${detalle.mensaje}`).join(' · ');
  }
  return error?.message ?? 'Ocurrió un error inesperado';
}
