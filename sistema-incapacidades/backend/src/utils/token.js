import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function firmarToken(usuario) {
  const rol = typeof usuario.rol === 'string' ? usuario.rol : usuario.rol?.nombre;

  return jwt.sign(
    { sub: usuario.id, rol },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export function verificarToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

export function duracionCookie() {
  const coincidencia = /^(\d+)([smhd])$/.exec(env.JWT_EXPIRES_IN);

  if (!coincidencia) {
    return 8 * 60 * 60 * 1000;
  }

  const cantidad = Number(coincidencia[1]);
  const factores = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return cantidad * factores[coincidencia[2]];
}

export function opcionesCookie() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: duracionCookie(),
    path: '/'
  };
}
