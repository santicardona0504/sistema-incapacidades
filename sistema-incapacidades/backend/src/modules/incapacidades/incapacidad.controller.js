import { success } from '../../utils/api-response.js';
import { listarHistorial } from '../historial/historial.service.js';
import {
  listarIncapacidades,
  obtenerIncapacidad,
  crearIncapacidad,
  editarIncapacidad,
  cambiarEstado
} from './incapacidad.service.js';
import {
  listarRechazos,
  registrarRechazo,
  actualizarAccionesCorrectivas
} from './rechazo.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarIncapacidades(req.validated.query), 'Incapacidades consultadas');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerIncapacidad(req.validated.params.id), 'Incapacidad encontrada');
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    const incapacidad = await crearIncapacidad(req.validated.body, req);
    return success(res, incapacidad, 'Incapacidad registrada', 201);
  } catch (error) {
    return next(error);
  }
}

export async function editar(req, res, next) {
  try {
    const incapacidad = await editarIncapacidad(req.validated.params.id, req.validated.body, req);
    return success(res, incapacidad, 'Incapacidad actualizada');
  } catch (error) {
    return next(error);
  }
}

export async function cambiar(req, res, next) {
  try {
    const incapacidad = await cambiarEstado(
      req.validated.params.id,
      req.validated.body.estado,
      req.validated.body.observaciones,
      req
    );
    return success(res, incapacidad, 'Estado actualizado');
  } catch (error) {
    return next(error);
  }
}

export async function historial(req, res, next) {
  try {
    const datos = await listarHistorial({
      ...req.validated.query,
      incapacidadId: req.validated.params.id
    });
    return success(res, datos, 'Historial de la incapacidad consultado');
  } catch (error) {
    return next(error);
  }
}

export async function listarRechazosDeIncapacidad(req, res, next) {
  try {
    return success(res, await listarRechazos(req.validated.params.id), 'Rechazos consultados');
  } catch (error) {
    return next(error);
  }
}

export async function registrarRechazoDeIncapacidad(req, res, next) {
  try {
    const rechazo = await registrarRechazo(req.validated.params.id, req.validated.body, req);
    return success(res, rechazo, 'Rechazo registrado', 201);
  } catch (error) {
    return next(error);
  }
}

export async function actualizarCorreccion(req, res, next) {
  try {
    const rechazo = await actualizarAccionesCorrectivas(
      req.validated.params.id,
      req.validated.body.accionesCorrectivas,
      req
    );
    return success(res, rechazo, 'Acciones correctivas registradas');
  } catch (error) {
    return next(error);
  }
}
