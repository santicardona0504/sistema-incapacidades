import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { aNumero } from '../../utils/dinero.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';

const includeConciliacion = {
  consolidadaPor: { select: { id: true, nombre: true } },
  validadaPor: { select: { id: true, nombre: true } },
  detalles: {
    include: {
      pago: {
        include: {
          entidad: { select: { id: true, nombre: true, tipo: true } },
          registradoPor: { select: { id: true, nombre: true } },
          cobro: {
            include: {
              incapacidad: {
                select: {
                  id: true,
                  codigo: true,
                  empleado: {
                    select: { id: true, identificacion: true, nombres: true, apellidos: true }
                  }
                }
              },
              radicacion: { select: { id: true, numeroRadicado: true, fechaRadicacion: true } }
            }
          }
        }
      }
    },
    orderBy: { creadoEn: 'asc' }
  }
};

export const ESTADO_VISIBLE = {
  EN_CONSOLIDACION: 'En consolidación',
  EN_REVISION: 'Pendiente de revisión',
  VALIDADA: 'Conciliada'
};

export function toConciliacionDto(conciliacion) {
  const detalles = (conciliacion.detalles ?? []).map((detalle) => ({
    id: detalle.id,
    pagoId: detalle.pagoId,
    valorConciliado: aNumero(detalle.valorConciliado),
    diferencia: aNumero(detalle.diferencia),
    observaciones: detalle.observaciones,
    creadoEn: detalle.creadoEn,
    pago: detalle.pago ? {
      id: detalle.pago.id,
      fechaPago: detalle.pago.fechaPago,
      valorPagado: aNumero(detalle.pago.valorPagado),
      referencia: detalle.pago.referencia,
      entidad: detalle.pago.entidad,
      registradoPor: detalle.pago.registradoPor,
      numeroSolicitud: detalle.pago.cobro?.numeroSolicitud,
      codigoIncapacidad: detalle.pago.cobro?.incapacidad?.codigo,
      numeroRadicado: detalle.pago.cobro?.radicacion?.numeroRadicado,
      empleado: detalle.pago.cobro?.incapacidad?.empleado ? {
        id: detalle.pago.cobro.incapacidad.empleado.id,
        identificacion: detalle.pago.cobro.incapacidad.empleado.identificacion,
        nombreCompleto: `${detalle.pago.cobro.incapacidad.empleado.nombres} ${detalle.pago.cobro.incapacidad.empleado.apellidos}`
      } : null
    } : null
  }));

  const totalPagado = detalles.reduce((suma, detalle) => suma + aNumero(detalle.pago?.valorPagado), 0);
  const totalConciliado = detalles.reduce((suma, detalle) => suma + aNumero(detalle.valorConciliado), 0);
  const totalDiferencia = Math.round((totalPagado - totalConciliado) * 100) / 100;

  return {
    id: conciliacion.id,
    periodo: conciliacion.periodo,
    fechaInicio: conciliacion.fechaInicio,
    fechaFin: conciliacion.fechaFin,
    estado: conciliacion.estado,
    estadoVisible: conciliacion.estado === 'VALIDADA' && totalDiferencia !== 0
      ? 'Con diferencias'
      : ESTADO_VISIBLE[conciliacion.estado],
    consolidadaPor: conciliacion.consolidadaPor,
    validadaPor: conciliacion.validadaPor,
    fechaValidacion: conciliacion.fechaValidacion,
    observaciones: conciliacion.observaciones,
    totalPagado,
    totalConciliado,
    totalDiferencia,
    totalDetalles: detalles.length,
    detalles,
    creadoEn: conciliacion.creadoEn,
    actualizadoEn: conciliacion.actualizadoEn
  };
}

function construirFiltros(filtros) {
  const where = {};

  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.periodo) {
    where.periodo = { contains: filtros.periodo, mode: 'insensitive' };
  }
  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.fechaInicio = {};
    if (filtros.fechaDesde) where.fechaInicio.gte = filtros.fechaDesde;
    if (filtros.fechaHasta) where.fechaInicio.lte = filtros.fechaHasta;
  }

  return where;
}

