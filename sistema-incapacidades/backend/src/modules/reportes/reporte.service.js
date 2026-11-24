import { prisma } from '../../utils/prisma.js';
import { aNumero } from '../../utils/dinero.js';
import { UMBRALES_DIAS, diasTranscurridos } from '../alertas/alerta.service.js';
import { toConciliacionDto } from '../conciliaciones/conciliacion.service.js';

const ESTADOS_INCAPACIDAD = ['REGISTRADA', 'TRANSCRITA', 'COBRADA', 'RECHAZADA', 'PAGADA'];
const ESTADOS_COBRO = ['PENDIENTE', 'GESTIONADO', 'COMPROMISO_PAGO', 'COBRADO', 'RECHAZADO'];
const ESTADOS_CONCILIACION = ['EN_CONSOLIDACION', 'EN_REVISION', 'VALIDADA'];
const UMBRALES = Object.keys(UMBRALES_DIAS);

function fecha(valor) {
  return valor instanceof Date ? valor.toISOString().slice(0, 10) : valor ?? '';
}

function nombreEmpleado(empleado) {
  return empleado ? `${empleado.nombres} ${empleado.apellidos}` : '';
}

function fechaWhere(filtros, campo) {
  if (!filtros.fechaDesde && !filtros.fechaHasta) return {};
  const rango = {};
  if (filtros.fechaDesde) rango.gte = filtros.fechaDesde;
  if (filtros.fechaHasta) rango.lte = filtros.fechaHasta;
  return { [campo]: rango };
}

function whereIncapacidad(filtros, { fechaCampo = 'fechaInicio', usarEstado = true } = {}) {
  const where = { ...fechaWhere(filtros, fechaCampo) };
  if (filtros.empleadoId) where.empleadoId = filtros.empleadoId;
  if (filtros.entidadId) where.entidadId = filtros.entidadId;
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.origen) where.origen = filtros.origen;
  if (usarEstado && filtros.estado && ESTADOS_INCAPACIDAD.includes(filtros.estado)) {
    where.estado = filtros.estado;
  }
  if (filtros.numeroRadicado) {
    where.radicaciones = {
      some: { numeroRadicado: { contains: filtros.numeroRadicado, mode: 'insensitive' } }
    };
  }
  return where;
}

function whereCobro(filtros, { fechaCampo = 'fechaSolicitud' } = {}) {
  const where = { ...fechaWhere(filtros, fechaCampo) };
  if (filtros.estado && ESTADOS_COBRO.includes(filtros.estado)) where.estado = filtros.estado;
  if (filtros.numeroRadicado) {
    where.radicacion = { numeroRadicado: { contains: filtros.numeroRadicado, mode: 'insensitive' } };
  }
  where.incapacidad = whereIncapacidad(filtros, { fechaCampo: 'fechaInicio' });
  return where;
}

function wherePago(filtros) {
  const where = { ...fechaWhere(filtros, 'fechaPago') };
  if (filtros.entidadId) where.entidadId = filtros.entidadId;
  where.cobro = whereCobro({ ...filtros, fechaDesde: undefined, fechaHasta: undefined, estado: undefined });
  if (filtros.estado && ESTADOS_INCAPACIDAD.includes(filtros.estado)) {
    where.cobro.incapacidad.estado = filtros.estado;
  }
  return where;
}

async function cobrosEnriquecidos(where) {
  const cobros = await prisma.cobro.findMany({
    where,
    include: {
      incapacidad: {
        select: {
          id: true,
          codigo: true,
          fechaInicio: true,
          empleado: { select: { id: true, identificacion: true, nombres: true, apellidos: true } },
          entidad: { select: { id: true, nombre: true, tipo: true } }
        }
      },
      radicacion: { select: { id: true, numeroRadicado: true, fechaRadicacion: true, fechaTranscripcion: true } },
      responsable: { select: { id: true, nombre: true } }
    },
    orderBy: { fechaSolicitud: 'desc' }
  });

  if (cobros.length === 0) return [];

  const sumas = await prisma.pago.groupBy({
    by: ['cobroId'],
    where: { cobroId: { in: cobros.map((cobro) => cobro.id) } },
    _sum: { valorPagado: true }
  });
  const mapa = new Map(sumas.map((suma) => [suma.cobroId, aNumero(suma._sum.valorPagado)]));

  return cobros.map((cobro) => {
    const totalPagado = mapa.get(cobro.id) ?? 0;
    return {
      ...cobro,
      totalPagado,
      saldo: Math.max(0, aNumero(cobro.valorReconocido) - totalPagado)
    };
  });
}

