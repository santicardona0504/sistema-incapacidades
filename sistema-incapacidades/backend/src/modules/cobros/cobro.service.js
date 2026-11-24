import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { aNumero } from '../../utils/dinero.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { validarTransicion, registrarCambioEstado } from '../incapacidades/estado.service.js';

const includeCobro = {
  incapacidad: {
    select: {
      id: true,
      codigo: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      empleado: {
        select: {
          id: true,
          identificacion: true,
          nombres: true,
          apellidos: true
        }
      },
      entidad: { select: { id: true, nombre: true, tipo: true } }
    }
  },
  radicacion: {
    select: {
      id: true,
      numeroRadicado: true,
      fechaTranscripcion: true,
      fechaRadicacion: true,
      responsable: true,
      entidad: { select: { id: true, nombre: true, tipo: true } }
    }
  },
  responsable: { select: { id: true, nombre: true } },
  _count: { select: { pagos: true, gestiones: true } }
};

export async function saldoCobro(cobroId, client = prisma) {
  const cobro = await client.cobro.findUnique({
    where: { id: cobroId },
    select: { valorReconocido: true }
  });

  if (!cobro) {
    throw new AppError(404, 'Cobro no encontrado');
  }

  const total = await client.pago.aggregate({
    where: { cobroId },
    _sum: { valorPagado: true }
  });

  return Math.max(0, aNumero(cobro.valorReconocido) - aNumero(total._sum.valorPagado));
}

export function toCobroDto(cobro, saldoPendiente = null, totalPagado = null) {
  return {
    id: cobro.id,
    numeroSolicitud: cobro.numeroSolicitud,
    fechaSolicitud: cobro.fechaSolicitud,
    valorReconocido: aNumero(cobro.valorReconocido),
    totalPagado: totalPagado === null ? undefined : aNumero(totalPagado),
    saldoPendiente: saldoPendiente === null ? undefined : saldoPendiente,
    estado: cobro.estado,
    observaciones: cobro.observaciones,
    incapacidad: cobro.incapacidad ? {
      id: cobro.incapacidad.id,
      codigo: cobro.incapacidad.codigo,
      estado: cobro.incapacidad.estado,
      fechaInicio: cobro.incapacidad.fechaInicio,
      fechaFin: cobro.incapacidad.fechaFin,
      empleado: cobro.incapacidad.empleado ? {
        id: cobro.incapacidad.empleado.id,
        identificacion: cobro.incapacidad.empleado.identificacion,
        nombreCompleto: `${cobro.incapacidad.empleado.nombres} ${cobro.incapacidad.empleado.apellidos}`
      } : null
    } : null,
    entidad: cobro.incapacidad?.entidad ?? cobro.radicacion?.entidad ?? null,
    radicacion: cobro.radicacion ? {
      id: cobro.radicacion.id,
      numeroRadicado: cobro.radicacion.numeroRadicado,
      fechaTranscripcion: cobro.radicacion.fechaTranscripcion,
      fechaRadicacion: cobro.radicacion.fechaRadicacion,
      responsable: cobro.radicacion.responsable,
      entidad: cobro.radicacion.entidad
    } : null,
    responsable: cobro.responsable,
    totalGestiones: cobro._count?.gestiones ?? 0,
    totalPagos: cobro._count?.pagos ?? 0,
    creadoEn: cobro.creadoEn,
    actualizadoEn: cobro.actualizadoEn
  };
}

function construirFiltros(filtros) {
  const where = {};

  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.incapacidadId) where.incapacidadId = filtros.incapacidadId;
  if (filtros.radicacionId) where.radicacionId = filtros.radicacionId;

  if (filtros.entidadId || filtros.empleadoId || filtros.buscar) {
    where.incapacidad = {};
    if (filtros.entidadId) where.incapacidad.entidadId = filtros.entidadId;
    if (filtros.empleadoId) where.incapacidad.empleadoId = filtros.empleadoId;
    if (filtros.buscar) {
      where.OR = [
        { numeroSolicitud: { contains: filtros.buscar, mode: 'insensitive' } },
        { incapacidad: { codigo: { contains: filtros.buscar, mode: 'insensitive' } } }
      ];
    }
  } else if (filtros.buscar) {
    where.numeroSolicitud = { contains: filtros.buscar, mode: 'insensitive' };
  }

  if (filtros.entidadId || filtros.empleadoId || filtros.buscar) {
    if (filtros.buscar) {
      where.OR = [
        { numeroSolicitud: { contains: filtros.buscar, mode: 'insensitive' } },
        { incapacidad: { codigo: { contains: filtros.buscar, mode: 'insensitive' } } },
        { incapacidad: { empleado: { nombres: { contains: filtros.buscar, mode: 'insensitive' } } } },
        { incapacidad: { empleado: { apellidos: { contains: filtros.buscar, mode: 'insensitive' } } } }
      ];
    }
  }

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.fechaSolicitud = {};
    if (filtros.fechaDesde) where.fechaSolicitud.gte = filtros.fechaDesde;
    if (filtros.fechaHasta) where.fechaSolicitud.lte = filtros.fechaHasta;
  }

  return where;
}

