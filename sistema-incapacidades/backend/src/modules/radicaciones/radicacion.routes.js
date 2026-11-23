import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarRadicacionesSchema,
  crearRadicacionSchema,
  idRadicacionSchema
} from './radicacion.validation.js';
import * as controller from './radicacion.controller.js';

export const radicacionRoutes = Router();

radicacionRoutes.use(requireAuth);

radicacionRoutes.get('/', requirePermission('RADICACIONES_VER'), validate(listarRadicacionesSchema), controller.listar);
radicacionRoutes.get('/:id', requirePermission('RADICACIONES_VER'), validate(idRadicacionSchema), controller.obtener);
radicacionRoutes.post(
  '/incapacidad/:incapacidadId',
  requirePermission('RADICACIONES_CREAR'),
  validate(crearRadicacionSchema),
  controller.crear
);
