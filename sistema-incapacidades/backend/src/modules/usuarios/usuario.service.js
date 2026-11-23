import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { hashPassword } from '../../utils/password.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { toUsuarioDto } from './usuario.dto.js';

const includeUsuario = {
  rol: {
    include: {
      permisos: { include: { permiso: true } }
    }
  }
};

function construirFiltros(filtros) {
  const where = {};

  if (filtros.activo !== undefined) {
    where.activo = filtros.activo === 'true';
  }

  if (filtros.rolId !== undefined) {
    where.rolId = filtros.rolId;
  }

  if (filtros.buscar) {
    where.OR = [
      { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
      { correo: { contains: filtros.buscar, mode: 'insensitive' } }
    ];
  }

  return where;
}

export async function listarUsuarios(filtros) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = construirFiltros(filtros);

  const [total, usuarios] = await prisma.$transaction([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      include: includeUsuario,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { id: 'asc' }
    })
  ]);

  return {
    usuarios: usuarios.map(toUsuarioDto),
    total,
    pagina,
    limite,
    totalPaginas: Math.ceil(total / limite)
  };
}

export async function obtenerUsuario(id) {
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: includeUsuario
  });

  if (!usuario) {
    throw new AppError(404, 'Usuario no encontrado');
  }

  return toUsuarioDto(usuario);
}

async function validarCorreoDisponible(correo, idExcluido) {
  const existente = await prisma.usuario.findUnique({ where: { correo } });

  if (existente && existente.id !== idExcluido) {
    throw new AppError(409, 'El correo ya está registrado');
  }
}

async function validarRol(rolId) {
  const rol = await prisma.rol.findUnique({ where: { id: rolId } });

  if (!rol) {
    throw new AppError(404, 'Rol no encontrado');
  }
}

export async function crearUsuario(datos, req) {
  await validarCorreoDisponible(datos.correo);
  await validarRol(datos.rolId);

  const passwordHash = await hashPassword(datos.password);

  const usuario = await prisma.$transaction(async (tx) => {
    const creado = await tx.usuario.create({
      data: {
        nombre: datos.nombre,
        correo: datos.correo,
        passwordHash,
        rolId: datos.rolId,
        activo: datos.activo
      },
      include: includeUsuario
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'USUARIO_CREAR',
      entidad: 'USUARIO',
      entidadId: creado.id,
      req,
      client: tx
    });

    return creado;
  });

  return toUsuarioDto(usuario);
}

export async function editarUsuario(id, datos, req) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new AppError(404, 'Usuario no encontrado');
  }

  if (datos.correo) {
    await validarCorreoDisponible(datos.correo, id);
  }

  if (datos.rolId) {
    await validarRol(datos.rolId);
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.usuario.update({
      where: { id },
      data: {
        ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
        ...(datos.correo !== undefined ? { correo: datos.correo } : {}),
        ...(datos.rolId !== undefined ? { rolId: datos.rolId } : {}),
        ...(datos.activo !== undefined ? { activo: datos.activo } : {}),
        ...(datos.password ? { passwordHash: await hashPassword(datos.password) } : {})
      },
      include: includeUsuario
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'USUARIO_EDITAR',
      entidad: 'USUARIO',
      entidadId: id,
      detalles: { campos: Object.keys(datos) },
      req,
      client: tx
    });

    return resultado;
  });

  return toUsuarioDto(actualizado);
}

export async function desactivarUsuario(id, req) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw new AppError(404, 'Usuario no encontrado');
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.usuario.update({
      where: { id },
      data: { activo: false },
      include: includeUsuario
    });

    await registrarAuditoria({
      usuarioId: req.usuario.id,
      accion: 'USUARIO_DESACTIVAR',
      entidad: 'USUARIO',
      entidadId: id,
      req,
      client: tx
    });

    return resultado;
  });

  return toUsuarioDto(actualizado);
}
