import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { validarTransicion, registrarCambioEstado } from './estado.service.js';
import { toIncapacidadDto, toRechazoDto } from './incapacidad.dto.js';

const includeBase = {
  empleado: {
    select: {
      id: true,
      identificacion: true,
      nombres: true,
      apellidos: true,
      cargo: true,
      area: true
    }
  },
  entidad: { select: { id: true, nombre: true, tipo: true } },
  registradaPor: { select: { id: true, nombre: true } },
  _count: {
    select: { documentos: true, radicaciones: true, rechazos: true }
  }
};

function fechaUTC(fecha) {
  return Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
}

function calcularDias(fechaInicio, fechaFin) {
  return Math.round((fechaUTC(fechaFin) - fechaUTC(fechaInicio)) / 86400000) + 1;
}

async function generarCodigo(tx) {
  const anio = new Date().getUTCFullYear();
  const prefijo = `INC-${anio}-`;
  const ultimo = await tx.incapacidad.findFirst({
    where: { codigo: { startsWith: prefijo } },
    orderBy: { codigo: 'desc' },
    select: { codigo: true }
  });

  const numero = ultimo ? Number(ultimo.codigo.slice(prefijo.length)) + 1 : 1;
  return `${prefijo}${String(Number.isFinite(numero) ? numero : 1).padStart(4, '0')}`;
}

async function validarEmpleado(empleadoId) {
  const empleado = await prisma.empleado.findUnique({ where: { id: empleadoId } });

  if (!empleado) {
    throw new AppError(404, 'Empleado no encontrado');
  }
}

async function validarEntidad(entidadId) {
  const entidad = await prisma.entidadSalud.findUnique({ where: { id: entidadId } });

  if (!entidad) {
    throw new AppError(404, 'Entidad EPS/ARL no encontrada');
  }
}

function construirFiltros(filtros) {
  const where = {};

  if (filtros.empleadoId !== undefined) where.empleadoId = filtros.empleadoId;
  if (filtros.entidadId !== undefined) where.entidadId = filtros.entidadId;
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.origen) where.origen = filtros.origen;
  if (filtros.estado) where.estado = filtros.estado;

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.fechaRecepcion = {};
    if (filtros.fechaDesde) where.fechaRecepcion.gte = filtros.fechaDesde;
    if (filtros.fechaHasta) where.fechaRecepcion.lte = filtros.fechaHasta;
  }

  if (filtros.buscar) {
    where.codigo = { contains: filtros.buscar, mode: 'insensitive' };
  }

  return where;
}

