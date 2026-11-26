import { useEffect, useRef, useState } from 'react';
import { reporteService } from '../../services/gestion.service.js';
import { esCancelado, mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { FilterBar } from '../../components/common/FilterBar.jsx';
import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState } from '../../components/common/States.jsx';
import { ESTADOS_COBRO, ESTADOS_INCAPACIDAD, ORIGENES, TIPOS_INCAPACIDAD, UMBRALES, etiqueta } from '../../utils/constantes.js';
import { formatoDinero, formatoFecha } from '../../utils/formato.js';

const NOMBRES = {
  incapacidades: 'General de incapacidades',
  'cobros-pendientes': 'Cobros pendientes',
  'pagos-realizados': 'Pagos realizados',
  'pagos-pendientes': 'Pagos pendientes',
  rechazadas: 'Incapacidades rechazadas',
  prolongadas: 'Incapacidades prolongadas',
  conciliaciones: 'Conciliaciones'
};

const ESTADOS = [...new Set([
  ...ESTADOS_INCAPACIDAD,
  ...ESTADOS_COBRO,
  'EN_CONSOLIDACION', 'EN_REVISION', 'VALIDADA'
])];

export function ReportesPage() {
  const { tienePermiso } = useAuth();
  const toast = useToast();
  const [tipos, setTipos] = useState([]);
  const [tipo, setTipo] = useState('incapacidades');
  const [valoresFiltro, setValoresFiltro] = useState({});
  const [filtros, setFiltros] = useState({});
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const controladorTiposRef = useRef(null);
  const controladorConsultaRef = useRef(null);

  useEffect(() => {
    const controlador = new AbortController();
    controladorTiposRef.current = controlador;
    reporteService.tipos({ signal: controlador.signal })
      .then((respuesta) => {
        if (!controlador.signal.aborted) setTipos(respuesta.data ?? []);
      })
      .catch((fallo) => {
        if (!esCancelado(fallo) && !controlador.signal.aborted) setError(mensajeError(fallo));
      });
    return () => controlador.abort();
  }, []);

  const consultar = async (filtrosEfectivos = filtros) => {
    controladorConsultaRef.current?.abort();
    const controlador = new AbortController();
    controladorConsultaRef.current = controlador;

    setCargando(true);
    setError(null);
    try {
      const respuesta = await reporteService.consultar(tipo, filtrosEfectivos, { signal: controlador.signal });
      if (!controlador.signal.aborted) setReporte(respuesta.data);
    } catch (fallo) {
      if (!esCancelado(fallo) && !controlador.signal.aborted) setError(mensajeError(fallo));
    } finally {
      if (!controlador.signal.aborted) setCargando(false);
    }
  };

  const limpiar = () => {
    // Cancelar la consulta en curso para que una respuesta tardía no reponga
    // el reporte o los filtros después de limpiar.
    controladorConsultaRef.current?.abort();
    controladorConsultaRef.current = null;
    setValoresFiltro({});
    setFiltros({});
    setReporte(null);
    setError(null);
    setCargando(false);
  };

  useEffect(() => () => controladorConsultaRef.current?.abort(), []);

  const exportar = async () => {
    try {
      await reporteService.descargar(tipo, filtros, `${reporte?.nombre ?? tipo}.csv`);
      toast.exito('Reporte exportado en CSV');
    } catch (fallo) {
      toast.error(mensajeError(fallo));
    }
  };

  if (!tienePermiso('REPORTES_VER')) return <AccesoDenegado />;

  const columnas = (reporte?.columnas ?? []).map((columna) => ({
    titulo: columna.titulo,
    clave: columna.clave,
    render: (fila) => {
      const valor = fila[columna.clave];
      if (valor === undefined || valor === null || valor === '') return '—';
      if (typeof valor === 'number' && /valor|saldo|total|pagado|conciliado|diferencia/i.test(columna.clave)) return formatoDinero(valor);
      if (/fecha/i.test(columna.clave)) return formatoFecha(valor);
      if (columna.clave === 'estado') return etiqueta(valor);
      return valor;
    }
  }));

  return (
    <>
      <PageHeader
        titulo="Reportes"
        subtitulo="Consulta y exportación de información operativa y financiera"
        acciones={[
          <button key="consultar" type="button" className="btn btn-primary" onClick={() => consultar()} disabled={cargando}>Consultar</button>,
          <button key="exportar" type="button" className="btn btn-outline-primary" onClick={exportar} disabled={cargando || !reporte}>Exportar CSV</button>
        ]}
      />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="tipoReporte">Tipo de reporte</label>
            <select
              id="tipoReporte"
              className="form-select"
              value={tipo}
              onChange={(evento) => {
                setTipo(evento.target.value);
                setReporte(null);
              }}
            >
              {tipos.map((valor) => <option key={valor} value={valor}>{NOMBRES[valor] ?? valor}</option>)}
            </select>
          </div>
          <FilterBar
            campos={[
              { clave: 'fechaDesde', etiqueta: 'Desde', tipo: 'date' },
              { clave: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date' },
              { clave: 'empleadoId', etiqueta: 'ID empleado', placeholder: 'Ej. 3' },
              { clave: 'entidadId', etiqueta: 'ID entidad', placeholder: 'Ej. 2' },
              {
                clave: 'tipo', etiqueta: 'Tipo incapacidad', tipo: 'select',
                opciones: TIPOS_INCAPACIDAD.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
              },
              {
                clave: 'estado', etiqueta: 'Estado', tipo: 'select',
                opciones: ESTADOS.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
              },
              {
                clave: 'origen', etiqueta: 'Origen', tipo: 'select',
                opciones: ORIGENES.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
              },
              { clave: 'numeroRadicado', etiqueta: 'Número radicado', placeholder: 'RAD-2026-0001' },
              ...(tipo === 'prolongadas' ? [
                {
                  clave: 'umbral', etiqueta: 'Umbral', tipo: 'select',
                  opciones: UMBRALES.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
                },
                {
                  clave: 'leida', etiqueta: 'Lectura', tipo: 'select',
                  opciones: [{ valor: 'false', etiqueta: 'No leídas' }, { valor: 'true', etiqueta: 'Leídas' }]
                }
              ] : [])
            ]}
            valores={valoresFiltro}
            onChange={setValoresFiltro}
            onBuscar={() => { const siguientes = { ...valoresFiltro }; setFiltros(siguientes); consultar(siguientes); }}
            onLimpiar={limpiar}
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0">{reporte?.nombre ?? 'Vista previa'}</h6>
          {reporte && <span className="text-muted small">{reporte.filas?.length ?? 0} filas</span>}
        </div>
        <div className="card-body p-0">
          {error ? (
            <div className="p-3"><ErrorState mensaje={error} onReintentar={() => consultar()} /></div>
          ) : (
            <DataTable
              columnas={columnas}
              filas={reporte?.filas ?? []}
              cargando={cargando}
              vacio={reporte ? 'No hay información registrada para los filtros seleccionados' : 'Selecciona los filtros y presiona Consultar'}
            />
          )}
        </div>
      </div>
    </>
  );
}
