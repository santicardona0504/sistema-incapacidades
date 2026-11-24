import { z } from 'zod';
import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarAlertasSchema,
  idAlertaSchema,
  marcarTodasSchema
} from './alerta.validation.js';
import * as controller from './alerta.controller.js';

export const alertaRoutes = Router();

alertaRoutes.use(requireAuth);

const sinCuerpoSchema = z.object({});

alertaRoutes.get('/resumen', requirePermission('ALERTAS_VER'), validate(sinCuerpoSchema), controller.resumen);
alertaRoutes.get('/', requirePermission('ALERTAS_VER'), validate(listarAlertasSchema), controller.listar);
alertaRoutes.post('/generar', requirePermission('ALERTAS_VER'), validate(sinCuerpoSchema), controller.generar);
alertaRoutes.patch('/leidas', requirePermission('ALERTAS_VER'), validate(marcarTodasSchema), controller.marcarTodas);
alertaRoutes.patch('/:id/leida', requirePermission('ALERTAS_VER'), validate(idAlertaSchema), controller.marcar);