export async function reporteGeneral(filtros) {
  const incapacidades = await prisma.incapacidad.findMany({
    where: whereIncapacidad(filtros),
    include: {
      empleado: true,
      entidad: true,
      registradaPor: { select: { nombre: true } },
      _count: { select: { radicaciones: true, cobros: true, documentos: true, rechazos: true } }
    },
    orderBy: { fechaInicio: 'desc' }
  });

  return {
    nombre: 'reporte_general_incapacidades',
    columnas: [
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'empleado', titulo: 'Empleado' },
      { clave: 'identificacion', titulo: 'Identificación' },
      { clave: 'entidad', titulo: 'EPS/ARL' },
      { clave: 'tipo', titulo: 'Tipo de incapacidad' },
      { clave: 'origen', titulo: 'Origen' },
      { clave: 'fechaInicio', titulo: 'Fecha inicio' },
      { clave: 'fechaFin', titulo: 'Fecha fin' },
      { clave: 'dias', titulo: 'Días' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'radicaciones', titulo: 'Radicaciones' },
      { clave: 'cobros', titulo: 'Cobros' },
      { clave: 'rechazos', titulo: 'Rechazos' },
      { clave: 'registradaPor', titulo: 'Registrado por' }
    ],
    filas: incapacidades.map((incapacidad) => ({
      codigo: incapacidad.codigo,
      empleado: nombreEmpleado(incapacidad.empleado),
      identificacion: incapacidad.empleado?.identificacion,
      entidad: incapacidad.entidad?.nombre,
      tipo: incapacidad.tipo,
      origen: incapacidad.origen,
      fechaInicio: fecha(incapacidad.fechaInicio),
      fechaFin: fecha(incapacidad.fechaFin),
      dias: incapacidad.dias,
      estado: incapacidad.estado,
      radicaciones: incapacidad._count.radicaciones,
      cobros: incapacidad._count.cobros,
      rechazos: incapacidad._count.rechazos,
      registradaPor: incapacidad.registradaPor?.nombre
    }))
  };
}

async function reporteCobros(filtros, pendientes) {
  const cobros = await cobrosEnriquecidos(whereCobro(filtros));
  const filtrados = pendientes ? cobros.filter((cobro) => cobro.saldo > 0) : cobros;

  return {
    nombre: pendientes ? 'reporte_cobros_pendientes' : 'reporte_cobros',
    columnas: [
      { clave: 'numeroSolicitud', titulo: 'N° solicitud' },
      { clave: 'codigoIncapacidad', titulo: 'Incapacidad' },
      { clave: 'empleado', titulo: 'Empleado' },
      { clave: 'entidad', titulo: 'EPS/ARL' },
      { clave: 'numeroRadicado', titulo: 'N° radicado' },
      { clave: 'fechaRadicacion', titulo: 'Fecha radicación' },
      { clave: 'fechaSolicitud', titulo: 'Fecha solicitud' },
      { clave: 'valorReconocido', titulo: 'Valor reconocido' },
      { clave: 'totalPagado', titulo: 'Total pagado' },
      { clave: 'saldo', titulo: 'Saldo pendiente' },
      { clave: 'estado', titulo: 'Estado cobro' },
      { clave: 'responsable', titulo: 'Responsable' }
    ],
    filas: filtrados.map((cobro) => ({
      numeroSolicitud: cobro.numeroSolicitud,
      codigoIncapacidad: cobro.incapacidad?.codigo,
      empleado: nombreEmpleado(cobro.incapacidad?.empleado),
      entidad: cobro.incapacidad?.entidad?.nombre,
      numeroRadicado: cobro.radicacion?.numeroRadicado,
      fechaRadicacion: fecha(cobro.radicacion?.fechaRadicacion),
      fechaSolicitud: fecha(cobro.fechaSolicitud),
      valorReconocido: aNumero(cobro.valorReconocido),
      totalPagado: cobro.totalPagado,
      saldo: cobro.saldo,
      estado: cobro.estado,
      responsable: cobro.responsable?.nombre
    }))
  };
}

