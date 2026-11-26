import { Component } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { RutaPrivada } from './guards/RutaPrivada.jsx';
import { Layout } from './components/layout/Layout.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { EmpleadosPage } from './pages/empleados/EmpleadosPage.jsx';
import { EmpleadoDetallePage } from './pages/empleados/EmpleadoDetallePage.jsx';
import { IncapacidadesPage } from './pages/incapacidades/IncapacidadesPage.jsx';
import { IncapacidadFormPage } from './pages/incapacidades/IncapacidadFormPage.jsx';
import { IncapacidadDetallePage } from './pages/incapacidades/IncapacidadDetallePage.jsx';
import { RadicacionesPage } from './pages/incapacidades/RadicacionesPage.jsx';
import { DocumentosPage } from './pages/incapacidades/DocumentosPage.jsx';
import { HistorialPage } from './pages/incapacidades/HistorialPage.jsx';
import { CobrosPage } from './pages/financiero/CobrosPage.jsx';
import { PagosPage } from './pages/financiero/PagosPage.jsx';
import { ConciliacionesPage } from './pages/financiero/ConciliacionesPage.jsx';
import { ConciliacionDetallePage } from './pages/financiero/ConciliacionDetallePage.jsx';
import { AlertasPage } from './pages/financiero/AlertasPage.jsx';
import { ReportesPage } from './pages/reportes/ReportesPage.jsx';
import { AuditoriaPage } from './pages/administracion/AuditoriaPage.jsx';
import { UsuariosPage } from './pages/administracion/UsuariosPage.jsx';
import { RolesPage } from './pages/administracion/RolesPage.jsx';
import { EntidadesPage } from './pages/administracion/EntidadesPage.jsx';

function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h1 className="display-4 fw-bold text-primary">404</h1>
      <p className="text-muted">La página que buscas no existe.</p>
      <Link to="/" className="btn btn-primary">Volver al dashboard</Link>
    </div>
  );
}

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('Error de renderizado', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container py-5">
          <div className="alert alert-danger" role="alert">
            <h1 className="h5 alert-heading">No fue posible mostrar esta pantalla</h1>
            <p className="mb-3 small">{this.state.error.message ?? 'Error inesperado'}</p>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => this.setState({ error: null })}>
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RutaPrivada />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />

            <Route path="empleados" element={<EmpleadosPage />} />
            <Route path="empleados/:id" element={<EmpleadoDetallePage />} />

            <Route path="incapacidades" element={<IncapacidadesPage />} />
            <Route path="incapacidades/nueva" element={<IncapacidadFormPage />} />
            <Route path="incapacidades/:id" element={<IncapacidadDetallePage />} />
            <Route path="incapacidades/:id/editar" element={<IncapacidadFormPage />} />
            <Route path="incapacidades/:id/radicaciones" element={<RadicacionesPage />} />
            <Route path="incapacidades/:id/documentos" element={<DocumentosPage />} />
            <Route path="radicaciones" element={<RadicacionesPage />} />
            <Route path="documentos" element={<DocumentosPage />} />
            <Route path="historial" element={<HistorialPage />} />

            <Route path="cobros" element={<CobrosPage />} />
            <Route path="pagos" element={<PagosPage />} />
            <Route path="conciliaciones" element={<ConciliacionesPage />} />
            <Route path="conciliaciones/:id" element={<ConciliacionDetallePage />} />
            <Route path="alertas" element={<AlertasPage />} />

            <Route path="reportes" element={<ReportesPage />} />
            <Route path="auditoria" element={<AuditoriaPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="entidades" element={<EntidadesPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
