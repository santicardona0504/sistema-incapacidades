import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';

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

async function validarNitDisponible(nit, idExcluido) {
  const existente = await prisma.entidadSalud.findUnique({ where: { nit } });

  if (existente && existente.id !== idExcluido) {
    throw new AppError(409, 'El NIT ya está registrado');
  }
}

export async function crearEntidad(datos, req) {
  await validarNitDisponible(datos.nit);

  const entidad = await prisma.$transaction(async (tx) => {
    const creada = await tx.entidadSalud.create({ data: datos });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'ENTIDAD_CREAR',
      entidad: 'ENTIDAD_SALUD',
      entidadId: creada.id,
      req,
      client: tx
    });

    return creada;
  });

  return toEntidadDto(entidad);
}

export async function editarEntidad(id, datos, req) {
  const entidad = await prisma.entidadSalud.findUnique({ where: { id } });

  if (!entidad) {
    throw new AppError(404, 'Entidad no encontrada');
  }

  if (datos.nit) {
    await validarNitDisponible(datos.nit, id);
  }

  const actualizada = await prisma.$transaction(async (tx) => {
    const resultado = await tx.entidadSalud.update({ where: { id }, data: datos });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'ENTIDAD_EDITAR',
      entidad: 'ENTIDAD_SALUD',
      entidadId: id,
      detalles: { campos: Object.keys(datos) },
      req,
      client: tx
    });

    return resultado;
  });

  return toEntidadDto(actualizada);
}

export async function cambiarEstadoEntidad(id, activa, req) {
  const entidad = await prisma.entidadSalud.findUnique({ where: { id } });

  if (!entidad) {
    throw new AppError(404, 'Entidad no encontrada');
  }

  const actualizada = await prisma.$transaction(async (tx) => {
    const resultado = await tx.entidadSalud.update({ where: { id }, data: { activa } });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: activa ? 'ENTIDAD_ACTIVAR' : 'ENTIDAD_DESACTIVAR',
      entidad: 'ENTIDAD_SALUD',
      entidadId: id,
      req,
      client: tx
    });

    return resultado;
  });

  return toEntidadDto(actualizada);
}