export function reporteCobrosPendientes(filtros) {
  return reporteCobros(filtros, true);
}

export async function reportePagosRealizados(filtros) {
  const pagos = await prisma.pago.findMany({
    where: wherePago(filtros),
    include: {
      entidad: true,
      registradoPor: { select: { nombre: true } },
      soporteDocumento: { select: { nombreOriginal: true } },
      cobro: {
        include: {
          incapacidad: {
            select: {
              codigo: true,
              empleado: { select: { identificacion: true, nombres: true, apellidos: true } }
            }
          },
          radicacion: { select: { numeroRadicado: true, fechaRadicacion: true } }
        }
      }
    },
    orderBy: { fechaPago: 'desc' }
  });

  return {
    nombre: 'reporte_pagos_realizados',
    columnas: [
      { clave: 'fechaPago', titulo: 'Fecha pago' },
      { clave: 'referencia', titulo: 'Referencia' },
      { clave: 'entidad', titulo: 'EPS/ARL' },
      { clave: 'codigoIncapacidad', titulo: 'Incapacidad' },
      { clave: 'empleado', titulo: 'Empleado' },
      { clave: 'numeroSolicitud', titulo: 'N° solicitud' },
      { clave: 'numeroRadicado', titulo: 'N° radicado' },
      { clave: 'valorPagado', titulo: 'Valor pagado' },
      { clave: 'soporte', titulo: 'Soporte' },
      { clave: 'registradoPor', titulo: 'Registrado por' }
    ],
    filas: pagos.map((pago) => ({
      fechaPago: fecha(pago.fechaPago),
      referencia: pago.referencia,
      entidad: pago.entidad?.nombre,
      codigoIncapacidad: pago.cobro?.incapacidad?.codigo,
      empleado: nombreEmpleado(pago.cobro?.incapacidad?.empleado),
      numeroSolicitud: pago.cobro?.numeroSolicitud,
      numeroRadicado: pago.cobro?.radicacion?.numeroRadicado,
      valorPagado: aNumero(pago.valorPagado),
      soporte: pago.soporteDocumento?.nombreOriginal,
      registradoPor: pago.registradoPor?.nombre
    }))
  };
}

export function reportePagosPendientes(filtros) {
  return reporteCobros(filtros, true).then((reporte) => ({
    ...reporte,
    nombre: 'reporte_pagos_pendientes',
    columnas: [
      ...reporte.columnas.slice(0, 9),
      { clave: 'saldo', titulo: 'Pago pendiente' },
      ...reporte.columnas.slice(10)
    ]
  }));
}

