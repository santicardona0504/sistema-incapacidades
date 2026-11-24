import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service.js';
import { esCancelado } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const controlador = new AbortController();

    authService.me({ signal: controlador.signal })
      .then((respuesta) => {
        if (!controlador.signal.aborted) setUsuario(respuesta.data.usuario ?? null);
      })
      .catch((fallo) => {
        if (!esCancelado(fallo) && !controlador.signal.aborted) setUsuario(null);
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, []);

  const login = useCallback(async (credenciales) => {
    const respuesta = await authService.login(credenciales);
    setUsuario(respuesta.data.usuario);
    return respuesta.data.usuario;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUsuario(null);
    }
  }, []);

  const tienePermiso = useCallback((permiso) => {
    if (!permiso) return true;
    return (usuario?.permisos ?? []).includes(permiso);
  }, [usuario]);

  const tieneAlgunPermiso = useCallback((permisos = []) => {
    if (permisos.length === 0) return true;
    return permisos.some((permiso) => tienePermiso(permiso));
  }, [tienePermiso]);

  const valor = useMemo(() => ({
    usuario,
    permisos: usuario?.permisos ?? [],
    cargando,
    login,
    logout,
    tienePermiso,
    tieneAlgunPermiso
  }), [usuario, cargando, login, logout, tienePermiso, tieneAlgunPermiso]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}
