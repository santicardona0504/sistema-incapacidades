import { success } from '../../utils/api-response.js';
import { listarHistorial } from './historial.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarHistorial(req.validated.query), 'Historial consultado');
  } catch (error) {
    return next(error);
  }
}