export async function reporteRechazadas(filtros) {
  const where = {
    ...fechaWhere(filtros, 'fechaRechazo'),
    incapacidad: whereIncapacidad(filtros, { fechaCampo: 'fechaInicio', usarEstado: false })
  };
  if (filtros.estado && ESTADOS_INCAPACIDAD.includes(filtros.estado)) {
    where.incapacidad.estado = filtros.estado;
  }

  const rechazos = await prisma.rechazo.findMany({
    where,
    include: {
      incapacidad: {
        include: {
          empleado: true,
          entidad: true,
          radicaciones: { select: { numeroRadicado: true }, orderBy: { creadoEn: 'desc' }, take: 1 }
        }
      },
      registradoPor: { select: { nombre: true } }
    },
    orderBy: { fechaRechazo: 'desc' }
  });

  return {
    nombre: 'reporte_incapacidades_rechazadas',
    columnas: [
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'empleado', titulo: 'Empleado' },
      { clave: 'entidad', titulo: 'EPS/ARL' },
      { clave: 'fechaRechazo', titulo: 'Fecha rechazo' },
      { clave: 'numeroRadicado', titulo: 'N° radicado' },
      { clave: 'causal', titulo: 'Causal' },
      { clave: 'accionesCorrectivas', titulo: 'Acciones correctivas' },
      { clave: 'registradoPor', titulo: 'Registrado por' }
    ],
    filas: rechazos.map((rechazo) => ({
      codigo: rechazo.incapacidad?.codigo,
      empleado: nombreEmpleado(rechazo.incapacidad?.empleado),
      entidad: rechazo.incapacidad?.entidad?.nombre,
      fechaRechazo: fecha(rechazo.fechaRechazo),
      numeroRadicado: rechazo.incapacidad?.radicaciones?.[0]?.numeroRadicado,
      causal: rechazo.causal,
      accionesCorrectivas: rechazo.accionesCorrectivas,
      registradoPor: rechazo.registradoPor?.nombre
    }))
  };
}

export async function reporteProlongadas(filtros) {
  const where = { ...fechaWhere(filtros, 'fechaGenerada') };
  if (filtros.umbral && UMBRALES.includes(filtros.umbral)) where.umbral = filtros.umbral;
  if (filtros.leida !== undefined) where.leida = filtros.leida === 'true';

  where.incapacidad = whereIncapacidad(filtros);
  if (filtros.numeroRadicado) {
    where.incapacidad.radicaciones = {
      some: { numeroRadicado: { contains: filtros.numeroRadicado, mode: 'insensitive' } }
    };
  }

  const alertas = await prisma.alerta.findMany({
    where,
    include: {
      incapacidad: {
        include: {
          empleado: true,
          entidad: true,
          radicaciones: { select: { numeroRadicado: true }, orderBy: { creadoEn: 'desc' }, take: 1 }
        }
      }
    },
    orderBy: { fechaGenerada: 'desc' }
  });

  const hoy = new Date();

  return {
    nombre: 'reporte_incapacidades_prolongadas',
    columnas: [
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'empleado', titulo: 'Empleado' },
      { clave: 'identificacion', titulo: 'Identificación' },
      { clave: 'entidad', titulo: 'EPS/ARL' },
      { clave: 'fechaInicio', titulo: 'Fecha inicio' },
      { clave: 'diasTranscurridos', titulo: 'Días transcurridos' },
      { clave: 'umbral', titulo: 'Umbral' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'numeroRadicado', titulo: 'N° radicado' },
      { clave: 'fechaGenerada', titulo: 'Fecha alerta' }
    ],
    filas: alertas.map((alerta) => ({
      codigo: alerta.incapacidad?.codigo,
      empleado: nombreEmpleado(alerta.incapacidad?.empleado),
      identificacion: alerta.incapacidad?.empleado?.identificacion,
      entidad: alerta.incapacidad?.entidad?.nombre,
      fechaInicio: fecha(alerta.incapacidad?.fechaInicio),
      diasTranscurridos: diasTranscurridos(alerta.incapacidad?.fechaInicio, hoy),
      umbral: `${UMBRALES_DIAS[alerta.umbral]} días`,
      estado: alerta.incapacidad?.estado,
      numeroRadicado: alerta.incapacidad?.radicaciones?.[0]?.numeroRadicado,
      fechaGenerada: fecha(alerta.fechaGenerada)
    }))
  };
}

