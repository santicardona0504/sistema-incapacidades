import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';

function toRolDto(rol) {
  return {
    id: rol.id,
    nombre: rol.nombre,
    descripcion: rol.descripcion,
    totalUsuarios: rol._count?.usuarios,
    totalPermisos: rol._count?.permisos ?? rol.permisos?.length ?? 0,
    permisos: rol.permisos?.map((item) => item.permiso.clave) ?? []
  };
}

export async function listarRoles() {
  const roles = await prisma.rol.findMany({
    include: {
      _count: {
        select: { usuarios: true, permisos: true }
      }
    },
    orderBy: { id: 'asc' }
  });

  return roles.map(toRolDto);
}

export async function obtenerRol(id) {
  const rol = await prisma.rol.findUnique({
    where: { id },
    include: {
      permisos: { include: { permiso: true } },
      _count: { select: { usuarios: true, permisos: true } }
    }
  });

  if (!rol) {
    throw new AppError(404, 'Rol no encontrado');
  }

  return toRolDto(rol);
}

export async function listarPermisos() {
  return prisma.permiso.findMany({
    select: { id: true, clave: true, descripcion: true },
    orderBy: { clave: 'asc' }
  });
}

export async function asignarPermisos(id, permisoIds, req) {
  const rol = await prisma.rol.findUnique({ where: { id } });

  if (!rol) {
    throw new AppError(404, 'Rol no encontrado');
  }

  const unicos = [...new Set(permisoIds)];
  const permisos = await prisma.permiso.findMany({
    where: { id: { in: unicos } },
    select: { id: true }
  });

  if (permisos.length !== unicos.length) {
    throw new AppError(400, 'Uno o más permisos no existen');
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    await tx.rolPermiso.deleteMany({ where: { rolId: id } });

    if (unicos.length > 0) {
      await tx.rolPermiso.createMany({
        data: unicos.map((permisoId) => ({ rolId: id, permisoId }))
      });
    }

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'ROL_ASIGNAR_PERMISOS',
      entidad: 'ROL',
      entidadId: id,
      detalles: { permisoIds: unicos },
      req,
      client: tx
    });

    return tx.rol.findUnique({
      where: { id },
      include: {
        permisos: { include: { permiso: true } },
        _count: { select: { usuarios: true, permisos: true } }
      }
    });
  });

  return toRolDto(actualizado);
}
