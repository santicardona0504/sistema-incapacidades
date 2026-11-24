import { success } from '../../utils/api-response.js';
import {
  resumenDashboard,
  graficasDashboard,
  ultimosRegistrosDashboard
} from './dashboard.service.js';

export async function resumen(req, res, next) {
  try {
    return success(res, await resumenDashboard(), 'Resumen del dashboard consultado');
  } catch (error) {
    return next(error);
  }
}

export async function graficas(req, res, next) {
  try {
    return success(res, await graficasDashboard(), 'Gráficas del dashboard consultadas');
  } catch (error) {
    return next(error);
  }
}

export async function ultimos(req, res, next) {
  try {
    return success(res, await ultimosRegistrosDashboard(), 'Últimos registros consultados');
  } catch (error) {
    return next(error);
  }
}
