import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { listarHistorialSchema } from './historial.validation.js';
import * as controller from './historial.controller.js';

export const historialRoutes = Router();

historialRoutes.use(requireAuth);

historialRoutes.get('/', requirePermission('HISTORIAL_VER'), validate(listarHistorialSchema), controller.listar);
