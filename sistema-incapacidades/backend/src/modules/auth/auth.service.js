import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../utils/api-response.js';
import { comparePassword } from '../../utils/password.js';
import { registrarAuditoria } from '../auditoria/audit.service.js';
import { toUsuarioDto } from '../usuarios/usuario.dto.js';

const includeUsuario = {
  rol: {
    include: {
      permisos: { include: { permiso: true } }
    }
  }
};

export async function autenticar(datos, req) {
  const correo = datos.correo.trim().toLowerCase();
  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    include: includeUsuario
  });

  const contrasenaValida = usuario?.activo
    ? await comparePassword(datos.password, usuario.passwordHash)
    : false;

  if (!contrasenaValida) {
    await registrarAuditoria({
      usuarioId: usuario?.id ?? null,
      accion: 'LOGIN_FALLIDO',
      entidad: 'AUTENTICACION',
      entidadId: usuario?.id ?? null,
      req
    });

    throw new AppError(401, 'Credenciales inválidas');
  }

  const ultimoAcceso = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso }
    });

    await registrarAuditoria({
      usuarioId: usuario.id,
      accion: 'LOGIN',
      entidad: 'USUARIO',
      entidadId: usuario.id,
      req,
      client: tx
    });
  });

  return toUsuarioDto({ ...usuario, ultimoAcceso });
}

export async function obtenerPerfil(usuarioId) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: includeUsuario
  });

  if (!usuario || !usuario.activo) {
    throw new AppError(401, 'Usuario no activo');
  }

  return toUsuarioDto(usuario);
}

export async function registrarSalida(req) {
  if (!req.usuario) {
    return;
  }

  await registrarAuditoria({
    usuarioId: req.usuario.id,
    accion: 'LOGOUT',
    entidad: 'USUARIO',
    entidadId: req.usuario.id,
    req
  });
}
