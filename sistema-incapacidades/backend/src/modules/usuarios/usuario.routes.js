import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarUsuariosSchema,
  crearUsuarioSchema,
  editarUsuarioSchema,
  idUsuarioSchema
} from './usuario.validation.js';
import * as controller from './usuario.controller.js';

export const usuarioRoutes = Router();

usuarioRoutes.use(requireAuth);

usuarioRoutes.get('/', requirePermission('USUARIOS_VER'), validate(listarUsuariosSchema), controller.listar);
usuarioRoutes.get('/:id', requirePermission('USUARIOS_VER'), validate(idUsuarioSchema), controller.obtener);
usuarioRoutes.post('/', requirePermission('USUARIOS_CREAR'), validate(crearUsuarioSchema), controller.crear);
usuarioRoutes.patch('/:id', requirePermission('USUARIOS_EDITAR'), validate(editarUsuarioSchema), controller.editar);
usuarioRoutes.delete('/:id', requirePermission('USUARIOS_DESACTIVAR'), validate(idUsuarioSchema), controller.desactivar);
