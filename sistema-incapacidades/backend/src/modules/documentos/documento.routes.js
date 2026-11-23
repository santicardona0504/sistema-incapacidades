import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { subirArchivo } from './documento.storage.js';
import {
  listarDocumentosSchema,
  crearDocumentoSchema,
  idDocumentoSchema
} from './documento.validation.js';
import * as controller from './documento.controller.js';

export const documentoRoutes = Router();

documentoRoutes.use(requireAuth);

documentoRoutes.get('/', requirePermission('DOCUMENTOS_VER'), validate(listarDocumentosSchema), controller.listar);
documentoRoutes.post(
  '/incapacidad/:incapacidadId',
  requirePermission('DOCUMENTOS_SUBIR'),
  subirArchivo,
  controller.crear
);
documentoRoutes.get(
  '/:id/descargar',
  requirePermission('DOCUMENTOS_DESCARGAR'),
  validate(idDocumentoSchema),
  controller.descargar
);
documentoRoutes.get('/:id', requirePermission('DOCUMENTOS_VER'), validate(idDocumentoSchema), controller.obtener);
