import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { empleadoService } from '../../services/empleado.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { formatoFecha } from '../../utils/formato.js';

function Detalle({ campo, valor }) {
  return (
    <div className="col-6 col-md-4 col-lg-3 mb-3">
      <p className="detail-label">{campo}</p>
      <p className="detail-value mb-0">{valor ?? '—'}</p>
    </div>
  );
}

export function EmpleadoDetallePage() {
  const { id } = useParams();
  const { tienePermiso } = useAuth();
  const [empleado, setEmpleado] = useState(null);
  const [incapacidades, setIncapacidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [respuestaEmpleado, respuestaIncapacidades] = await Promise.all([
        empleadoService.obtener(id),
        empleadoService.historial(id)
      ]);
      setEmpleado(respuestaEmpleado.data);
      setIncapacidades(respuestaIncapacidades.data.incapacidades ?? []);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!tienePermiso('EMPLEADOS_VER')) return <AccesoDenegado />;
  if (cargando) return <Loading />;
  if (error) return <ErrorState mensaje={error} onReintentar={cargar} />;

  return (
    <>
      <PageHeader
        titulo={empleado.nombreCompleto}
        subtitulo={`${empleado.cargo} · ${empleado.area}`}
        acciones={[
          <Link key="volver" to="/empleados" className="btn btn-outline-secondary">Volver</Link>,
          <Link key="nueva" to={`/incapacidades/nueva?empleadoId=${empleado.id}`} className="btn btn-primary">
            Registrar incapacidad
          </Link>
        ]}
      />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Información del empleado</h5>
          <div className="row">
            <Detalle campo="Identificación" valor={empleado.identificacion} />
            <Detalle campo="Correo" valor={empleado.correo} />
            <Detalle campo="Teléfono" valor={empleado.telefono} />
            <Detalle campo="Estado" valor={empleado.activo ? 'Activo' : 'Inactivo'} />
            <Detalle campo="Total incapacidades" valor={empleado.totalIncapacidades} />
            <Detalle campo="Ingreso al sistema" valor={formatoFecha(empleado.creadoEn)} />
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">
          <h6 className="fw-bold mb-0">Historial de incapacidades</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr><th>Código</th><th>Tipo</th><th>Origen</th><th>Entidad</th><th>Inicio</th><th>Fin</th><th>Días</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {incapacidades.length === 0 ? (
                <tr><td colSpan="9" className="text-center text-muted py-4">Sin incapacidades registradas</td></tr>
              ) : incapacidades.map((item) => (
                <tr key={item.id}>
                  <td><Link to={`/incapacidades/${item.id}`} className="fw-semibold">{item.codigo}</Link></td>
                  <td>{item.tipo.replaceAll('_', ' ').toLowerCase()}</td>
                  <td>{item.origen === 'COMUN' ? 'Común' : 'Laboral'}</td>
                  <td>{item.entidad?.nombre ?? '—'}</td>
                  <td>{formatoFecha(item.fechaInicio)}</td>
                  <td>{formatoFecha(item.fechaFin)}</td>
                  <td>{item.dias}</td>
                  <td><StatusBadge valor={item.estado} /></td>
                  <td className="text-end"><Link className="btn btn-sm btn-outline-primary" to={`/incapacidades/${item.id}`}>Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
