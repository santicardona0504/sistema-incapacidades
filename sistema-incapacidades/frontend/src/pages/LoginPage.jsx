import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { mensajeError } from '../api/client.js';

export function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const ubicacion = useLocation();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const destino = ubicacion.state?.desde ?? '/';

  if (usuario) return <Navigate to={destino} replace />;

  const enviar = async (evento) => {
    evento.preventDefault();
    setCargando(true);
    setError(null);
    try {
      await login({ correo, password });
      navigate(destino, { replace: true });
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="d-flex align-items-center gap-3 mb-5">
          <div className="brand-mark">SI</div>
          <div>
            <strong className="d-block">Sistema Web de</strong>
            <strong className="d-block">Gestión de Incapacidades</strong>
          </div>
        </div>
        <h1>Control integral de incapacidades, cobros y pagos</h1>
        <p className="mt-3">
          Centraliza el registro, la trazabilidad documental, la radicación ante entidades y la
          conciliación financiera con alertas oportunas y reportes confiables.
        </p>
        <div className="d-flex flex-wrap gap-3 mt-5">
          <span className="badge bg-light text-primary">Trazabilidad</span>
          <span className="badge bg-light text-primary">Alertas tempranas</span>
          <span className="badge bg-light text-primary">Reportes</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2 className="h3 fw-bold mb-1">Bienvenido</h2>
          <p className="text-muted mb-4">Ingresa con tu cuenta corporativa para continuar.</p>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={enviar}>
            <div className="mb-3">
              <label htmlFor="correo" className="form-label fw-semibold">Correo electrónico</label>
              <input
                id="correo"
                type="email"
                className="form-control form-control-lg"
                autoComplete="username"
                placeholder="nombre@empresa.com"
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="form-label fw-semibold">Contraseña</label>
              <input
                id="password"
                type="password"
                className="form-control form-control-lg"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-100 fw-semibold" disabled={cargando}>
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="text-muted small mb-0 mt-4">
            Si aún no tienes cuenta, solicita al administrador del sistema que la cree desde Usuarios.
          </p>
        </div>
      </section>
    </div>
  );
}
