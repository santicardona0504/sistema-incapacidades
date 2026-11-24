import { AppError, success } from '../../utils/api-response.js';
import { crearDocumentoSchema } from './documento.validation.js';
import { eliminarArchivo, validarFirmaArchivo } from './documento.storage.js';
import {
  listarDocumentos,
  obtenerDocumento,
  crearDocumento,
  prepararDescarga
} from './documento.service.js';

export async function listar(req, res, next) {
  try {
    return success(res, await listarDocumentos(req.validated.query), 'Documentos consultados');
  } catch (error) {
    return next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    return success(res, await obtenerDocumento(req.validated.params.id), 'Documento encontrado');
  } catch (error) {
    return next(error);
  }
}

export async function crear(req, res, next) {
  try {
    const resultado = crearDocumentoSchema.safeParse({
      params: req.params,
      body: req.body
    });

    if (!resultado.success) {
      const detalles = resultado.error.issues.map((issue) => ({
        campo: issue.path.join('.') || 'general',
        mensaje: issue.message
      }));
      throw new AppError(400, 'Datos inválidos', detalles);
    }

    if (!req.file) {
      throw new AppError(400, 'Debe adjuntar un archivo en el campo "archivo"');
    }

    await validarFirmaArchivo(req.file);

    const documento = await crearDocumento(
      resultado.data.params.incapacidadId,
      req.file,
      resultado.data.body,
      req
    );

    return success(res, documento, 'Documento adjuntado', 201);
  } catch (error) {
    if (error instanceof AppError && req.file?.filename) {
      await eliminarArchivo(req.file.filename);
    }
    return next(error);
  }
}

export async function descargar(req, res, next) {
  try {
    const archivo = await prepararDescarga(req.validated.params.id, req);

    return res.download(archivo.ruta, archivo.nombre, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    return next(error);
  }
}