export async function listarConciliaciones(filtros = {}) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, conciliaciones] = await prisma.$transaction([
    prisma.conciliacion.count({ where }),
    prisma.conciliacion.findMany({
      where,
      include: includeConciliacion,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { creadoEn: 'desc' }
    })
  ]);

  return {
    conciliaciones: conciliaciones.map(toConciliacionDto),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function obtenerConciliacion(id) {
  const conciliacion = await prisma.conciliacion.findUnique({
    where: { id },
    include: includeConciliacion
  });

  if (!conciliacion) {
    throw new AppError(404, 'Conciliación no encontrada');
  }

  return toConciliacionDto(conciliacion);
}

export async function crearConciliacion(datos, req) {
  const duplicada = await prisma.conciliacion.findUnique({ where: { periodo: datos.periodo } });

  if (duplicada) {
    throw new AppError(409, 'Ya existe una conciliación para este periodo');
  }

  const conciliacion = await prisma.$transaction(async (tx) => {
    const creada = await tx.conciliacion.create({
      data: {
        periodo: datos.periodo,
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        estado: 'EN_REVISION',
        consolidadaPorId: req.usuario.id,
        observaciones: datos.observaciones ?? null
      },
      include: includeConciliacion
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'CONCILIACION_CREAR',
      entidad: 'CONCILIACION',
      entidadId: creada.id,
      detalles: { periodo: datos.periodo, fechaInicio: datos.fechaInicio, fechaFin: datos.fechaFin },
      req,
      client: tx
    });

    return creada;
  });

  return toConciliacionDto(conciliacion);
}

export async function agregarDetalle(id, datos, req) {
  const conciliacion = await prisma.conciliacion.findUnique({ where: { id } });

  if (!conciliacion) {
    throw new AppError(404, 'Conciliación no encontrada');
  }
  if (conciliacion.estado !== 'EN_REVISION') {
    throw new AppError(400, 'La conciliación ya fue validada y no admite cambios');
  }

  const pago = await prisma.pago.findUnique({
    where: { id: datos.pagoId },
    select: {
      id: true,
      fechaPago: true,
      valorPagado: true,
      cobro: {
        select: {
          incapacidad: { select: { codigo: true, empleado: { select: { nombres: true, apellidos: true } } } }
        }
      }
    }
  });

  if (!pago) {
    throw new AppError(404, 'Pago no encontrado');
  }

  if (pago.fechaPago < conciliacion.fechaInicio || pago.fechaPago > conciliacion.fechaFin) {
    throw new AppError(400, 'La fecha del pago está fuera del periodo de la conciliación', {
      fechaPago: pago.fechaPago,
      fechaInicio: conciliacion.fechaInicio,
      fechaFin: conciliacion.fechaFin
    });
  }

  const repetido = await prisma.detalleConciliacion.findUnique({
    where: { conciliacionId_pagoId: { conciliacionId: id, pagoId: datos.pagoId } }
  });

  if (repetido) {
    throw new AppError(409, 'Este pago ya está asociado a la conciliación', {
      conciliacionId: id,
      pagoId: datos.pagoId
    });
  }

  const diferencia = Math.round((aNumero(pago.valorPagado) - aNumero(datos.valorConciliado)) * 100) / 100;

  await prisma.$transaction(async (tx) => {
    await tx.detalleConciliacion.create({
      data: {
        conciliacionId: id,
        pagoId: datos.pagoId,
        valorConciliado: datos.valorConciliado,
        diferencia,
        observaciones: datos.observaciones ?? null
      }
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'CONCILIACION_AGREGAR_PAGO',
      entidad: 'CONCILIACION',
      entidadId: id,
      detalles: {
        pagoId: datos.pagoId,
        valorPagado: aNumero(pago.valorPagado),
        valorConciliado: aNumero(datos.valorConciliado),
        diferencia
      },
      req,
      client: tx
    });
  });

  return obtenerConciliacion(id);
}

export async function quitarDetalle(id, pagoId, req) {
  const conciliacion = await prisma.conciliacion.findUnique({ where: { id } });

  if (!conciliacion) {
    throw new AppError(404, 'Conciliación no encontrada');
  }
  if (conciliacion.estado !== 'EN_REVISION') {
    throw new AppError(400, 'La conciliación ya fue validada y no admite cambios');
  }

  const detalle = await prisma.detalleConciliacion.findUnique({
    where: { conciliacionId_pagoId: { conciliacionId: id, pagoId } }
  });

  if (!detalle) {
    throw new AppError(404, 'El pago no está asociado a esta conciliación');
  }

  await prisma.$transaction(async (tx) => {
    await tx.detalleConciliacion.delete({ where: { id: detalle.id } });
    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'CONCILIACION_QUITAR_PAGO',
      entidad: 'CONCILIACION',
      entidadId: id,
      detalles: { pagoId },
      req,
      client: tx
    });
  });

  return obtenerConciliacion(id);
}

export async function validarConciliacion(id, datos, req) {
  const conciliacion = await prisma.conciliacion.findUnique({
    where: { id },
    include: { detalles: true }
  });

  if (!conciliacion) {
    throw new AppError(404, 'Conciliación no encontrada');
  }
  if (conciliacion.estado !== 'EN_REVISION') {
    throw new AppError(400, 'La conciliación ya fue validada');
  }
  if (conciliacion.detalles.length === 0) {
    throw new AppError(400, 'Debe asociar al menos un pago antes de validar la conciliación');
  }

  const totalDiferencia = conciliacion.detalles.reduce(
    (suma, detalle) => suma + aNumero(detalle.diferencia),
    0
  );

  const actualizada = await prisma.$transaction(async (tx) => {
    const resultado = await tx.conciliacion.update({
      where: { id },
      data: {
        estado: 'VALIDADA',
        validadaPorId: req.usuario.id,
        fechaValidacion: new Date(),
        observaciones: datos.observaciones ?? conciliacion.observaciones
      },
      include: includeConciliacion
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'CONCILIACION_VALIDAR',
      entidad: 'CONCILIACION',
      entidadId: id,
      detalles: {
        periodo: conciliacion.periodo,
        totalDiferencia,
        observaciones: datos.observaciones ?? null
      },
      req,
      client: tx
    });

    return resultado;
  });

  return toConciliacionDto(actualizada);
}

export async function historialConciliacion(id) {
  const conciliacion = await prisma.conciliacion.findUnique({ where: { id }, select: { id: true } });

  if (!conciliacion) {
    throw new AppError(404, 'Conciliación no encontrada');
  }

  const eventos = await prisma.bitacoraAuditoria.findMany({
    where: { entidad: 'CONCILIACION', entidadId: id },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { creadoEn: 'desc' }
  });

  return eventos.map((evento) => ({
    id: evento.id,
    accion: evento.accion,
    detalles: evento.detalles,
    usuario: evento.usuario,
    direccionIp: evento.direccionIp,
    creadoEn: evento.creadoEn
  }));
}
