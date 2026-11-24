import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { aNumero } from '../../utils/dinero.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { saldoCobro, listarCobrosPendientes } from '../cobros/cobro.service.js';
import { validarTransicion, registrarCambioEstado } from '../incapacidades/estado.service.js';

const includePago = {
  cobro: {
    include: {
      incapacidad: {
        select: {
          id: true,
          codigo: true,
          estado: true,
          empleado: {
            select: { id: true, identificacion: true, nombres: true, apellidos: true }
          },
          entidad: { select: { id: true, nombre: true, tipo: true } }
        }
      },
      radicacion: {
        select: {
          id: true,
          numeroRadicado: true,
          fechaTranscripcion: true,
          fechaRadicacion: true
        }
      }
    }
  },
  entidad: { select: { id: true, nombre: true, tipo: true } },
  soporteDocumento: {
    select: { id: true, nombreOriginal: true, mimeType: true, tipo: true, tamanoBytes: true }
  },
  registradoPor: { select: { id: true, nombre: true } }
};

export function toPagoDto(pago, saldoCobroDespues = null) {
  return {
    id: pago.id,
    fechaPago: pago.fechaPago,
    valorPagado: aNumero(pago.valorPagado),
    referencia: pago.referencia,
    saldoCobroDespues,
    cobro: pago.cobro ? {
      id: pago.cobro.id,
      numeroSolicitud: pago.cobro.numeroSolicitud,
      estado: pago.cobro.estado,
      valorReconocido: aNumero(pago.cobro.valorReconocido),
      incapacidad: pago.cobro.incapacidad ? {
        id: pago.cobro.incapacidad.id,
        codigo: pago.cobro.incapacidad.codigo,
        estado: pago.cobro.incapacidad.estado,
        empleado: pago.cobro.incapacidad.empleado ? {
          id: pago.cobro.incapacidad.empleado.id,
          identificacion: pago.cobro.incapacidad.empleado.identificacion,
          nombreCompleto: `${pago.cobro.incapacidad.empleado.nombres} ${pago.cobro.incapacidad.empleado.apellidos}`
        } : null
      } : null,
      radicacion: pago.cobro.radicacion
    } : null,
    entidad: pago.entidad,
    soporteDocumento: pago.soporteDocumento,
    registradoPor: pago.registradoPor,
    creadoEn: pago.creadoEn,
    actualizadoEn: pago.actualizadoEn
  };
}

function construirFiltros(filtros) {
  const where = {};

  if (filtros.cobroId) where.cobroId = filtros.cobroId;
  if (filtros.entidadId) where.entidadId = filtros.entidadId;
  if (filtros.referencia) {
    where.referencia = { contains: filtros.referencia, mode: 'insensitive' };
  }

  if (filtros.empleadoId || filtros.incapacidadId) {
    where.cobro = {};
    if (filtros.incapacidadId) where.cobro.incapacidadId = filtros.incapacidadId;
    if (filtros.empleadoId) {
      where.cobro.incapacidad = { empleadoId: filtros.empleadoId };
    }
  }

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.fechaPago = {};
    if (filtros.fechaDesde) where.fechaPago.gte = filtros.fechaDesde;
    if (filtros.fechaHasta) where.fechaPago.lte = filtros.fechaHasta;
  }

  return where;
}

