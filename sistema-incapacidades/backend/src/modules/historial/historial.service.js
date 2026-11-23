import { prisma } from '../../utils/prisma.js';

function construirFiltros(filtros) {
  const where = {};

  if (filtros.incapacidadId !== undefined) where.incapacidadId = filtros.incapacidadId;
  if (filtros.usuarioId !== undefined) where.usuarioId = filtros.usuarioId;
  if (filtros.estadoNuevo) where.estadoNuevo = filtros.estadoNuevo;

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.fechaCambio = {};
    if (filtros.fechaDesde) where.fechaCambio.gte = filtros.fechaDesde;
    if (filtros.fechaHasta) where.fechaCambio.lte = filtros.fechaHasta;
  }

  return where;
}

export async function listarHistorial(filtros) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, registros] = await prisma.$transaction([
    prisma.historialEstado.count({ where }),
    prisma.historialEstado.findMany({
      where,
      include: {
        incapacidad: { select: { id: true, codigo: true } },
        usuario: { select: { id: true, nombre: true } }
      },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { fechaCambio: 'desc' }
    })
  ]);

  return {
    historial: registros.map((registro) => ({
      id: registro.id,
      incapacidad: registro.incapacidad,
      estadoAnterior: registro.estadoAnterior,
      estadoNuevo: registro.estadoNuevo,
      fechaCambio: registro.fechaCambio,
      observaciones: registro.observaciones,
      usuario: registro.usuario
    })),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}
