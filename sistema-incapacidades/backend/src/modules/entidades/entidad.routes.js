import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarEntidadesSchema,
  crearEntidadSchema,
  editarEntidadSchema,
  cambiarEstadoEntidadSchema,
  idEntidadSchema
} from './entidad.validation.js';
import * as controller from './entidad.controller.js';

export const entidadRoutes = Router();

entidadRoutes.use(requireAuth);

entidadRoutes.get('/', requirePermission('ENTIDADES_VER'), validate(listarEntidadesSchema), controller.listar);
entidadRoutes.get('/:id', requirePermission('ENTIDADES_VER'), validate(idEntidadSchema), controller.obtener);
entidadRoutes.post('/', requirePermission('ENTIDADES_CREAR'), validate(crearEntidadSchema), controller.crear);
entidadRoutes.patch('/:id', requirePermission('ENTIDADES_EDITAR'), validate(editarEntidadSchema), controller.editar);
entidadRoutes.patch('/:id/estado', requirePermission('ENTIDADES_DESACTIVAR'), validate(cambiarEstadoEntidadSchema), controller.cambiarEstado);
