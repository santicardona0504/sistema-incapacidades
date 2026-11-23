import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';

function toEntidadDto(entidad) {
  return {
    id: entidad.id,
    nit: entidad.nit,
    nombre: entidad.nombre,
    tipo: entidad.tipo,
    activa: entidad.activa,
    creadoEn: entidad.creadoEn
  };
}

function construirFiltros(filtros) {
  const where = {};

  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.activa !== undefined) where.activa = filtros.activa === 'true';

  if (filtros.buscar) {
    where.OR = [
      { nit: { contains: filtros.buscar, mode: 'insensitive' } },
      { nombre: { contains: filtros.buscar, mode: 'insensitive' } }
    ];
  }

  return where;
}

export async function listarEntidades(filtros) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, entidades] = await prisma.$transaction([
    prisma.entidadSalud.count({ where }),
    prisma.entidadSalud.findMany({
      where,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { nombre: 'asc' }
    })
  ]);

  return {
    entidades: entidades.map(toEntidadDto),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function obtenerEntidad(id) {
  const entidad = await prisma.entidadSalud.findUnique({ where: { id } });

  if (!entidad) {
    throw new AppError(404, 'Entidad no encontrada');
  }

  return toEntidadDto(entidad);
}
