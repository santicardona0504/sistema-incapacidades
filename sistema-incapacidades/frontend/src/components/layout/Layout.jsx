import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const NAVEGACION = [
  {
    titulo: 'Principal',
    items: [
      { a: '/', texto: 'Dashboard', permiso: 'INCAPACIDADES_VER', icono: 'D', exacto: true }
    ]
  },
  {
    titulo: 'Gestión',
    items: [
      { a: '/empleados', texto: 'Empleados', permiso: 'EMPLEADOS_VER', icono: 'E' },
      { a: '/incapacidades', texto: 'Incapacidades', permiso: 'INCAPACIDADES_VER', icono: 'I' },
      { a: '/radicaciones', texto: 'Radicaciones', permiso: 'RADICACIONES_VER', icono: 'R' },
      { a: '/documentos', texto: 'Documentos', permiso: 'DOCUMENTOS_VER', icono: 'D' },
      { a: '/historial', texto: 'Historial', permiso: 'HISTORIAL_VER', icono: 'H' }
    ]
  },
  {
    titulo: 'Cobros y pagos',
    items: [
      { a: '/cobros', texto: 'Cobros', permiso: 'COBROS_VER', icono: 'C' },
      { a: '/pagos', texto: 'Pagos', permiso: 'PAGOS_VER', icono: 'P' },
      { a: '/conciliaciones', texto: 'Conciliaciones', permiso: 'CONCILIACIONES_VER', icono: 'C' },
      { a: '/alertas', texto: 'Alertas', permiso: 'ALERTAS_VER', icono: 'A' }
    ]
  },
  {
    titulo: 'Administración',
    items: [
      { a: '/reportes', texto: 'Reportes', permiso: 'REPORTES_VER', icono: 'R' },
      { a: '/auditoria', texto: 'Auditoría', permiso: 'AUDITORIA_VER', icono: 'A' },
      { a: '/usuarios', texto: 'Usuarios', permiso: 'USUARIOS_VER', icono: 'U' },
      { a: '/roles', texto: 'Roles y permisos', permiso: 'ROLES_VER', icono: 'RP' }
    ]
  }
];

const TITULOS = {
  '/': 'Dashboard',
  '/empleados': 'Empleados',
  '/incapacidades': 'Incapacidades',
  '/radicaciones': 'Radicaciones',
  '/documentos': 'Documentos',
  '/historial': 'Historial de incapacidades',
  '/cobros': 'Cobros',
  '/pagos': 'Pagos',
  '/conciliaciones': 'Conciliaciones',
  '/alertas': 'Alertas',
  '/reportes': 'Reportes',
  '/auditoria': 'Auditoría',
  '/usuarios': 'Usuarios',
  '/roles': 'Roles y permisos'
};

function tituloDeRuta(ruta) {
  if (TITULOS[ruta]) return TITULOS[ruta];
  const coincidencia = Object.keys(TITULOS)
    .filter((clave) => clave !== '/')
    .find((clave) => ruta.startsWith(clave));
  return coincidencia ? TITULOS[coincidencia] : 'Sistema de Incapacidades';
}

export function Layout() {
  const { usuario, logout, tienePermiso } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [abierta, setAbierta] = useState(false);

  useEffect(() => { setAbierta(false); }, [ubicacion.pathname]);

  const secciones = useMemo(() => NAVEGACION
    .map((seccion) => ({
      ...seccion,
      items: seccion.items.filter((item) => tienePermiso(item.permiso))
    }))
    .filter((seccion) => seccion.items.length > 0), [tienePermiso]);

  const cerrarSesion = async () => {
    try {
      await logout();
      toast.exito('Sesión cerrada correctamente');
    } catch {
      toast.aviso('La sesión se cerró localmente');
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="app-shell">
      {abierta && <div className="sidebar-overlay d-lg-none" onClick={() => setAbierta(false)} />}

      <aside className={`sidebar ${abierta ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">SI</div>
          <div>
            <strong className="d-block">Gestión de</strong>
            <strong className="d-block">Incapacidades</strong>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {secciones.map((seccion) => (
            <div key={seccion.titulo} className="mb-3">
              <p className="sidebar-section">{seccion.titulo}</p>
              {seccion.items.map((item) => (
                <NavLink
                  key={item.a}
                  to={item.a}
                  end={item.exacto}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-icon">{item.icono}</span>
                  <span>{item.texto}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="d-flex align-items-center gap-2">
            <div className="avatar">{usuario?.nombre?.slice(0, 1).toUpperCase() ?? 'U'}</div>
            <div className="min-width-0">
              <p className="mb-0 small fw-semibold text-truncate">{usuario?.nombre}</p>
              <small className="text-truncate d-block">{usuario?.rol?.nombre ?? 'Sin rol'}</small>
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-outline-light w-100 mt-3" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-lg-none me-2"
            aria-label="Abrir menú"
            onClick={() => setAbierta((valor) => !valor)}
          >
            ☰
          </button>
          <div className="flex-grow-1">
            <h1 className="h6 mb-0 fw-bold">{tituloDeRuta(ubicacion.pathname)}</h1>
            <small className="text-muted d-none d-sm-block">Sistema Web de Gestión de Incapacidades</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            {tienePermiso('ALERTAS_VER') && (
              <NavLink to="/alertas" className="btn btn-sm btn-outline-primary position-relative" title="Alertas">
                Alertas
              </NavLink>
            )}
            <span className="badge rounded-pill bg-light text-dark border d-none d-md-inline">
              {usuario?.rol?.nombre ?? 'Usuario'}
            </span>
            <div className="avatar avatar-sm">{usuario?.nombre?.slice(0, 1).toUpperCase() ?? 'U'}</div>
          </div>
        </header>

        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