export async function listarIncapacidades(filtros) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, incapacidades] = await prisma.$transaction([
    prisma.incapacidad.count({ where }),
    prisma.incapacidad.findMany({
      where,
      include: includeBase,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { creadoEn: 'desc' }
    })
  ]);

  return {
    incapacidades: incapacidades.map(toIncapacidadDto),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function obtenerIncapacidad(id) {
  const incapacidad = await prisma.incapacidad.findUnique({
    where: { id },
    include: {
      ...includeBase,
      radicaciones: {
        orderBy: { creadoEn: 'desc' },
        include: {
          entidad: { select: { id: true, nombre: true, tipo: true } },
          _count: { select: { rechazos: true } }
        }
      },
      rechazos: {
        orderBy: { creadoEn: 'desc' },
        include: {
          registradoPor: { select: { id: true, nombre: true } },
          _count: { select: { documentos: true } }
        }
      },
      historiales: {
        orderBy: { fechaCambio: 'desc' },
        include: { usuario: { select: { id: true, nombre: true } } }
      }
    }
  });

  if (!incapacidad) {
    throw new AppError(404, 'Incapacidad no encontrada');
  }

  return {
    ...toIncapacidadDto(incapacidad),
    radicaciones: incapacidad.radicaciones.map((radicacion) => ({
      id: radicacion.id,
      numeroRadicado: radicacion.numeroRadicado,
      fechaTranscripcion: radicacion.fechaTranscripcion,
      fechaRadicacion: radicacion.fechaRadicacion,
      responsable: radicacion.responsable,
      entidad: radicacion.entidad,
      totalRechazos: radicacion._count.rechazos
    })),
    rechazos: incapacidad.rechazos.map(toRechazoDto),
    historial: incapacidad.historiales.map((item) => ({
      id: item.id,
      estadoAnterior: item.estadoAnterior,
      estadoNuevo: item.estadoNuevo,
      fechaCambio: item.fechaCambio,
      observaciones: item.observaciones,
      usuario: item.usuario
    }))
  };
}

export async function crearIncapacidad(datos, req) {
  await validarEmpleado(datos.empleadoId);
  await validarEntidad(datos.entidadId);

  const dias = calcularDias(datos.fechaInicio, datos.fechaFin);

  const incapacidad = await prisma.$transaction(async (tx) => {
    const codigo = await generarCodigo(tx);
    const creada = await tx.incapacidad.create({
      data: {
        codigo,
        empleadoId: datos.empleadoId,
        entidadId: datos.entidadId,
        tipo: datos.tipo,
        origen: datos.origen,
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        dias,
        fechaRecepcion: datos.fechaRecepcion,
        observaciones: datos.observaciones,
        registradaPorId: req.usuario.id
      },
      include: includeBase
    });

    await registrarCambioEstado(tx, {
      incapacidadId: creada.id,
      estadoAnterior: null,
      estadoNuevo: 'REGISTRADA',
      usuarioId: req.usuario.id,
      observaciones: 'Registro inicial de la incapacidad'
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'INCAPACIDAD_CREAR',
      entidad: 'INCAPACIDAD',
      entidadId: creada.id,
      req,
      client: tx
    });

    return creada;
  });

  return toIncapacidadDto(incapacidad);
}

export async function editarIncapacidad(id, datos, req) {
  const actual = await prisma.incapacidad.findUnique({ where: { id } });

  if (!actual) {
    throw new AppError(404, 'Incapacidad no encontrada');
  }

  if (datos.empleadoId) await validarEmpleado(datos.empleadoId);
  if (datos.entidadId) await validarEntidad(datos.entidadId);

  const fechaInicio = datos.fechaInicio ?? actual.fechaInicio;
  const fechaFin = datos.fechaFin ?? actual.fechaFin;

  if (fechaFin < fechaInicio) {
    throw new AppError(400, 'La fecha final debe ser igual o posterior a la fecha de inicio');
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.incapacidad.update({
      where: { id },
      data: {
        ...(datos.empleadoId !== undefined ? { empleadoId: datos.empleadoId } : {}),
        ...(datos.entidadId !== undefined ? { entidadId: datos.entidadId } : {}),
        ...(datos.tipo !== undefined ? { tipo: datos.tipo } : {}),
        ...(datos.origen !== undefined ? { origen: datos.origen } : {}),
        ...(datos.fechaInicio !== undefined ? { fechaInicio: datos.fechaInicio } : {}),
        ...(datos.fechaFin !== undefined ? { fechaFin: datos.fechaFin } : {}),
        ...(datos.fechaRecepcion !== undefined ? { fechaRecepcion: datos.fechaRecepcion } : {}),
        ...(datos.observaciones !== undefined ? { observaciones: datos.observaciones } : {}),
        dias: calcularDias(fechaInicio, fechaFin)
      },
      include: includeBase
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'INCAPACIDAD_EDITAR',
      entidad: 'INCAPACIDAD',
      entidadId: id,
      detalles: { campos: Object.keys(datos) },
      req,
      client: tx
    });

    return resultado;
  });

  return toIncapacidadDto(actualizado);
}

export async function cambiarEstado(id, estadoNuevo, observaciones, req) {
  const actual = await prisma.incapacidad.findUnique({ where: { id } });

  if (!actual) {
    throw new AppError(404, 'Incapacidad no encontrada');
  }

  validarTransicion(actual.estado, estadoNuevo);

  if (estadoNuevo === 'TRANSCRITA') {
    throw new AppError(400, 'La transición a TRANSCRITA se registra al crear una radicación');
  }

  if (estadoNuevo === 'PAGADA') {
    throw new AppError(400, 'La transición a PAGADA se registrará desde el módulo de pagos');
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.incapacidad.update({
      where: { id },
      data: { estado: estadoNuevo },
      include: includeBase
    });

    await registrarCambioEstado(tx, {
      incapacidadId: id,
      estadoAnterior: actual.estado,
      estadoNuevo,
      usuarioId: req.usuario.id,
      observaciones
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'INCAPACIDAD_CAMBIO_ESTADO',
      entidad: 'INCAPACIDAD',
      entidadId: id,
      detalles: { estadoAnterior: actual.estado, estadoNuevo },
      req,
      client: tx
    });

    return resultado;
  });

  return toIncapacidadDto(actualizado);
}
