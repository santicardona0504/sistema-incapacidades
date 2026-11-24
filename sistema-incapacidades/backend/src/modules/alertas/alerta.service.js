import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';

export const UMBRALES_DIAS = {
  DIAS_90: 90,
  DIAS_120: 120,
  DIAS_150: 150,
  DIAS_180: 180
};

const includeAlerta = {
  incapacidad: {
    select: {
      id: true,
      codigo: true,
      fechaInicio: true,
      fechaFin: true,
      estado: true,
      origen: true,
      empleado: {
        select: {
          id: true,
          identificacion: true,
          nombres: true,
          apellidos: true,
          area: true
        }
      },
      entidad: { select: { id: true, nombre: true, tipo: true } }
    }
  }
};

export function diasTranscurridos(fechaInicio, hoy = new Date()) {
  const inicio = new Date(fechaInicio);
  const actual = new Date(hoy);
  const inicioUTC = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
  const hoyUTC = Date.UTC(actual.getUTCFullYear(), actual.getUTCMonth(), actual.getUTCDate());
  return Math.max(0, Math.floor((hoyUTC - inicioUTC) / 86400000));
}

export function toAlertaDto(alerta, hoy = new Date()) {
  const incapacidad = alerta.incapacidad;
  const dias = incapacidad?.fechaInicio ? diasTranscurridos(incapacidad.fechaInicio, hoy) : 0;

  return {
    id: alerta.id,
    umbral: alerta.umbral,
    umbralDias: UMBRALES_DIAS[alerta.umbral],
    diasTranscurridos: dias,
    fechaGenerada: alerta.fechaGenerada,
    leida: alerta.leida,
    incapacidad: incapacidad ? {
      id: incapacidad.id,
      codigo: incapacidad.codigo,
      fechaInicio: incapacidad.fechaInicio,
      fechaFin: incapacidad.fechaFin,
      estado: incapacidad.estado,
      origen: incapacidad.origen,
      empleado: incapacidad.empleado ? {
        id: incapacidad.empleado.id,
        identificacion: incapacidad.empleado.identificacion,
        nombreCompleto: `${incapacidad.empleado.nombres} ${incapacidad.empleado.apellidos}`,
        area: incapacidad.empleado.area
      } : null,
      entidad: incapacidad.entidad
    } : null
  };
}

function construirFiltros(filtros) {
  const where = {};

  if (filtros.umbral) where.umbral = filtros.umbral;
  if (filtros.leida) where.leida = filtros.leida === 'true';

  if (filtros.empleadoId || filtros.entidadId || filtros.estado) {
    where.incapacidad = {};
    if (filtros.empleadoId) where.incapacidad.empleadoId = filtros.empleadoId;
    if (filtros.entidadId) where.incapacidad.entidadId = filtros.entidadId;
    if (filtros.estado) where.incapacidad.estado = filtros.estado;
  }

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.fechaGenerada = {};
    if (filtros.fechaDesde) where.fechaGenerada.gte = filtros.fechaDesde;
    if (filtros.fechaHasta) where.fechaGenerada.lte = filtros.fechaHasta;
  }

  return where;
}

export async function listarAlertas(filtros = {}) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);
  const hoy = new Date();

  const [total, alertas] = await prisma.$transaction([
    prisma.alerta.count({ where }),
    prisma.alerta.findMany({
      where,
      include: includeAlerta,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: [{ fechaGenerada: 'desc' }, { id: 'desc' }]
    })
  ]);

  return {
    alertas: alertas.map((alerta) => toAlertaDto(alerta, hoy)),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function resumenAlertas() {
  const hoy = new Date();
  const [totales, noLeidas, porUmbral] = await prisma.$transaction([
    prisma.alerta.count(),
    prisma.alerta.count({ where: { leida: false } }),
    prisma.alerta.groupBy({ by: ['umbral'], _count: { _all: true } })
  ]);

  const porTipo = Object.keys(UMBRALES_DIAS).map((umbral) => ({
    umbral,
    umbralDias: UMBRALES_DIAS[umbral],
    total: porUmbral.find((item) => item.umbral === umbral)?._count?._all ?? 0
  }));

  const recientes = await prisma.alerta.findMany({
    include: includeAlerta,
    orderBy: { fechaGenerada: 'desc' },
    take: 5
  });

  return {
    totales,
    noLeidas,
    porTipo,
    recientes: recientes.map((alerta) => toAlertaDto(alerta, hoy))
  };
}

export async function generarAlertas(req) {
  const hoy = new Date();
  const incapacidades = await prisma.incapacidad.findMany({
    select: { id: true, fechaInicio: true, codigo: true, estado: true }
  });

  const candidatos = [];

  for (const incapacidad of incapacidades) {
    const dias = diasTranscurridos(incapacidad.fechaInicio, hoy);

    for (const [umbral, limite] of Object.entries(UMBRALES_DIAS)) {
      if (dias >= limite) {
        candidatos.push({
          incapacidadId: incapacidad.id,
          umbral,
          fechaGenerada: hoy
        });
      }
    }
  }

  const creadas = candidatos.length === 0
    ? 0
    : (await prisma.alerta.createMany({
        data: candidatos,
        skipDuplicates: true
      })).count;

  await registrarAuditoria({
    usuarioId: req?.usuario?.id ?? null,
    accion: 'ALERTAS_GENERAR',
    entidad: 'ALERTA',
    entidadId: null,
    detalles: { candidatos: candidatos.length, creadas, omitidas: candidatos.length - creadas },
    req
  });

  const resumen = await resumenAlertas();

  return {
    candidatos: candidatos.length,
    creadas,
    omitidas: candidatos.length - creadas,
    resumen
  };
}

export async function marcarLeida(id, req) {
  const alerta = await prisma.alerta.findUnique({ where: { id } });

  if (!alerta) {
    throw new AppError(404, 'Alerta no encontrada');
  }

  const actualizada = await prisma.$transaction(async (tx) => {
    const resultado = await tx.alerta.update({
      where: { id },
      data: { leida: true },
      include: includeAlerta
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'ALERTA_MARCAR_LEIDA',
      entidad: 'ALERTA',
      entidadId: id,
      req,
      client: tx
    });

    return resultado;
  });

  return toAlertaDto(actualizada);
}

export async function marcarTodasLeidas(filtros, req) {
  const where = { leida: false };
  if (filtros.umbral) where.umbral = filtros.umbral;

  const resultado = await prisma.alerta.updateMany({ where, data: { leida: true } });

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'ALERTAS_MARCAR_LEIDAS',
    entidad: 'ALERTA',
    entidadId: null,
    detalles: { actualizadas: resultado.count, umbral: filtros.umbral ?? null },
    req
  });

  return { actualizadas: resultado.count };
}