export async function listarPagos(filtros = {}) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, pagos] = await prisma.$transaction([
    prisma.pago.count({ where }),
    prisma.pago.findMany({
      where,
      include: includePago,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: [{ fechaPago: 'desc' }, { id: 'desc' }]
    })
  ]);

  return {
    pagos: pagos.map((pago) => toPagoDto(pago)),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function listarPagosPendientes(filtros = {}) {
  const pendientes = await listarCobrosPendientes({ ...filtros, pagina: 1, limite: 100 });
  const cobros = pendientes.cobros;

  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const total = cobros.length;
  const datos = cobros.slice((pagina - 1) * limite, pagina * limite).map((cobro) => ({
    ...cobro,
    saldoPendiente: cobro.saldoPendiente
  }));

  return { cobros: datos, total, pagina, limite, totalPaginas: Math.ceil(total / limite) };
}

export async function obtenerPago(id) {
  const pago = await prisma.pago.findUnique({ where: { id }, include: includePago });

  if (!pago) {
    throw new AppError(404, 'Pago no encontrado');
  }

  return toPagoDto(pago, await saldoCobro(pago.cobroId));
}

async function validarSoporte(tx, soporteDocumentoId, incapacidadId) {
  const documento = await tx.documento.findUnique({ where: { id: soporteDocumentoId } });

  if (!documento) {
    throw new AppError(404, 'Documento de soporte no encontrado');
  }
  if (documento.tipo !== 'SOPORTE_PAGO') {
    throw new AppError(400, 'El documento debe tener tipo SOPORTE_PAGO');
  }
  if (documento.incapacidadId !== incapacidadId) {
    throw new AppError(400, 'El documento de soporte pertenece a otra incapacidad');
  }

  const uso = await tx.pago.findUnique({ where: { soporteDocumentoId } });
  if (uso) {
    throw new AppError(409, 'El documento de soporte ya está asociado a otro pago');
  }

  return documento;
}

async function todosLosCobrosSaldados(tx, incapacidadId) {
  const cobros = await tx.cobro.findMany({ where: { incapacidadId }, select: { id: true } });

  for (const cobro of cobros) {
    const saldo = await saldoCobro(cobro.id, tx);
    if (saldo > 0) return false;
  }

  return cobros.length > 0;
}

export async function crearPago(datos, req) {
  const cobro = await prisma.cobro.findUnique({
    where: { id: datos.cobroId },
    include: { incapacidad: { select: { id: true, codigo: true, estado: true, entidadId: true } } }
  });

  if (!cobro) {
    throw new AppError(404, 'Cobro no encontrado');
  }

  if (datos.entidadId !== cobro.incapacidad.entidadId) {
    throw new AppError(400, 'La entidad del pago debe corresponder a la EPS/ARL de la incapacidad', {
      entidadEsperada: cobro.incapacidad.entidadId,
      entidadRecibida: datos.entidadId
    });
  }

  const saldo = await saldoCobro(datos.cobroId);
  const valorPagado = aNumero(datos.valorPagado);

  if (valorPagado > saldo) {
    throw new AppError(400, 'El valor pagado supera el saldo pendiente del cobro', {
      saldoPendiente: saldo,
      valorPagado
    });
  }

  const pago = await prisma.$transaction(async (tx) => {
    if (datos.soporteDocumentoId) {
      await validarSoporte(tx, datos.soporteDocumentoId, cobro.incapacidadId);
    }

    const creado = await tx.pago.create({
      data: {
        cobroId: datos.cobroId,
        entidadId: datos.entidadId,
        fechaPago: datos.fechaPago,
        valorPagado: datos.valorPagado,
        referencia: datos.referencia ?? null,
        soporteDocumentoId: datos.soporteDocumentoId ?? null,
        registradoPorId: req.usuario.id
      },
      include: includePago
    });

    const saldoRestante = await saldoCobro(datos.cobroId, tx);

    if (saldoRestante === 0) {
      await tx.cobro.update({ where: { id: datos.cobroId }, data: { estado: 'COBRADO' } });
    } else if (cobro.estado === 'PENDIENTE') {
      await tx.cobro.update({ where: { id: datos.cobroId }, data: { estado: 'GESTIONADO' } });
    }

    if (await todosLosCobrosSaldados(tx, cobro.incapacidadId)) {
      if (cobro.incapacidad.estado !== 'PAGADA') {
        validarTransicion(cobro.incapacidad.estado, 'PAGADA');
        await tx.incapacidad.update({
          where: { id: cobro.incapacidadId },
          data: { estado: 'PAGADA' }
        });
        await registrarCambioEstado(tx, {
          incapacidadId: cobro.incapacidadId,
          estadoAnterior: cobro.incapacidad.estado,
          estadoNuevo: 'PAGADA',
          usuarioId: req.usuario.id,
          observaciones: `Todos los cobros saldados. Último pago: ${datos.referencia ?? `ID ${creado.id}`}`
        });
      }
    }

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'PAGO_CREAR',
      entidad: 'PAGO',
      entidadId: creado.id,
      detalles: {
        cobroId: datos.cobroId,
        incapacidadId: cobro.incapacidadId,
        valorPagado: valorPagado,
        saldoRestante,
        referencia: datos.referencia ?? null
      },
      req,
      client: tx
    });

    return creado;
  });

  return toPagoDto(pago, await saldoCobro(datos.cobroId));
}

export async function adjuntarSoporte(id, soporteDocumentoId, req) {
  const pago = await prisma.pago.findUnique({ where: { id }, include: { cobro: true } });

  if (!pago) {
    throw new AppError(404, 'Pago no encontrado');
  }

  await validarSoporte(prisma, soporteDocumentoId, pago.cobro.incapacidadId);

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.pago.update({
      where: { id },
      data: { soporteDocumentoId },
      include: includePago
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'PAGO_SOPORTE',
      entidad: 'PAGO',
      entidadId: id,
      detalles: { soporteDocumentoId },
      req,
      client: tx
    });

    return resultado;
  });

  return toPagoDto(actualizado, await saldoCobro(pago.cobroId));
}
