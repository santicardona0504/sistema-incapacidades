import { success } from '../../utils/api-response.js';
import {
  listarEntidades,
  obtenerEntidad,
  crearEntidad,
  editarEntidad,
  cambiarEstadoEntidad
} from './entidad.service.js';

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

export async function crear(req, res, next) {
  try {
    return success(res, await crearEntidad(req.validated.body, req), 'Entidad creada', 201);
  } catch (error) {
    return next(error);
  }
}

export async function editar(req, res, next) {
  try {
    return success(res, await editarEntidad(req.validated.params.id, req.validated.body, req), 'Entidad actualizada');
  } catch (error) {
    return next(error);
  }
}

export async function cambiarEstado(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { activa } = req.validated.body;
    return success(res, await cambiarEstadoEntidad(id, activa, req), 'Estado de la entidad actualizado');
  } catch (error) {
    return next(error);
  }
}
