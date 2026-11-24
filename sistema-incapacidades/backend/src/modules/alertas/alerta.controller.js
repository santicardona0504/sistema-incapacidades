import { success } from '../../utils/api-response.js';
import {
  listarAlertas,
  resumenAlertas,
  generarAlertas,
  marcarLeida,
  marcarTodasLeidas
} from './alerta.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarAlertas(req.validated.query), 'Alertas consultadas');
  } catch (error) {
    return next(error);
  }
}

export async function resumen(req, res, next) {
  try {
    return success(res, await resumenAlertas(), 'Resumen de alertas consultado');
  } catch (error) {
    return next(error);
  }
}

export async function generar(req, res, next) {
  try {
    return success(res, await generarAlertas(req), 'Alertas generadas');
  } catch (error) {
    return next(error);
  }
}

export async function marcar(req, res, next) {
  try {
    return success(res, await marcarLeida(req.validated.params.id, req), 'Alerta marcada como leída');
  } catch (error) {
    return next(error);
  }
}

export async function marcarTodas(req, res, next) {
  try {
    return success(res, await marcarTodasLeidas(req.validated.body, req), 'Alertas marcadas como leídas');
  } catch (error) {
    return next(error);
  }
}
