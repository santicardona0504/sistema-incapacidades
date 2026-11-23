import multer from 'multer';
import { Prisma } from '@prisma/client';
import { AppError, failure } from '../utils/api-response.js';

export function notFoundHandler(req, res) {
  return failure(res, 404, 'Ruta no encontrada', { ruta: req.originalUrl });
}

function normalizarError(error) {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message, details: error.details };
  }

  if (error instanceof multer.MulterError) {
    const mensajes = {
      LIMIT_FILE_SIZE: 'El archivo supera el tamaño máximo permitido',
      LIMIT_UNEXPECTED_FILE: 'El campo de archivo no esperado debe llamarse "archivo"',
      LIMIT_FILE_COUNT: 'Solo se permite adjuntar un archivo'
    };

    return {
      statusCode: error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
      message: mensajes[error.code] ?? 'Error al procesar el archivo'
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return {
        statusCode: 409,
        message: 'El valor ya existe',
        details: { campos: error.meta?.target }
      };
    }

    if (error.code === 'P2025') {
      return { statusCode: 404, message: 'Registro no encontrado' };
    }

    if (error.code === 'P2003') {
      return { statusCode: 400, message: 'La referencia enviada no es válida' };
    }
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return { statusCode: 400, message: 'El cuerpo de la solicitud no es un JSON válido' };
  }

  return { statusCode: 500, message: 'Error interno del servidor' };
}

export function errorHandler(error, req, res, next) {
  const { statusCode, message, details } = normalizarError(error);

  if (statusCode >= 500) {
    console.error(error);
  }

  return failure(res, statusCode, message, details);
}
