import { AppError } from '../../utils/api-response.js';
import { enviarCsv } from '../../utils/csv.js';
import { obtenerReporte, tiposReporte } from './reporte.service.js';

export async function listarTipos(req, res, next) {
  try {
    return res.status(200).json({
      ok: true,
      message: 'Tipos de reporte disponibles',
      data: tiposReporte()
    });
  } catch (error) {
    return next(error);
  }
}

export async function exportar(req, res, next) {
  try {
    const reporte = await obtenerReporte(req.params.tipo, req.validated.query);

    if (!reporte) {
      throw new AppError(404, 'Tipo de reporte no encontrado', { disponibles: tiposReporte() });
    }

    if (req.validated.query.formato === 'csv') {
      return enviarCsv(res, `${reporte.nombre}.csv`, reporte.columnas, reporte.filas);
    }

    return res.status(200).json({
      ok: true,
      message: 'Reporte generado',
      data: reporte
    });
  } catch (error) {
    return next(error);
  }
}
