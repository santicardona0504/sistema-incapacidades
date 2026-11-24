import { success } from '../../utils/api-response.js';
import {
  listarCobros,
  listarCobrosPendientes,
  obtenerCobro,
  crearCobro,
  editarCobro,
  listarGestiones,
  crearGestion,
  radicacionesDeIncapacidad
} from './cobro.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarCobros(req.validated.query), 'Cobros consultados');
  } catch (error) {
    return next(error);
  }
}

export async function pendientes(req, res, next) {
  try {
    return success(res, await listarCobrosPendientes(req.validated.query), 'Cobros pendientes consultados');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerCobro(req.validated.params.id), 'Cobro encontrado');
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    return success(res, await crearCobro(req.validated.body, req), 'Cobro registrado', 201);
  } catch (error) {
    return next(error);
  }
}

export async function editar(req, res, next) {
  try {
    return success(res, await editarCobro(req.validated.params.id, req.validated.body, req), 'Cobro actualizado');
  } catch (error) {
    return next(error);
  }
}

export async function gestiones(req, res, next) {
  try {
    return success(res, await listarGestiones(req.validated.params.id), 'Historial de gestiones consultado');
  } catch (error) {
    return next(error);
  }
}

export async function registrarGestion(req, res, next) {
  try {
    const gestion = await crearGestion(req.validated.params.id, req.validated.body, req);
    return success(res, gestion, 'Gestión de cobro registrada', 201);
  } catch (error) {
    return next(error);
  }
}

export async function radicaciones(req, res, next) {
  try {
    return success(
      res,
      await radicacionesDeIncapacidad(req.validated.params.incapacidadId),
      'Radicaciones de la incapacidad consultadas'
    );
  } catch (error) {
    return next(error);
  }
}
