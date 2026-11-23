import { success } from '../../utils/api-response.js';
import {
  listarEmpleados,
  obtenerEmpleado,
  historialIncapacidades,
  crearEmpleado,
  editarEmpleado,
  cambiarEstadoEmpleado
} from './empleado.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarEmpleados(req.validated.query), 'Empleados consultados');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerEmpleado(req.validated.params.id), 'Empleado encontrado');
  } catch (error) {
    return next(error);
  }
}

export async function historial(req, res, next) {
  try {
    const datos = await historialIncapacidades(req.validated.params.id);
    return success(res, datos, 'Historial de incapacidades consultado');
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    return success(res, await crearEmpleado(req.validated.body, req), 'Empleado creado', 201);
  } catch (error) {
    return next(error);
  }
}

export async function editar(req, res, next) {
  try {
    const empleado = await editarEmpleado(req.validated.params.id, req.validated.body, req);
    return success(res, empleado, 'Empleado actualizado');
  } catch (error) {
    return next(error);
  }
}

export async function cambiarEstado(req, res, next) {
  try {
    const empleado = await cambiarEstadoEmpleado(
      req.validated.params.id,
      req.validated.body.activo,
      req
    );
    return success(res, empleado, 'Estado del empleado actualizado');
  } catch (error) {
    return next(error);
  }
}
