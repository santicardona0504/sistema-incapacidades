import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { conciliacionService } from '../../services/gestion.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { FilterBar } from '../../components/common/FilterBar.jsx';
import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { FormModal } from '../../components/common/Modals.jsx';
import { formatoDinero, formatoFecha } from '../../utils/formato.js';

const ESTADOS = ['EN_CONSOLIDACION', 'EN_REVISION', 'VALIDADA'];

export function ConciliacionesPage() {
  const { tienePermiso } = useAuth();
  const toast = useToast();
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [valoresFiltro, setValoresFiltro] = useState({});
  const [filtros, setFiltros] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [abrir, setAbrir] = useState(false);
  const [valores, setValores] = useState({ periodo: '', fechaInicio: '', fechaFin: '', observaciones: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await conciliacionService.listar({ ...filtros, pagina });
      setFilas(respuesta.data.conciliaciones ?? []);
      setTotal(respuesta.data.total ?? 0);
      setTotalPaginas(respuesta.data.totalPaginas ?? 1);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!tienePermiso('CONCILIACIONES_VER')) return <AccesoDenegado />;

  const crear = async () => {
    setGuardando(true);
    setErrorFormulario(null);
    try {
      await conciliacionService.crear(valores);
      toast.exito('Conciliación creada correctamente');
      setAbrir(false);
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const columnas = [
    { titulo: 'Periodo', clave: 'periodo', render: (fila) => <Link to={`/conciliaciones/${fila.id}`} className="fw-semibold">{fila.periodo}</Link> },
    { titulo: 'Desde', clave: 'fechaInicio', render: (fila) => formatoFecha(fila.fechaInicio) },
    { titulo: 'Hasta', clave: 'fechaFin', render: (fila) => formatoFecha(fila.fechaFin) },
    { titulo: 'Estado', clave: 'estado', render: (fila) => <StatusBadge valor={fila.estado} texto={fila.estadoVisible} /> },
    { titulo: 'Detalles', clave: 'totalDetalles' },
    { titulo: 'Pagado', clave: 'totalPagado', render: (fila) => formatoDinero(fila.totalPagado) },
    { titulo: 'Conciliado', clave: 'totalConciliado', render: (fila) => formatoDinero(fila.totalConciliado) },
    {
      titulo: 'Diferencia', clave: 'totalDiferencia',
      render: (fila) => <span className={Number(fila.totalDiferencia) !== 0 ? 'text-danger fw-semibold' : 'text-success'}>{formatoDinero(fila.totalDiferencia)}</span>
    },
    { titulo: 'Consolidador', clave: 'consolidadaPor', render: (fila) => fila.consolidadaPor?.nombre ?? '—' }
  ];

  return (
    <>
      <PageHeader
        titulo="Conciliaciones"
        subtitulo="Consolidación y validación de pagos por periodo"
        acciones={tienePermiso('CONCILIACIONES_CONSOLIDAR') ? [
          <button key="nueva" type="button" className="btn btn-primary" onClick={() => setAbrir(true)}>+ Nueva conciliación</button>
        ] : []}
      />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body pb-0">
          <FilterBar
            campos={[
              { clave: 'periodo', etiqueta: 'Periodo', placeholder: 'YYYY-MM' },
              {
                clave: 'estado', etiqueta: 'Estado', tipo: 'select',
                opciones: ESTADOS.map((valor) => ({ valor, etiqueta: valor.replaceAll('_', ' ') }))
              },
              { clave: 'fechaDesde', etiqueta: 'Desde', tipo: 'date' },
              { clave: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date' }
            ]}
            valores={valoresFiltro}
            onChange={setValoresFiltro}
            onBuscar={() => { setFiltros({ ...valoresFiltro }); setPagina(1); }}
            onLimpiar={() => { setValoresFiltro({}); setFiltros({}); setPagina(1); }}
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {error ? (
            <div className="p-3"><ErrorState mensaje={error} onReintentar={cargar} /></div>
          ) : (
            <DataTable
              columnas={columnas}
              filas={filas}
              cargando={cargando}
              total={total}
              pagina={pagina}
              totalPaginas={totalPaginas}
              onPagina={setPagina}
              acciones={(fila) => <Link className="btn btn-outline-primary" to={`/conciliaciones/${fila.id}`}>Ver detalle</Link>}
              vacio="No hay conciliaciones registradas"
            />
          )}
        </div>
      </div>

      {abrir && (
        <FormModal
          titulo="Nueva conciliación"
          campos={[
            { clave: 'periodo', etiqueta: 'Periodo (YYYY-MM)', requerido: true, placeholder: '2026-01' },
            { clave: 'fechaInicio', etiqueta: 'Fecha de inicio', tipo: 'date', requerido: true },
            { clave: 'fechaFin', etiqueta: 'Fecha de fin', tipo: 'date', requerido: true },
            { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }
          ]}
          valores={valores}
          onChange={(clave, valor) => setValores((actuales) => ({ ...actuales, [clave]: valor }))}
          onSubmit={crear}
          onClose={() => setAbrir(false)}
          guardando={guardando}
          error={errorFormulario}
        />
      )}
    </>
  );
}