export async function reporteConciliaciones(filtros) {
  const where = { ...fechaWhere(filtros, 'fechaInicio') };
  if (filtros.estado && ESTADOS_CONCILIACION.includes(filtros.estado)) where.estado = filtros.estado;
  if (filtros.empleadoId || filtros.entidadId || filtros.tipo || filtros.origen || filtros.numeroRadicado) {
    where.detalles = {
      some: {
        pago: {
          ...(filtros.entidadId ? { entidadId: filtros.entidadId } : {}),
          cobro: {
            incapacidad: {
              ...(filtros.empleadoId ? { empleadoId: filtros.empleadoId } : {}),
              ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
              ...(filtros.origen ? { origen: filtros.origen } : {}),
              ...(filtros.numeroRadicado ? {
                radicaciones: { some: { numeroRadicado: { contains: filtros.numeroRadicado, mode: 'insensitive' } } }
              } : {})
            }
          }
        }
      }
    };
  }

  const conciliaciones = await prisma.conciliacion.findMany({
    where,
    include: {
      consolidadaPor: { select: { nombre: true } },
      validadaPor: { select: { nombre: true } },
      detalles: {
        include: {
          pago: {
            select: {
              valorPagado: true,
              entidadId: true,
              cobro: {
                select: {
                  incapacidad: {
                    select: {
                      empleadoId: true,
                      tipo: true,
                      origen: true,
                      radicaciones: { select: { numeroRadicado: true } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { fechaInicio: 'desc' }
  });

  const dto = conciliaciones.map((conciliacion) => toConciliacionDto({
    ...conciliacion,
    detalles: conciliacion.detalles.map((detalle) => ({
      ...detalle,
      pago: {
        valorPagado: detalle.pago?.valorPagado,
        entidad: null
      }
    }))
  }));

  return {
    nombre: 'reporte_conciliaciones',
    columnas: [
      { clave: 'periodo', titulo: 'Periodo' },
      { clave: 'fechaInicio', titulo: 'Fecha inicio' },
      { clave: 'fechaFin', titulo: 'Fecha fin' },
      { clave: 'estadoVisible', titulo: 'Estado' },
      { clave: 'totalDetalles', titulo: 'Pagos asociados' },
      { clave: 'totalPagado', titulo: 'Total pagado' },
      { clave: 'totalConciliado', titulo: 'Total conciliado' },
      { clave: 'totalDiferencia', titulo: 'Diferencia' },
      { clave: 'consolidadaPor', titulo: 'Consolidado por' },
      { clave: 'validadaPor', titulo: 'Validado por' },
      { clave: 'observaciones', titulo: 'Observaciones' }
    ],
    filas: dto.map((conciliacion) => ({
      periodo: conciliacion.periodo,
      fechaInicio: fecha(conciliacion.fechaInicio),
      fechaFin: fecha(conciliacion.fechaFin),
      estadoVisible: conciliacion.estadoVisible,
      totalDetalles: conciliacion.totalDetalles,
      totalPagado: conciliacion.totalPagado,
      totalConciliado: conciliacion.totalConciliado,
      totalDiferencia: conciliacion.totalDiferencia,
      consolidadaPor: conciliacion.consolidadaPor?.nombre,
      validadaPor: conciliacion.validadaPor?.nombre,
      observaciones: conciliacion.observaciones
    }))
  };
}

const REPORTES = {
  incapacidades: reporteGeneral,
  'cobros-pendientes': reporteCobrosPendientes,
  'pagos-realizados': reportePagosRealizados,
  'pagos-pendientes': reportePagosPendientes,
  rechazadas: reporteRechazadas,
  prolongadas: reporteProlongadas,
  conciliaciones: reporteConciliaciones
};

export async function obtenerReporte(tipo, filtros) {
  const generar = REPORTES[tipo];

  if (!generar) {
    return null;
  }

  const reporte = await generar(filtros);

  return {
    ...reporte,
    filtros: {
      fechaDesde: filtros.fechaDesde ? fecha(filtros.fechaDesde) : null,
      fechaHasta: filtros.fechaHasta ? fecha(filtros.fechaHasta) : null,
      empleadoId: filtros.empleadoId ?? null,
      entidadId: filtros.entidadId ?? null,
      tipo: filtros.tipo ?? null,
      estado: filtros.estado ?? null,
      origen: filtros.origen ?? null,
      numeroRadicado: filtros.numeroRadicado ?? null
    }
  };
}

export function tiposReporte() {
  return Object.keys(REPORTES);
}
