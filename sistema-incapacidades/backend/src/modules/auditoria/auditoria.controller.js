import { success } from '../../utils/api-response.js';
import { listarAuditoria } from './auditoria.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarAuditoria(req.validated.query), 'Bitácora de auditoría consultada');
  } catch (error) {
    return next(error);
  }
}
