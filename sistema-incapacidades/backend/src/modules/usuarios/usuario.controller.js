import { success } from '../../utils/api-response.js';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  editarUsuario,
  desactivarUsuario
} from './usuario.service.js';

export async function listar(req, res, next) {
  try {
    const datos = await listarUsuarios(req.validated.query);
    return success(res, datos, 'Usuarios consultados');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    const usuario = await obtenerUsuario(req.validated.params.id);
    return success(res, usuario, 'Usuario encontrado');
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    const usuario = await crearUsuario(req.validated.body, req);
    return success(res, usuario, 'Usuario creado', 201);
  } catch (error) {
    return next(error);
  }
}

export async function editar(req, res, next) {
  try {
    const usuario = await editarUsuario(req.validated.params.id, req.validated.body, req);
    return success(res, usuario, 'Usuario actualizado');
  } catch (error) {
    return next(error);
  }
}

export async function desactivar(req, res, next) {
  try {
    const usuario = await desactivarUsuario(req.validated.params.id, req);
    return success(res, usuario, 'Usuario desactivado');
  } catch (error) {
    return next(error);
  }
}
