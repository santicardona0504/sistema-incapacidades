import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading } from '../components/common/States.jsx';
import { AccesoDenegado } from '../components/common/ManagePage.jsx';

export function RutaPrivada() {
  const { usuario, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) return <Loading mensaje="Verificando sesión…" />;

  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }

  return <Outlet />;
}

export function Permiso({ clave, children }) {
  const { tienePermiso } = useAuth();
  if (!tienePermiso(clave)) return <AccesoDenegado />;
  return children;
}
