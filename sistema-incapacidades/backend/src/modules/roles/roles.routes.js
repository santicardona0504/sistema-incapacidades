import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { idRolSchema, asignarPermisosSchema } from './roles.validation.js';
import * as controller from './roles.controller.js';

export const rolesRoutes = Router();

rolesRoutes.use(requireAuth);

rolesRoutes.get('/roles', requirePermission('ROLES_VER'), controller.listar);
rolesRoutes.get('/permisos', requirePermission('PERMISOS_VER'), controller.permisos);
rolesRoutes.get('/roles/:id', requirePermission('ROLES_VER'), validate(idRolSchema), controller.obtener);
rolesRoutes.patch(
  '/roles/:id/permisos',
  requirePermission('PERMISOS_ASIGNAR'),
  validate(asignarPermisosSchema),
  controller.asignar
);
