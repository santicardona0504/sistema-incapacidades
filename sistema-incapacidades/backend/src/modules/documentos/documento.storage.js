import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/api-response.js';

const EXTENSIONES_POR_MIME = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png'
};

export const rutaStorage = path.resolve(process.cwd(), env.DOCUMENT_STORAGE_PATH);

fs.mkdirSync(rutaStorage, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, rutaStorage),
  filename: (req, file, callback) => {
    const extension = EXTENSIONES_POR_MIME[file.mimetype];
    callback(null, `${randomUUID()}${extension}`);
  }
});

export const subirArchivo = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!EXTENSIONES_POR_MIME[file.mimetype]) {
      return callback(new AppError(415, 'Solo se permiten archivos PDF, JPG o PNG'));
    }
    return callback(null, true);
  }
}).single('archivo');

export function rutaSeguraArchivo(nombreArchivo) {
  const ruta = path.resolve(rutaStorage, nombreArchivo);

  if (!ruta.startsWith(`${rutaStorage}${path.sep}`)) {
    throw new AppError(400, 'Ruta de archivo no válida');
  }

  return ruta;
}

export async function eliminarArchivo(nombreArchivo) {
  if (!nombreArchivo) return;
  await fsp.unlink(rutaSeguraArchivo(nombreArchivo)).catch(() => {});
}
