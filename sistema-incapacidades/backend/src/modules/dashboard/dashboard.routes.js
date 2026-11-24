import { z } from 'zod';
import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as controller from './dashboard.controller.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
dashboardRoutes.use(requirePermission('INCAPACIDADES_VER'));

const sinCuerpoSchema = z.object({});

dashboardRoutes.get('/resumen', validate(sinCuerpoSchema), controller.resumen);
dashboardRoutes.get('/graficas', validate(sinCuerpoSchema), controller.graficas);
dashboardRoutes.get('/ultimos-registros', validate(sinCuerpoSchema), controller.ultimos);
