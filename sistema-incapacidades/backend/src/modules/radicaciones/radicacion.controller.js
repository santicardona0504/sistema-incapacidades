import { success } from '../../utils/api-response.js';
import {
  listarRadicaciones,
  obtenerRadicacion,
  crearRadicacion
} from './radicacion.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarRadicaciones(req.validated.query), 'Radicaciones consultadas');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerRadicacion(req.validated.params.id), 'Radicación encontrada');
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    const radicacion = await crearRadicacion(
      req.validated.params.incapacidadId,
      req.validated.body,
      req
    );
    return success(res, radicacion, 'Incapacidad transcrita y radicada', 201);
  } catch (error) {
    return next(error);
  }
}
