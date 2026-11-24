import { prisma } from '../../utils/prisma.js';
import { aNumero } from '../../utils/dinero.js';
import { listarCobrosPendientes, toCobroDto } from '../cobros/cobro.service.js';
import { toPagoDto } from '../pagos/pago.service.js';
import { toAlertaDto } from '../alertas/alerta.service.js';
import { toConciliacionDto } from '../conciliaciones/conciliacion.service.js';

const includeReciente = {
  empleado: { select: { id: true, identificacion: true, nombres: true, apellidos: true } },
  entidad: { select: { id: true, nombre: true, tipo: true } }
};

export async function resumenDashboard() {
  const [
    totalIncapacidades,
    transcritas,
    cobradas,
    rechazadas,
    pagadas,
    pagosRealizados,
    totalPagos,
    cobrosPendientes,
    alertasNoLeidas,
    totalAlertas,
    conciliaciones,
    conciliacionesValidadas,
    empleadosActivos
  ] = await prisma.$transaction([
    prisma.incapacidad.count(),
    prisma.incapacidad.count({ where: { estado: 'TRANSCRITA' } }),
    prisma.incapacidad.count({ where: { estado: 'COBRADA' } }),
    prisma.incapacidad.count({ where: { estado: 'RECHAZADA' } }),
    prisma.incapacidad.count({ where: { estado: 'PAGADA' } }),
    prisma.pago.count(),
    prisma.pago.aggregate({ _sum: { valorPagado: true } }),
    prisma.cobro.count({ where: { estado: { notIn: ['COBRADO', 'RECHAZADO'] } } }),
    prisma.alerta.count({ where: { leida: false } }),
    prisma.alerta.count(),
    prisma.conciliacion.count(),
    prisma.conciliacion.count({ where: { estado: 'VALIDADA' } }),
    prisma.empleado.count({ where: { activo: true } })
  ]);

  const pendientes = await listarCobrosPendientes({ pagina: 1, limite: 100000 });
  const totalCobrosPendientes = pendientes.total;
  const saldoPendiente = pendientes.cobros.reduce(
    (suma, cobro) => suma + aNumero(cobro.saldoPendiente),
    0
  );

  return {
    totalIncapacidades,
    transcritas,
    cobradas,
    rechazadas,
    pagadas,
    cobrosPendientes: totalCobrosPendientes,
    cobrosEnProceso: cobrosPendientes,
    pagosPendientes: Math.round(saldoPendiente * 100) / 100,
    pagosRealizados,
    totalPagosRealizados: aNumero(totalPagos._sum.valorPagado),
    alertasNoLeidas,
    totalAlertas,
    conciliaciones,
    conciliacionesValidadas,
    empleadosActivos
  };
}

export async function graficasDashboard() {
  const [porEstado, porEntidad, porOrigen, porTipo, fechas] = await prisma.$transaction([
    prisma.incapacidad.groupBy({ by: ['estado'], _count: { _all: true } }),
    prisma.incapacidad.groupBy({ by: ['entidadId'], _count: { _all: true } }),
    prisma.incapacidad.groupBy({ by: ['origen'], _count: { _all: true } }),
    prisma.incapacidad.groupBy({ by: ['tipo'], _count: { _all: true } }),
    prisma.incapacidad.findMany({ select: { fechaInicio: true } })
  ]);

  const entidades = await prisma.entidadSalud.findMany({
    select: { id: true, nombre: true, tipo: true }
  });
  const entidadesPorId = new Map(entidades.map((entidad) => [entidad.id, entidad]));

  const porMesMap = new Map();
  for (const item of fechas) {
    const clave = item.fechaInicio.toISOString().slice(0, 7);
    porMesMap.set(clave, (porMesMap.get(clave) ?? 0) + 1);
  }
  const porMes = [...porMesMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([mes, total]) => ({ mes, total }));

  return {
    porEstado: porEstado.map((item) => ({ estado: item.estado, total: item._count._all })),
    porEntidad: porEntidad.map((item) => ({
      entidadId: item.entidadId,
      nombre: entidadesPorId.get(item.entidadId)?.nombre ?? 'Desconocida',
      tipo: entidadesPorId.get(item.entidadId)?.tipo ?? null,
      total: item._count._all
    })),
    porOrigen: porOrigen.map((item) => ({ origen: item.origen, total: item._count._all })),
    porTipo: porTipo.map((item) => ({ tipo: item.tipo, total: item._count._all })),
    porMes
  };
}

export async function ultimosRegistrosDashboard() {
  const [incapacidades, pagos, cobros, alertas, conciliaciones] = await prisma.$transaction([
    prisma.incapacidad.findMany({
      include: includeReciente,
      orderBy: { creadoEn: 'desc' },
      take: 5
    }),
    prisma.pago.findMany({
      include: {
        entidad: { select: { id: true, nombre: true, tipo: true } },
        registradoPor: { select: { id: true, nombre: true } },
        soporteDocumento: { select: { id: true, nombreOriginal: true, tipo: true, mimeType: true, tamanoBytes: true } },
        cobro: {
          include: {
            incapacidad: {
              select: {
                id: true,
                codigo: true,
                estado: true,
                empleado: { select: { id: true, identificacion: true, nombres: true, apellidos: true } }
              }
            },
            radicacion: { select: { id: true, numeroRadicado: true, fechaTranscripcion: true, fechaRadicacion: true } }
          }
        }
      },
      orderBy: { creadoEn: 'desc' },
      take: 5
    }),
    prisma.cobro.findMany({
      include: {
        incapacidad: {
          select: {
            id: true,
            codigo: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            empleado: { select: { id: true, identificacion: true, nombres: true, apellidos: true } },
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
      },
      orderBy: { creadoEn: 'desc' },
      take: 5
    }),
    prisma.alerta.findMany({
      include: {
        incapacidad: {
          select: {
            id: true,
            codigo: true,
            fechaInicio: true,
            fechaFin: true,
            estado: true,
            origen: true,
            empleado: { select: { id: true, identificacion: true, nombres: true, apellidos: true, area: true } },
            entidad: { select: { id: true, nombre: true, tipo: true } }
          }
        }
      },
      orderBy: { fechaGenerada: 'desc' },
      take: 5
    }),
    prisma.conciliacion.findMany({
      include: {
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
                        empleado: { select: { id: true, identificacion: true, nombres: true, apellidos: true } }
                      }
                    },
                    radicacion: { select: { id: true, numeroRadicado: true, fechaRadicacion: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { creadoEn: 'desc' },
      take: 5
    })
  ]);

  return {
    incapacidades: incapacidades.map((item) => ({
      id: item.id,
      codigo: item.codigo,
      estado: item.estado,
      fechaInicio: item.fechaInicio,
      empleado: item.empleado ? {
        id: item.empleado.id,
        identificacion: item.empleado.identificacion,
        nombreCompleto: `${item.empleado.nombres} ${item.empleado.apellidos}`
      } : null,
      entidad: item.entidad
    })),
    pagos: pagos.map((pago) => toPagoDto(pago)),
    cobros: cobros.map((cobro) => toCobroDto(cobro)),
    alertas: alertas.map((alerta) => toAlertaDto(alerta)),
    conciliaciones: conciliaciones.map((conciliacion) => toConciliacionDto(conciliacion))
  };
}
