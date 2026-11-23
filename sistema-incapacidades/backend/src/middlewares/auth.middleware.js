import { env } from '../config/env.js';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/api-response.js';
import { verificarToken } from '../utils/token.js';

async function cargarUsuario(req) {
  const token = req.cookies?.[env.JWT_COOKIE_NAME];

  if (!token) {
    throw new AppError(401, 'No autenticado');
  }

  let payload;

  try {
    payload = verificarToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError(401, 'La sesión ha expirado');
    }
    throw new AppError(401, 'Sesión inválida');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(payload.sub) },
    include: {
      rol: {
        include: {
          permisos: {
            include: { permiso: true }
          }
        }
      }
    }
  });

  if (!usuario || !usuario.activo || !usuario.rol) {
    throw new AppError(401, 'Usuario no activo o rol no válido');
  }

  req.usuario = usuario;
  req.permisos = usuario.rol.permisos.map((item) => item.permiso.clave);

  return usuario;
}

export async function requireAuth(req, res, next) {
  try {
    await cargarUsuario(req);
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    await cargarUsuario(req);
  } catch {
    req.usuario = null;
    req.permisos = [];
  }
  return next();
}

export function requirePermission(...claves) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new AppError(401, 'No autenticado'));
    }

    const autorizado = claves.some((clave) => req.permisos.includes(clave));

    if (!autorizado) {
      return next(new AppError(403, 'No tienes permiso para realizar esta acción'));
    }

    return next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new AppError(401, 'No autenticado'));
    }

    if (!roles.includes(req.usuario.rol.nombre)) {
      return next(new AppError(403, 'Rol no autorizado para esta acción'));
    }

    return next();
  };
}
