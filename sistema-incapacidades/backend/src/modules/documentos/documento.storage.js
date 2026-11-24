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

const FIRMAS_POR_MIME = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]
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

export async function validarFirmaArchivo(archivo) {
  if (!archivo?.path) {
    throw new AppError(400, 'No fue posible validar el archivo cargado');
  }

  const firmas = FIRMAS_POR_MIME[archivo.mimetype] ?? [];
  const longitud = Math.max(0, ...firmas.map((firma) => firma.length));
  const manejador = await fsp.open(archivo.path, 'r');

  try {
    const buffer = Buffer.alloc(longitud);
    const { bytesRead } = await manejador.read(buffer, 0, longitud, 0);
    const contenido = buffer.subarray(0, bytesRead);
    const coincide = firmas.some((firma) => contenido.subarray(0, firma.length).equals(Buffer.from(firma)));

    if (!coincide) {
      throw new AppError(415, 'El contenido del archivo no coincide con su tipo declarado');
    }
  } finally {
    await manejador.close();
  }
}

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
