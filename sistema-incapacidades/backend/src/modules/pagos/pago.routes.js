import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarPagosSchema,
  idPagoSchema,
  crearPagoSchema,
  adjuntarSoporteSchema
} from './pago.validation.js';
import * as controller from './pago.controller.js';

export const pagoRoutes = Router();

pagoRoutes.use(requireAuth);

pagoRoutes.get('/pendientes', requirePermission('PAGOS_VER'), validate(listarPagosSchema), controller.pendientes);
pagoRoutes.get('/', requirePermission('PAGOS_VER'), validate(listarPagosSchema), controller.listar);
pagoRoutes.post('/', requirePermission('PAGOS_CREAR'), validate(crearPagoSchema), controller.crear);
pagoRoutes.patch('/:id/soporte', requirePermission('PAGOS_CREAR'), validate(adjuntarSoporteSchema), controller.soporte);
pagoRoutes.get('/:id', requirePermission('PAGOS_VER'), validate(idPagoSchema), controller.obtener);
