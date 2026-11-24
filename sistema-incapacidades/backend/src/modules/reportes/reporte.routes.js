import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { reporteSchema } from './reporte.validation.js';
import * as controller from './reporte.controller.js';

export const reporteRoutes = Router();

reporteRoutes.use(requireAuth);
reporteRoutes.use(requirePermission('REPORTES_VER'));

const sinCuerpoSchema = z.object({});

reporteRoutes.get('/tipos', validate(sinCuerpoSchema), controller.listarTipos);
reporteRoutes.get('/:tipo', validate(reporteSchema), controller.exportar);
