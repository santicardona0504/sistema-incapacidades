import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { validarTransicion, registrarCambioEstado } from './estado.service.js';
import { toRechazoDto } from './incapacidad.dto.js';

const includeRechazo = {
  registradoPor: { select: { id: true, nombre: true } },
  _count: { select: { documentos: true } }
};

export async function listarRechazos(incapacidadId) {
  const incapacidad = await prisma.incapacidad.findUnique({
    where: { id: incapacidadId },
    select: { id: true }
  });

  if (!incapacidad) {
    throw new AppError(404, 'Incapacidad no encontrada');
  }

  const rechazos = await prisma.rechazo.findMany({
    where: { incapacidadId },
    include: includeRechazo,
    orderBy: { creadoEn: 'desc' }
  });

  return rechazos.map(toRechazoDto);
}

export async function registrarRechazo(incapacidadId, datos, req) {
  const incapacidad = await prisma.incapacidad.findUnique({
    where: { id: incapacidadId }
  });

  if (!incapacidad) {
    throw new AppError(404, 'Incapacidad no encontrada');
  }

  validarTransicion(incapacidad.estado, 'RECHAZADA');

  if (datos.radicacionId) {
    const radicacion = await prisma.radicacion.findUnique({
      where: { id: datos.radicacionId },
      select: { id: true, incapacidadId: true }
    });

    if (!radicacion || radicacion.incapacidadId !== incapacidadId) {
      throw new AppError(400, 'La radicación no pertenece a esta incapacidad');
    }
  }

  const { observaciones, ...datosRechazo } = datos;

  const rechazo = await prisma.$transaction(async (tx) => {
    const creado = await tx.rechazo.create({
      data: {
        ...datosRechazo,
        incapacidadId,
        registradoPorId: req.usuario.id
      },
      include: includeRechazo
    });

    await tx.incapacidad.update({
      where: { id: incapacidadId },
      data: { estado: 'RECHAZADA' }
    });

    await registrarCambioEstado(tx, {
      incapacidadId,
      estadoAnterior: incapacidad.estado,
      estadoNuevo: 'RECHAZADA',
      usuarioId: req.usuario.id,
      observaciones: observaciones ?? datosRechazo.causal
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'RECHAZO_REGISTRAR',
      entidad: 'RECHAZO',
      entidadId: creado.id,
      detalles: { incapacidadId, radicacionId: datosRechazo.radicacionId ?? null },
      req,
      client: tx
    });

    return creado;
  });

  return toRechazoDto(rechazo);
}

export async function actualizarAccionesCorrectivas(rechazoId, accionesCorrectivas, req) {
  const rechazo = await prisma.rechazo.findUnique({ where: { id: rechazoId } });

  if (!rechazo) {
    throw new AppError(404, 'Rechazo no encontrado');
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.rechazo.update({
      where: { id: rechazoId },
      data: { accionesCorrectivas },
      include: includeRechazo
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'RECHAZO_CORRECCION',
      entidad: 'RECHAZO',
      entidadId: rechazoId,
      req,
      client: tx
    });

    return resultado;
  });

  return toRechazoDto(actualizado);
}
