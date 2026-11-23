import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  listarEmpleadosSchema,
  crearEmpleadoSchema,
  editarEmpleadoSchema,
  cambiarEstadoSchema,
  idEmpleadoSchema
} from './empleado.validation.js';
import * as controller from './empleado.controller.js';

export const empleadoRoutes = Router();

empleadoRoutes.use(requireAuth);

empleadoRoutes.get('/', requirePermission('EMPLEADOS_VER'), validate(listarEmpleadosSchema), controller.listar);
empleadoRoutes.get('/:id', requirePermission('EMPLEADOS_VER'), validate(idEmpleadoSchema), controller.obtener);
empleadoRoutes.get(
  '/:id/incapacidades',
  requirePermission('EMPLEADOS_VER', 'INCAPACIDADES_VER'),
  validate(idEmpleadoSchema),
  controller.historial
);
empleadoRoutes.post('/', requirePermission('EMPLEADOS_CREAR'), validate(crearEmpleadoSchema), controller.crear);
empleadoRoutes.patch('/:id', requirePermission('EMPLEADOS_EDITAR'), validate(editarEmpleadoSchema), controller.editar);
empleadoRoutes.patch(
  '/:id/estado',
  requirePermission('EMPLEADOS_DESACTIVAR'),
  validate(cambiarEstadoSchema),
  controller.cambiarEstado
);