async function enriquecer(cobros) {
  if (cobros.length === 0) return [];
  const ids = cobros.map((cobro) => cobro.id);
  const sumas = await prisma.pago.groupBy({
    by: ['cobroId'],
    where: { cobroId: { in: ids } },
    _sum: { valorPagado: true }
  });
  const sumaPorCobro = new Map(sumas.map((suma) => [suma.cobroId, aNumero(suma._sum.valorPagado)]));

  return cobros.map((cobro) => {
    const totalPagado = sumaPorCobro.get(cobro.id) ?? 0;
    const saldoPendiente = Math.max(0, aNumero(cobro.valorReconocido) - totalPagado);
    return { cobro, totalPagado, saldoPendiente };
  });
}

export async function listarCobros(filtros = {}) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const cobros = await prisma.cobro.findMany({
    where,
    include: includeCobro,
    orderBy: { creadoEn: 'desc' }
  });

  let enriquecidos = await enriquecer(cobros);

  if (filtros.soloPendientes === 'true') {
    enriquecidos = enriquecidos.filter((item) => item.saldoPendiente > 0);
  }

  const total = enriquecidos.length;
  const partes = enriquecidos.slice((pagina - 1) * limite, pagina * limite);

  return {
    cobros: partes.map((item) => toCobroDto(item.cobro, item.saldoPendiente, item.totalPagado)),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function listarCobrosPendientes(filtros = {}) {
  return listarCobros({ ...filtros, soloPendientes: 'true' });
}

export async function obtenerCobro(id) {
  const cobro = await prisma.cobro.findUnique({ where: { id }, include: includeCobro });

  if (!cobro) {
    throw new AppError(404, 'Cobro no encontrado');
  }

  const total = await prisma.pago.aggregate({
    where: { cobroId: id },
    _sum: { valorPagado: true }
  });
  const totalPagado = aNumero(total._sum.valorPagado);
  const saldoPendiente = Math.max(0, aNumero(cobro.valorReconocido) - totalPagado);

  return toCobroDto(cobro, saldoPendiente, totalPagado);
}

function validarEstadoParaCobro(incapacidad) {
  if (incapacidad.estado === 'COBRADA') return false;
  if (incapacidad.estado === 'TRANSCRITA') return true;
  throw new AppError(400, `No se puede registrar un cobro para una incapacidad en estado ${incapacidad.estado}`, {
    estadoActual: incapacidad.estado
  });
}

export async function crearCobro(datos, req) {
  const incapacidad = await prisma.incapacidad.findUnique({
    where: { id: datos.incapacidadId },
    include: { entidad: { select: { id: true, nombre: true, tipo: true } } }
  });

  if (!incapacidad) {
    throw new AppError(404, 'Incapacidad no encontrada');
  }

  const debeTransicionar = validarEstadoParaCobro(incapacidad);

  const radicacion = await prisma.radicacion.findUnique({
    where: { id: datos.radicacionId },
    select: {
      id: true,
      incapacidadId: true,
      entidadId: true,
      numeroRadicado: true,
      fechaRadicacion: true
    }
  });

  if (!radicacion) {
    throw new AppError(404, 'Radicación no encontrada');
  }

  if (radicacion.incapacidadId !== datos.incapacidadId) {
    throw new AppError(400, 'La radicación seleccionada pertenece a otra incapacidad', {
      radicacionId: radicacion.id,
      incapacidadEsperada: datos.incapacidadId,
      incapacidadDeRadicacion: radicacion.incapacidadId
    });
  }

  if (radicacion.entidadId !== incapacidad.entidadId) {
    throw new AppError(400, 'La radicación seleccionada pertenece a otra entidad EPS/ARL', {
      radicacionId: radicacion.id,
      entidadEsperada: incapacidad.entidadId,
      entidadDeRadicacion: radicacion.entidadId
    });
  }

  const duplicado = await prisma.cobro.findUnique({
    where: { numeroSolicitud: datos.numeroSolicitud }
  });

  if (duplicado) {
    throw new AppError(409, 'El número de solicitud ya existe');
  }

  if (datos.responsableId) {
    const responsable = await prisma.usuario.findUnique({ where: { id: datos.responsableId } });
    if (!responsable || !responsable.activo) {
      throw new AppError(400, 'El responsable del cobro no es válido');
    }
  }

  const cobro = await prisma.$transaction(async (tx) => {
    const creado = await tx.cobro.create({
      data: {
        incapacidadId: datos.incapacidadId,
        radicacionId: datos.radicacionId,
        numeroSolicitud: datos.numeroSolicitud,
        fechaSolicitud: datos.fechaSolicitud,
        valorReconocido: datos.valorReconocido,
        responsableId: datos.responsableId ?? null,
        observaciones: datos.observaciones ?? null
      },
      include: includeCobro
    });

    if (debeTransicionar) {
      await tx.incapacidad.update({
        where: { id: incapacidad.id },
        data: { estado: 'COBRADA' }
      });
      await registrarCambioEstado(tx, {
        incapacidadId: incapacidad.id,
        estadoAnterior: incapacidad.estado,
        estadoNuevo: 'COBRADA',
        usuarioId: req.usuario.id,
        observaciones: `Cobro ${datos.numeroSolicitud} asociado a radicación ${radicacion.numeroRadicado}`
      });
    }

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'COBRO_CREAR',
      entidad: 'COBRO',
      entidadId: creado.id,
      detalles: {
        incapacidadId: datos.incapacidadId,
        radicacionId: datos.radicacionId,
        numeroRadicado: radicacion.numeroRadicado,
        numeroSolicitud: datos.numeroSolicitud,
        valorReconocido: aNumero(datos.valorReconocido)
      },
      req,
      client: tx
    });

    return creado;
  });

  return toCobroDto(cobro, aNumero(datos.valorReconocido), 0);
}

