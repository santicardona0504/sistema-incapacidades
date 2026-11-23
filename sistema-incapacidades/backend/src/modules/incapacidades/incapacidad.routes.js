import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarIncapacidadesSchema,
  crearIncapacidadSchema,
  editarIncapacidadSchema,
  cambiarEstadoSchema,
  crearRechazoSchema,
  editarRechazoSchema,
  idIncapacidadSchema,
  historialPorIncapacidadSchema
} from './incapacidad.validation.js';
import * as controller from './incapacidad.controller.js';

export const incapacidadRoutes = Router();

incapacidadRoutes.use(requireAuth);

incapacidadRoutes.get('/', requirePermission('INCAPACIDADES_VER'), validate(listarIncapacidadesSchema), controller.listar);
incapacidadRoutes.post('/', requirePermission('INCAPACIDADES_CREAR'), validate(crearIncapacidadSchema), controller.crear);

incapacidadRoutes.get(
  '/:id/historial',
  requirePermission('HISTORIAL_VER'),
  validate(historialPorIncapacidadSchema),
  controller.historial
);
incapacidadRoutes.get(
  '/:id/rechazos',
  requirePermission('INCAPACIDADES_VER'),
  validate(idIncapacidadSchema),
  controller.listarRechazosDeIncapacidad
);
incapacidadRoutes.post(
  '/:id/rechazos',
  requirePermission('INCAPACIDADES_EDITAR'),
  validate(crearRechazoSchema),
  controller.registrarRechazoDeIncapacidad
);
incapacidadRoutes.patch(
  '/rechazos/:id',
  requirePermission('INCAPACIDADES_EDITAR'),
  validate(editarRechazoSchema),
  controller.actualizarCorreccion
);
incapacidadRoutes.patch(
  '/:id/estado',
  requirePermission('INCAPACIDADES_EDITAR'),
  validate(cambiarEstadoSchema),
  controller.cambiar
);
incapacidadRoutes.get('/:id', requirePermission('INCAPACIDADES_VER'), validate(idIncapacidadSchema), controller.obtener);
incapacidadRoutes.patch('/:id', requirePermission('INCAPACIDADES_EDITAR'), validate(editarIncapacidadSchema), controller.editar);
