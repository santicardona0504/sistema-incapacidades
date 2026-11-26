import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { dashboardService } from '../services/gestion.service.js';
import { esCancelado, mensajeError } from '../api/client.js';
import { etiqueta } from '../utils/constantes.js';
import { formatoDinero, formatoFecha } from '../utils/formato.js';
import { StatCard } from '../components/common/StatCard.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../components/common/States.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';

const COLORES = ['#1d4ed8', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

export function DashboardPage() {
  const [resumen, setResumen] = useState(null);
  const [graficas, setGraficas] = useState(null);
  const [ultimos, setUltimos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  const controladorRef = useRef(null);

  const cargar = useCallback(async () => {
    controladorRef.current?.abort();
    const controlador = new AbortController();
    controladorRef.current = controlador;
    const opciones = { signal: controlador.signal };

    setActualizando(true);
    setError(null);

    const resultados = await Promise.allSettled([
      dashboardService.resumen(opciones),
      dashboardService.graficas(opciones),
      dashboardService.ultimos(opciones)
    ]);

    if (controlador.signal.aborted) return;

    const [resultadoResumen, resultadoGraficas, resultadoUltimos] = resultados;
    if (resultadoResumen.status === 'fulfilled') setResumen(resultadoResumen.value.data);
    if (resultadoGraficas.status === 'fulfilled') setGraficas(resultadoGraficas.value.data);
    if (resultadoUltimos.status === 'fulfilled') setUltimos(resultadoUltimos.value.data);

    const fallos = resultados.filter((resultado) => resultado.status === 'rejected' && !esCancelado(resultado.reason));
    if (fallos.length > 0) setError(fallos.map((fallo) => mensajeError(fallo.reason)).join(' · '));

    setCargando(false);
    setActualizando(false);
  }, []);

  useEffect(() => {
    cargar();
    return () => controladorRef.current?.abort();
  }, [cargar]);

  const porEstado = useMemo(
    () => (graficas?.porEstado ?? []).map((item) => ({ ...item, nombre: etiqueta(item.estado) })),
    [graficas]
  );
  const porOrigen = useMemo(
    () => (graficas?.porOrigen ?? []).map((item) => ({ ...item, nombre: etiqueta(item.origen) })),
    [graficas]
  );

  const sinInformacion = Boolean(resumen)
    && Number(resumen.totalIncapacidades ?? 0) === 0
    && Number(resumen.cobrosPendientes ?? 0) === 0
    && Number(resumen.pagosRealizados ?? 0) === 0
    && Number(resumen.totalAlertas ?? 0) === 0
    && Number(resumen.conciliaciones ?? 0) === 0;

  if (cargando && !resumen && !graficas && !ultimos) return <Loading mensaje="Cargando dashboard…" />;

  return (
    <>
      <PageHeader
        titulo="Dashboard general"
        subtitulo="Indicadores actualizados de incapacidades, cobros, pagos y alertas"
        acciones={[
          <button key="actualizar" type="button" className="btn btn-outline-secondary" onClick={cargar} disabled={actualizando}>
            {actualizando ? 'Actualizando…' : 'Actualizar'}
          </button>
        ]}
      />

      {error && <div className="mb-3"><ErrorState mensaje={error} onReintentar={cargar} /></div>}

      {sinInformacion && (
        <div className="alert alert-info mb-4" role="status">
          No hay información registrada. Comienza creando empleados, entidades e incapacidades desde los formularios.
        </div>
      )}

      <div className="row g-3 mb-4">
        <StatCard titulo="Incapacidades" valor={resumen?.totalIncapacidades ?? 0} subtitulo="Registro acumulado" icono="I" variante="primary" />
        <StatCard titulo="Cobros pendientes" valor={resumen?.cobrosPendientes ?? 0} subtitulo="Con saldo por recaudar" icono="C" variante="warning" />
        <StatCard titulo="Pagos realizados" valor={resumen?.pagosRealizados ?? 0} subtitulo={formatoDinero(resumen?.totalPagosRealizados ?? 0)} icono="P" variante="success" />
        <StatCard titulo="Alertas no leídas" valor={resumen?.alertasNoLeidas ?? 0} subtitulo={`${resumen?.totalAlertas ?? 0} alertas en total`} icono="A" variante="danger" />
      </div>

      {!sinInformacion && <div className="row g-3 mb-4">
        <div className="col-12 col-xl-8">
          <div className="card chart-card shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Incapacidades por estado</h5>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={porEstado} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#1d4ed8" radius={[6, 6, 0, 0]} name="Incapacidades" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4">
          <div className="card chart-card shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Distribución por origen</h5>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie data={porOrigen} dataKey="total" nameKey="nombre" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {(porOrigen ?? []).map((entrada, indice) => (
                      <Cell key={entrada.origen} fill={COLORES[indice % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>}

      {!sinInformacion && <div className="row g-3 mb-4">
        <div className="col-12 col-xl-7">
          <div className="card chart-card shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Tendencia mensual</h5>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={graficas?.porMes ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} name="Incapacidades" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-5">
          <div className="card chart-card shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Incapacidades por entidad</h5>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={graficas?.porEntidad ?? []} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nombre" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#10b981" radius={[0, 6, 6, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>}

      {!sinInformacion && <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Últimas incapacidades</h6>
              <Link to="/incapacidades" className="small">Ver todas</Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 small">
                <thead className="table-light"><tr><th>Código</th><th>Empleado</th><th>Entidad</th><th>Estado</th></tr></thead>
                <tbody>
                  {(ultimos?.incapacidades ?? []).map((item) => (
                    <tr key={item.id}>
                      <td><Link to={`/incapacidades/${item.id}`}>{item.codigo}</Link></td>
                      <td>{item.empleado?.nombreCompleto ?? '—'}</td>
                      <td>{item.entidad?.nombre ?? '—'}</td>
                      <td><StatusBadge valor={item.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Actividad reciente</h6>
              <Link to="/auditoria" className="small">Auditoría</Link>
            </div>
            <div className="list-group list-group-flush">
              {(ultimos?.pagos ?? []).slice(0, 3).map((pago) => (
                <div key={`pago-${pago.id}`} className="list-group-item d-flex justify-content-between gap-2 small">
                  <span>Pago registrado · {pago.cobro?.incapacidad?.empleado?.nombreCompleto ?? '—'}</span>
                  <span className="text-success fw-semibold text-nowrap">{formatoDinero(pago.valorPagado)}</span>
                </div>
              ))}
              {(ultimos?.cobros ?? []).slice(0, 3).map((cobro) => (
                <div key={`cobro-${cobro.id}`} className="list-group-item d-flex justify-content-between gap-2 small">
                  <span>Cobro {cobro.numeroSolicitud}</span>
                  <StatusBadge valor={cobro.estado} />
                </div>
              ))}
              {(ultimos?.alertas ?? []).slice(0, 3).map((alerta) => (
                <div key={`alerta-${alerta.id}`} className="list-group-item d-flex justify-content-between gap-2 small">
                  <span>Alerta {etiqueta(alerta.umbral)} · {alerta.incapacidad?.codigo ?? '—'}</span>
                  <span className="text-muted text-nowrap">{formatoFecha(alerta.fechaGenerada)}</span>
                </div>
              ))}
              {(ultimos?.conciliaciones ?? []).slice(0, 2).map((conciliacion) => (
                <div key={`conciliacion-${conciliacion.id}`} className="list-group-item d-flex justify-content-between gap-2 small">
                  <span>Conciliación {conciliacion.periodo}</span>
                  <span className="text-muted text-nowrap">{conciliacion.estadoVisible}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>}
    </>
  );
}
