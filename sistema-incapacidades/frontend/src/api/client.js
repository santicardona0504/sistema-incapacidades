import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' }
});

api.interceptors.response.use(
  (respuesta) => respuesta.data,
  (error) => {
    const datos = error.response?.data ?? {};
    const fallo = new Error(datos.message ?? 'No fue posible completar la solicitud');
    fallo.status = error.response?.status ?? 0;
    fallo.details = datos.details;
    fallo.ok = false;
    return Promise.reject(fallo);
  }
);

export function mensajeError(error) {
  if (error?.details && Array.isArray(error.details)) {
    return error.details.map((detalle) => `${detalle.campo}: ${detalle.mensaje}`).join(' · ');
  }
  return error?.message ?? 'Ocurrió un error inesperado';
}
