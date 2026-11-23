import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { validarTransicion, registrarCambioEstado } from '../incapacidades/estado.service.js';

const includeRadicacion = {
  incapacidad: {
    select: {
      id: true,
      codigo: true,
      estado: true,
      empleado: {
        select: {
          id: true,
          identificacion: true,
          nombres: true,
          apellidos: true
        }
      }
    }
  },
  entidad: { select: { id: true, nombre: true, tipo: true } },
  _count: { select: { rechazos: true } }
};

export function toRadicacionDto(radicacion) {
  return {
    id: radicacion.id,
    incapacidadId: radicacion.incapacidadId,
    codigoIncapacidad: radicacion.incapacidad?.codigo,
    numeroRadicado: radicacion.numeroRadicado,
    fechaTranscripcion: radicacion.fechaTranscripcion,
    fechaRadicacion: radicacion.fechaRadicacion,
    responsable: radicacion.responsable,
    observaciones: radicacion.observaciones,
    entidad: radicacion.entidad,
    avance: {
      estadoActual: radicacion.incapacidad?.estado ?? null,
      totalRechazos: radicacion._count?.rechazos ?? 0
    },
    creadoEn: radicacion.creadoEn,
    actualizadoEn: radicacion.actualizadoEn
  };
}

function construirFiltros(filtros) {
  const where = {};

  if (filtros.incapacidadId !== undefined) where.incapacidadId = filtros.incapacidadId;
  if (filtros.entidadId !== undefined) where.entidadId = filtros.entidadId;

  if (filtros.numeroRadicado) {
    where.numeroRadicado = { contains: filtros.numeroRadicado, mode: 'insensitive' };
  }

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.fechaTranscripcion = {};
    if (filtros.fechaDesde) where.fechaTranscripcion.gte = filtros.fechaDesde;
    if (filtros.fechaHasta) where.fechaTranscripcion.lte = filtros.fechaHasta;
  }

  return where;
}

export async function listarRadicaciones(filtros) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, radicaciones] = await prisma.$transaction([
    prisma.radicacion.count({ where }),
    prisma.radicacion.findMany({
      where,
      include: includeRadicacion,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { creadoEn: 'desc' }
    })
  ]);

  return {
    radicaciones: radicaciones.map(toRadicacionDto),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function obtenerRadicacion(id) {
  const radicacion = await prisma.radicacion.findUnique({
    where: { id },
    include: includeRadicacion
  });

  if (!radicacion) {
    throw new AppError(404, 'Radicación no encontrada');
  }

  return toRadicacionDto(radicacion);
}

export async function crearRadicacion(incapacidadId, datos, req) {
  const incapacidad = await prisma.incapacidad.findUnique({
    where: { id: incapacidadId }
  });

  if (!incapacidad) {
    throw new AppError(404, 'Incapacidad no encontrada');
  }

  validarTransicion(incapacidad.estado, 'TRANSCRITA');

  const entidadId = datos.entidadId ?? incapacidad.entidadId;

  const entidad = await prisma.entidadSalud.findUnique({ where: { id: entidadId } });

  if (!entidad) {
    throw new AppError(404, 'Entidad EPS/ARL no encontrada');
  }

  const duplicada = await prisma.radicacion.findUnique({
    where: {
      entidadId_numeroRadicado: {
        entidadId,
        numeroRadicado: datos.numeroRadicado
      }
    }
  });

  if (duplicada) {
    throw new AppError(409, 'El número de radicado ya existe para esta entidad');
  }

  const radicacion = await prisma.$transaction(async (tx) => {
    const creada = await tx.radicacion.create({
      data: {
        incapacidadId,
        entidadId,
        fechaTranscripcion: datos.fechaTranscripcion,
        numeroRadicado: datos.numeroRadicado,
        fechaRadicacion: datos.fechaRadicacion,
        responsable: datos.responsable,
        observaciones: datos.observaciones
      },
      include: includeRadicacion
    });

    await tx.incapacidad.update({
      where: { id: incapacidadId },
      data: { estado: 'TRANSCRITA' }
    });

    await registrarCambioEstado(tx, {
      incapacidadId,
      estadoAnterior: incapacidad.estado,
      estadoNuevo: 'TRANSCRITA',
      usuarioId: req.usuario.id,
      observaciones: datos.observaciones ?? `Radicado ${datos.numeroRadicado}`
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'RADICACION_CREAR',
      entidad: 'RADICACION',
      entidadId: creada.id,
      detalles: { incapacidadId, numeroRadicado: datos.numeroRadicado },
      req,
      client: tx
    });

    return creada;
  });

  return toRadicacionDto(radicacion);
}
