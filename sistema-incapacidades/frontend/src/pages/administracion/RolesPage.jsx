import { useCallback, useEffect, useState } from 'react';
import { userService } from '../../services/usuario.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';

export function RolesPage() {
  const { tienePermiso } = useAuth();
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [rol, setRol] = useState(null);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const peticiones = [userService.roles()];
      if (tienePermiso('PERMISOS_VER')) peticiones.push(userService.permisos());
      const respuestas = await Promise.all(peticiones);
      setRoles(respuestas[0].data ?? []);
      if (respuestas[1]) setPermisos(respuestas[1].data ?? []);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [tienePermiso]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!tienePermiso('ROLES_VER')) return <AccesoDenegado />;
  if (cargando) return <Loading />;
  if (error) return <ErrorState mensaje={error} onReintentar={cargar} />;

  const abrir = (registro) => {
    setRol(registro);
    setSeleccionados(permisos.filter((permiso) => registro.permisos?.includes(permiso.clave)).map((permiso) => permiso.id));
    setErrorFormulario(null);
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorFormulario(null);
    try {
      await userService.asignarPermisos(rol.id, seleccionados);
      toast.exito('Permisos actualizados correctamente');
      setRol(null);
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const alternar = (id) => {
    setSeleccionados((actuales) => actuales.includes(id) ? actuales.filter((item) => item !== id) : [...actuales, id]);
  };

  return (
    <>
      <PageHeader titulo="Roles y permisos" subtitulo="Administración de perfiles de acceso" />

      <div className="row g-3">
        {roles.map((registro) => (
          <div key={registro.id} className="col-12 col-xl-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                  <h5 className="fw-bold mb-0">{registro.nombre}</h5>
                  <div className="d-flex gap-2">
                    <span className="badge bg-primary">{registro.totalUsuarios} usuarios</span>
                    <span className="badge bg-light text-dark border">{registro.totalPermisos} permisos</span>
                  </div>
                </div>
                <p className="text-muted small">{registro.descripcion ?? 'Sin descripción'}</p>
                <div className="d-flex flex-wrap gap-1 mb-3">
                  {(registro.permisos ?? []).slice(0, 12).map((clave) => (
                    <span key={clave} className="badge bg-light text-dark border">{clave}</span>
                  ))}
                  {(registro.permisos?.length ?? 0) > 12 && <span className="badge bg-light text-dark border">+{registro.permisos.length - 12}</span>}
                </div>
                {tienePermiso('PERMISOS_ASIGNAR') && (
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => abrir(registro)}>Asignar permisos</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {rol && (
        <div className="modal d-block" role="dialog" aria-modal="true">
          <div className="modal-backdrop show" style={{ opacity: 0.45 }} onClick={() => setRol(null)} />
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">Permisos de {rol.nombre}</h5>
                <button type="button" className="btn-close" onClick={() => setRol(null)} />
              </div>
              <div className="modal-body">
                {errorFormulario && <div className="alert alert-danger">{errorFormulario}</div>}
                <div className="row g-2">
                  {permisos.map((permiso) => (
                    <div key={permiso.id} className="col-12 col-md-6">
                      <div className="form-check border rounded p-2 h-100">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`permiso-${permiso.id}`}
                          checked={seleccionados.includes(permiso.id)}
                          onChange={() => alternar(permiso.id)}
                        />
                        <label className="form-check-label" htmlFor={`permiso-${permiso.id}`}>
                          <strong className="d-block small">{permiso.clave}</strong>
                          <small className="text-muted">{permiso.descripcion}</small>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer bg-light">
                <span className="me-auto text-muted small">{seleccionados.length} seleccionados</span>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setRol(null)}>Cancelar</button>
                <button type="button" className="btn btn-primary" disabled={guardando} onClick={guardar}>
                  {guardando ? 'Guardando…' : 'Guardar permisos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