export async function editarCobro(id, datos, req) {
  const cobro = await prisma.cobro.findUnique({ where: { id } });

  if (!cobro) {
    throw new AppError(404, 'Cobro no encontrado');
  }

  if (datos.estado === 'COBRADO') {
    throw new AppError(400, 'El estado COBRADO se determina automáticamente al registrar pagos');
  }

  if (datos.responsableId) {
    const responsable = await prisma.usuario.findUnique({ where: { id: datos.responsableId } });
    if (!responsable || !responsable.activo) {
      throw new AppError(400, 'El responsable del cobro no es válido');
    }
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.cobro.update({
      where: { id },
      data: {
        ...(datos.estado ? { estado: datos.estado } : {}),
        ...(datos.responsableId ? { responsableId: datos.responsableId } : {}),
        ...(datos.observaciones !== undefined ? { observaciones: datos.observaciones } : {})
      },
      include: includeCobro
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'COBRO_EDITAR',
      entidad: 'COBRO',
      entidadId: id,
      detalles: datos,
      req,
      client: tx
    });

    return resultado;
  });

  return obtenerCobro(actualizado.id);
}

export async function listarGestiones(cobroId) {
  const cobro = await prisma.cobro.findUnique({ where: { id: cobroId }, select: { id: true } });

  if (!cobro) {
    throw new AppError(404, 'Cobro no encontrado');
  }

  const gestiones = await prisma.gestionCobro.findMany({
    where: { cobroId },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fechaGestion: 'desc' }
  });

  return gestiones.map((gestion) => ({
    id: gestion.id,
    cobroId: gestion.cobroId,
    fechaGestion: gestion.fechaGestion,
    compromisoPago: gestion.compromisoPago,
    observaciones: gestion.observaciones,
    usuario: gestion.usuario,
    creadoEn: gestion.creadoEn
  }));
}

export async function crearGestion(cobroId, datos, req) {
  const cobro = await prisma.cobro.findUnique({ where: { id: cobroId } });

  if (!cobro) {
    throw new AppError(404, 'Cobro no encontrado');
  }

  const estado = datos.compromisoPago ? 'COMPROMISO_PAGO' : 'GESTIONADO';

  const gestion = await prisma.$transaction(async (tx) => {
    const creada = await tx.gestionCobro.create({
      data: {
        cobroId,
        fechaGestion: datos.fechaGestion,
        compromisoPago: datos.compromisoPago ?? null,
        observaciones: datos.observaciones,
        usuarioId: req.usuario.id
      },
      include: { usuario: { select: { id: true, nombre: true } } }
    });

    if (cobro.estado !== 'COBRADO' && cobro.estado !== 'RECHAZADO') {
      await tx.cobro.update({ where: { id: cobroId }, data: { estado } });
    }

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'COBRO_GESTION',
      entidad: 'COBRO',
      entidadId: cobroId,
      detalles: { fechaGestion: datos.fechaGestion, compromisoPago: datos.compromisoPago, estado },
      req,
      client: tx
    });

    return creada;
  });

  return gestion;
}

export async function radicacionesDeIncapacidad(incapacidadId) {
  const radicaciones = await prisma.radicacion.findMany({
    where: { incapacidadId },
    include: {
      entidad: { select: { id: true, nombre: true, tipo: true } },
      _count: { select: { rechazos: true, cobros: true } }
    },
    orderBy: [{ fechaTranscripcion: 'desc' }, { id: 'desc' }]
  });

  return radicaciones.map((radicacion) => ({
    id: radicacion.id,
    numeroRadicado: radicacion.numeroRadicado,
    fechaTranscripcion: radicacion.fechaTranscripcion,
    fechaRadicacion: radicacion.fechaRadicacion,
    responsable: radicacion.responsable,
    entidad: radicacion.entidad,
    totalRechazos: radicacion._count.rechazos,
    totalCobros: radicacion._count.cobros
  }));
}
