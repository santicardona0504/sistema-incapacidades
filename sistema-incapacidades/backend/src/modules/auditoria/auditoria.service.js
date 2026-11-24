import { prisma } from '../../utils/prisma.js';

export async function listarAuditoria(filtros = {}) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = {};

  if (filtros.accion) where.accion = { contains: filtros.accion, mode: 'insensitive' };
  if (filtros.entidad) where.entidad = { contains: filtros.entidad, mode: 'insensitive' };
  if (filtros.entidadId) where.entidadId = filtros.entidadId;
  if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.creadoEn = {};
    if (filtros.fechaDesde) where.creadoEn.gte = filtros.fechaDesde;
    if (filtros.fechaHasta) where.creadoEn.lte = filtros.fechaHasta;
  }

  const [total, eventos] = await prisma.$transaction([
    prisma.bitacoraAuditoria.count({ where }),
    prisma.bitacoraAuditoria.findMany({
      where,
      include: { usuario: { select: { id: true, nombre: true, correo: true } } },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { creadoEn: 'desc' }
    })
  ]);

  return {
    eventos: eventos.map((evento) => ({
      id: evento.id,
      accion: evento.accion,
      entidad: evento.entidad,
      entidadId: evento.entidadId,
      detalles: evento.detalles,
      direccionIp: evento.direccionIp,
      usuario: evento.usuario,
      creadoEn: evento.creadoEn
    })),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}
