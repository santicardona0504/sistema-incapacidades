import { success } from '../../utils/api-response.js';
import {
  listarConciliaciones,
  obtenerConciliacion,
  crearConciliacion,
  agregarDetalle,
  quitarDetalle,
  validarConciliacion,
  historialConciliacion
} from './conciliacion.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarConciliaciones(req.validated.query), 'Conciliaciones consultadas');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerConciliacion(req.validated.params.id), 'Conciliación encontrada');
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    return success(res, await crearConciliacion(req.validated.body, req), 'Conciliación creada', 201);
  } catch (error) {
    return next(error);
  }
}

export async function agregar(req, res, next) {
  try {
    const conciliacion = await agregarDetalle(req.validated.params.id, req.validated.body, req);
    return success(res, conciliacion, 'Pago asociado a la conciliación', 201);
  } catch (error) {
    return next(error);
  }
}

export async function quitar(req, res, next) {
  try {
    const conciliacion = await quitarDetalle(req.validated.params.id, req.validated.params.pagoId, req);
    return success(res, conciliacion, 'Pago retirado de la conciliación');
  } catch (error) {
    return next(error);
  }
}

export async function validar(req, res, next) {
  try {
    const conciliacion = await validarConciliacion(req.validated.params.id, req.validated.body, req);
    return success(res, conciliacion, 'Conciliación validada');
  } catch (error) {
    return next(error);
  }
}

export async function historial(req, res, next) {
  try {
    return success(res, await historialConciliacion(req.validated.params.id), 'Historial de conciliación consultado');
  } catch (error) {
    return next(error);
  }
}
