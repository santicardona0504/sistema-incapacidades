import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { alertaService } from '../../services/gestion.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { FilterBar } from '../../components/common/FilterBar.jsx';
import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { ESTADOS_INCAPACIDAD, UMBRALES, etiqueta } from '../../utils/constantes.js';
import { formatoFechaHora } from '../../utils/formato.js';

export function AlertasPage() {
  const { tienePermiso } = useAuth();
  const toast = useToast();
  const [resumen, setResumen] = useState(null);
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [valoresFiltro, setValoresFiltro] = useState({});
  const [filtros, setFiltros] = useState({});
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [respuestaResumen, respuestaLista] = await Promise.all([
        alertaService.resumen(),
        alertaService.listar({ ...filtros, pagina })
      ]);
      setResumen(respuestaResumen.data);
      setFilas(respuestaLista.data.alertas ?? []);
      setTotal(respuestaLista.data.total ?? 0);
      setTotalPaginas(respuestaLista.data.totalPaginas ?? 1);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!tienePermiso('ALERTAS_VER')) return <AccesoDenegado />;

  const ejecutar = async (accion, mensaje) => {
    setProcesando(true);
    try {
      await accion();
      toast.exito(mensaje);
      cargar();
    } catch (fallo) {
      toast.error(mensajeError(fallo));
    } finally {
      setProcesando(false);
    }
  };

  const columnas = [
    { titulo: 'Umbral', clave: 'umbral', render: (fila) => <span className="badge bg-light text-dark border">{etiqueta(fila.umbral)}</span> },
    { titulo: 'Días transcurridos', clave: 'diasTranscurridos', render: (fila) => <strong>{fila.diasTranscurridos}</strong> },
    {
      titulo: 'Incapacidad', clave: 'incapacidad',
      render: (fila) => <Link to={`/incapacidades/${fila.incapacidad?.id}`}>{fila.incapacidad?.codigo ?? '—'}</Link>
    },
    { titulo: 'Empleado', clave: 'empleado', render: (fila) => fila.incapacidad?.empleado?.nombreCompleto ?? '—' },
    { titulo: 'Entidad', clave: 'entidad', render: (fila) => fila.incapacidad?.entidad?.nombre ?? '—' },
    { titulo: 'Estado', clave: 'estado', render: (fila) => <StatusBadge valor={fila.incapacidad?.estado} /> },
    { titulo: 'Generada', clave: 'fechaGenerada', render: (fila) => formatoFechaHora(fila.fechaGenerada) },
    { titulo: 'Lectura', clave: 'leida', render: (fila) => fila.leida ? <span className="badge bg-secondary">Leída</span> : <span className="badge bg-warning text-dark">No leída</span> }
  ];

  return (
    <>
      <PageHeader
        titulo="Alertas"
        subtitulo="Seguimiento de incapacidades prolongadas por umbral de días"
        acciones={[
          <button
            key="generar" type="button" className="btn btn-primary"
            disabled={procesando}
            onClick={() => ejecutar(() => alertaService.generar(), 'Alertas generadas/actualizadas correctamente')}
          >
            Generar alertas
          </button>,
          <button
            key="leidas" type="button" className="btn btn-outline-secondary"
            disabled={procesando}
            onClick={() => ejecutar(() => alertaService.marcarTodas(), 'Alertas marcadas como leídas')}
          >
            Marcar todas como leídas
          </button>
        ]}
      />

      <div className="row g-3 mb-4">
        <StatCard titulo="Total alertas" valor={resumen?.totales ?? 0} subtitulo="Acumuladas" icono="A" variante="primary" />
        <StatCard titulo="No leídas" valor={resumen?.noLeidas ?? 0} subtitulo="Requieren atención" icono="N" variante="danger" />
        {(resumen?.porTipo ?? []).map((item, indice) => (
          <StatCard key={item.umbral} titulo={etiqueta(item.umbral)} valor={item.total} subtitulo={`${item.umbralDias} días`} icono={String(indice + 1)} variante={['warning', 'info', 'primary', 'secondary'][indice % 4]} />
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body pb-0">
          <FilterBar
            campos={[
              {
                clave: 'umbral', etiqueta: 'Umbral', tipo: 'select',
                opciones: UMBRALES.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
              },
              {
                clave: 'leida', etiqueta: 'Lectura', tipo: 'select',
                opciones: [{ valor: 'false', etiqueta: 'No leídas' }, { valor: 'true', etiqueta: 'Leídas' }]
              },
              {
                clave: 'estado', etiqueta: 'Estado incapacidad', tipo: 'select',
                opciones: ESTADOS_INCAPACIDAD.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
              },
              { clave: 'empleadoId', etiqueta: 'ID empleado', placeholder: 'Ej. 3' },
              { clave: 'entidadId', etiqueta: 'ID entidad', placeholder: 'Ej. 2' },
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
              acciones={(fila) => !fila.leida ? (
                <button
                  type="button" className="btn btn-outline-primary"
                  onClick={() => ejecutar(() => alertaService.marcarLeida(fila.id), 'Alerta marcada como leída')}
                >
                  Marcar leída
                </button>
              ) : null}
              vacio="No hay alertas para los filtros seleccionados"
            />
          )}
        </div>
      </div>
    </>
  );
}
