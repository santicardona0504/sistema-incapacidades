import { success } from '../../utils/api-response.js';
import { listarEntidades, obtenerEntidad } from './entidad.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarEntidades(req.validated.query), 'Entidades consultadas');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerEntidad(req.validated.params.id), 'Entidad encontrada');
  } catch (error) {
    return next(error);
  }
}
