import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { listarAuditoriaSchema } from './auditoria.validation.js';
import * as controller from './auditoria.controller.js';

export const auditoriaRoutes = Router();

auditoriaRoutes.use(requireAuth);
auditoriaRoutes.get('/', requirePermission('AUDITORIA_VER'), validate(listarAuditoriaSchema), controller.listar);
