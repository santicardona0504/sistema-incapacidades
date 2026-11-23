import { env } from '../../config/env.js';
import { success } from '../../utils/api-response.js';
import { firmarToken, opcionesCookie } from '../../utils/token.js';
import { autenticar, obtenerPerfil, registrarSalida } from './auth.service.js';

export async function login(req, res, next) {
  try {
    const usuario = await autenticar(req.validated.body, req);
    const token = firmarToken(usuario);

    res.cookie(env.JWT_COOKIE_NAME, token, opcionesCookie());

    return success(res, { usuario }, 'Inicio de sesión exitoso');
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const usuario = await obtenerPerfil(req.usuario.id);
    return success(res, { usuario }, 'Perfil obtenido');
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await registrarSalida(req);
    const opciones = { ...opcionesCookie() };
    delete opciones.maxAge;

    res.clearCookie(env.JWT_COOKIE_NAME, opciones);

    return success(res, null, 'Cierre de sesión exitoso');
  } catch (error) {
    return next(error);
  }
}
