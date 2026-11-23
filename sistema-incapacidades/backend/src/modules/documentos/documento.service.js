import fsp from 'node:fs/promises';
import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { eliminarArchivo, rutaSeguraArchivo } from './documento.storage.js';

const includeDocumento = {
  incapacidad: { select: { id: true, codigo: true, estado: true } },
  rechazo: { select: { id: true, causal: true } },
  subidoPor: { select: { id: true, nombre: true } }
};

function toDocumentoDto(documento) {
  return {
    id: documento.id,
    incapacidad: documento.incapacidad,
    rechazo: documento.rechazo,
    nombreOriginal: documento.nombreOriginal,
    mimeType: documento.mimeType,
    tamanoBytes: documento.tamanoBytes,
    tipo: documento.tipo,
    subidoPor: documento.subidoPor,
    creadoEn: documento.creadoEn
  };
}

function construirFiltros(filtros) {
  const where = {};

  if (filtros.incapacidadId !== undefined) where.incapacidadId = filtros.incapacidadId;
  if (filtros.rechazoId !== undefined) where.rechazoId = filtros.rechazoId;
  if (filtros.tipo) where.tipo = filtros.tipo;

  return where;
}

export async function listarDocumentos(filtros) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, documentos] = await prisma.$transaction([
    prisma.documento.count({ where }),
    prisma.documento.findMany({
      where,
      include: includeDocumento,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { creadoEn: 'desc' }
    })
  ]);

  return {
    documentos: documentos.map(toDocumentoDto),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function obtenerDocumento(id) {
  const documento = await prisma.documento.findUnique({
    where: { id },
    include: includeDocumento
  });

  if (!documento) {
    throw new AppError(404, 'Documento no encontrado');
  }

  return toDocumentoDto(documento);
}

export async function crearDocumento(incapacidadId, archivo, datos, req) {
  const incapacidad = await prisma.incapacidad.findUnique({
    where: { id: incapacidadId },
    select: { id: true }
  });

  if (!incapacidad) {
    throw new AppError(404, 'Incapacidad no encontrada');
  }

  if (datos.rechazoId) {
    const rechazo = await prisma.rechazo.findUnique({
      where: { id: datos.rechazoId },
      select: { id: true, incapacidadId: true }
    });

    if (!rechazo || rechazo.incapacidadId !== incapacidadId) {
      throw new AppError(400, 'El rechazo no pertenece a esta incapacidad');
    }
  }

  try {
    const documento = await prisma.$transaction(async (tx) => {
      const creado = await tx.documento.create({
        data: {
          incapacidadId,
          rechazoId: datos.rechazoId ?? null,
          subidoPorId: req.usuario.id,
          nombreOriginal: archivo.originalname,
          rutaAlmacenamiento: archivo.filename,
          mimeType: archivo.mimetype,
          tamanoBytes: archivo.size,
          tipo: datos.tipo
        },
        include: includeDocumento
      });

      await registrarAuditoria({
        usuarioId: req.usuario.id,
        accion: 'DOCUMENTO_SUBIR',
        entidad: 'DOCUMENTO',
        entidadId: creado.id,
        detalles: { incapacidadId, tipo: datos.tipo },
        req,
        client: tx
      });

      return creado;
    });

    return toDocumentoDto(documento);
  } catch (error) {
    await eliminarArchivo(archivo.filename);
    throw error;
  }
}

export async function prepararDescarga(id, req) {
  const documento = await prisma.documento.findUnique({
    where: { id },
    include: includeDocumento
  });

  if (!documento) {
    throw new AppError(404, 'Documento no encontrado');
  }

  const ruta = rutaSeguraArchivo(documento.rutaAlmacenamiento);
  const existe = await fsp.access(ruta).then(() => true).catch(() => false);

  if (!existe) {
    throw new AppError(404, 'El archivo físico no está disponible');
  }

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'DOCUMENTO_DESCARGAR',
    entidad: 'DOCUMENTO',
    entidadId: id,
    req
  });

  return {
    ruta,
    nombre: documento.nombreOriginal.replace(/[^\w.\- ]/g, '_')
  };
}
