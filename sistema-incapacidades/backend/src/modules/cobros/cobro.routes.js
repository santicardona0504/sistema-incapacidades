import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarCobrosSchema,
  idCobroSchema,
  crearCobroSchema,
  editarCobroSchema,
  crearGestionSchema
} from './cobro.validation.js';
import * as controller from './cobro.controller.js';

export const cobroRoutes = Router();

cobroRoutes.use(requireAuth);

const idIncapacidadSchema = z.object({
  params: z.object({ incapacidadId: z.coerce.number().int().positive() })
});

cobroRoutes.get('/incapacidad/:incapacidadId/radicaciones', requirePermission('COBROS_VER'), validate(idIncapacidadSchema), controller.radicaciones);
cobroRoutes.get('/pendientes', requirePermission('COBROS_VER'), validate(listarCobrosSchema), controller.pendientes);
cobroRoutes.get('/', requirePermission('COBROS_VER'), validate(listarCobrosSchema), controller.listar);
cobroRoutes.post('/', requirePermission('COBROS_CREAR'), validate(crearCobroSchema), controller.crear);
cobroRoutes.get('/:id/gestiones', requirePermission('COBROS_VER'), validate(idCobroSchema), controller.gestiones);
cobroRoutes.post('/:id/gestiones', requirePermission('COBROS_CREAR'), validate(crearGestionSchema), controller.registrarGestion);
cobroRoutes.get('/:id', requirePermission('COBROS_VER'), validate(idCobroSchema), controller.obtener);
cobroRoutes.patch('/:id', requirePermission('COBROS_CREAR'), validate(editarCobroSchema), controller.editar);
