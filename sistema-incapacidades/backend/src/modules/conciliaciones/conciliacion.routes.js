import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarConciliacionesSchema,
  idConciliacionSchema,
  crearConciliacionSchema,
  agregarDetalleSchema,
  detalleParamSchema,
  validarConciliacionSchema
} from './conciliacion.validation.js';
import * as controller from './conciliacion.controller.js';

export const conciliacionRoutes = Router();

conciliacionRoutes.use(requireAuth);

conciliacionRoutes.get('/', requirePermission('CONCILIACIONES_VER'), validate(listarConciliacionesSchema), controller.listar);
conciliacionRoutes.post('/', requirePermission('CONCILIACIONES_CONSOLIDAR'), validate(crearConciliacionSchema), controller.crear);
conciliacionRoutes.get('/:id/historial', requirePermission('CONCILIACIONES_VER'), validate(idConciliacionSchema), controller.historial);
conciliacionRoutes.post('/:id/detalles', requirePermission('CONCILIACIONES_CONSOLIDAR'), validate(agregarDetalleSchema), controller.agregar);
conciliacionRoutes.delete('/:id/detalles/:pagoId', requirePermission('CONCILIACIONES_CONSOLIDAR'), validate(detalleParamSchema), controller.quitar);
conciliacionRoutes.patch('/:id/validar', requirePermission('CONCILIACIONES_VALIDAR'), validate(validarConciliacionSchema), controller.validar);
conciliacionRoutes.get('/:id', requirePermission('CONCILIACIONES_VER'), validate(idConciliacionSchema), controller.obtener);
