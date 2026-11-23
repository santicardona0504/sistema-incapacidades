import { success } from '../../utils/api-response.js';
import {
  listarRoles,
  obtenerRol,
  listarPermisos,
  asignarPermisos
} from './roles.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarRoles(), 'Roles consultados');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerRol(req.validated.params.id), 'Rol encontrado');
  } catch (error) {
    return next(error);
  }
}

export async function permisos(req, res, next) {
  try {
    return success(res, await listarPermisos(), 'Permisos consultados');
  } catch (error) {
    return next(error);
  }
}

export async function asignar(req, res, next) {
  try {
    const rol = await asignarPermisos(
      req.validated.params.id,
      req.validated.body.permisoIds,
      req
    );
    return success(res, rol, 'Permisos asignados');
  } catch (error) {
    return next(error);
  }
}
