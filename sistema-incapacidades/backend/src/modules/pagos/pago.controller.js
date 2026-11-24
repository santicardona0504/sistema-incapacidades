import { success } from '../../utils/api-response.js';
import {
  listarPagos,
  listarPagosPendientes,
  obtenerPago,
  crearPago,
  adjuntarSoporte
} from './pago.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarPagos(req.validated.query), 'Pagos consultados');
  } catch (error) {
    return next(error);
  }
}

export async function pendientes(req, res, next) {
  try {
    return success(res, await listarPagosPendientes(req.validated.query), 'Pagos pendientes consultados');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerPago(req.validated.params.id), 'Pago encontrado');
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    return success(res, await crearPago(req.validated.body, req), 'Pago registrado', 201);
  } catch (error) {
    return next(error);
  }
}

export async function soporte(req, res, next) {
  try {
    const pago = await adjuntarSoporte(req.validated.params.id, req.validated.body.soporteDocumentoId, req);
    return success(res, pago, 'Soporte de pago asociado');
  } catch (error) {
    return next(error);
  }
}
