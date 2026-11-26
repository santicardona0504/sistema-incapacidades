import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cobroService } from '../../services/cobro.service.js';
import { incapacidadService } from '../../services/incapacidad.service.js';
import { entidadService } from '../../services/empleado.service.js';
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
import { ESTADOS_COBRO, etiqueta } from '../../utils/constantes.js';
import { formatoDinero, formatoFecha } from '../../utils/formato.js';
import { listarTodo } from '../../utils/listados.js';

const ESTADOS_EDITABLES = ['PENDIENTE', 'GESTIONADO', 'COMPROMISO_PAGO', 'RECHAZADO'];

export function CobrosPage() {
  const { tienePermiso } = useAuth();
  const toast = useToast();

  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [valoresFiltro, setValoresFiltro] = useState({ soloPendientes: 'true' });
  const [filtros, setFiltros] = useState({ soloPendientes: 'true' });
  const [incapacidades, setIncapacidades] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [radicaciones, setRadicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [valores, setValores] = useState({});
  const [gestiones, setGestiones] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await cobroService.listar({ ...filtros, pagina });
      setFilas(respuesta.data.cobros ?? []);
      setTotal(respuesta.data.total ?? 0);
      setTotalPaginas(respuesta.data.totalPaginas ?? 1);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    Promise.all([
      listarTodo(incapacidadService.listar, {}, 'incapacidades'),
      listarTodo(entidadService.listar, { activa: 'true' }, 'entidades')
    ]).then(([respuestaIncapacidades, respuestaEntidades]) => {
      setIncapacidades(respuestaIncapacidades.data.incapacidades ?? []);
      setEntidades(respuestaEntidades.data.entidades ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!valores.incapacidadId) { setRadicaciones([]); return; }
    cobroService.radicacionesDeIncapacidad(valores.incapacidadId)
      .then((respuesta) => setRadicaciones(respuesta.data ?? []))
      .catch(() => setRadicaciones([]));
  }, [valores.incapacidadId]);

  if (!tienePermiso('COBROS_VER')) return <AccesoDenegado />;

  const cerrar = () => {
    setModal(null);
    setValores({});
    setGestiones([]);
    setErrorFormulario(null);
  };

  const abrirNuevo = () => {
    setValores({
      incapacidadId: '', radicacionId: '', numeroSolicitud: '',
      fechaSolicitud: new Date().toISOString().slice(0, 10),
      valorReconocido: '', observaciones: ''
    });
    setErrorFormulario(null);
    setModal('crear');
  };

  const abrirEditar = (fila) => {
    setValores({ id: fila.id, estado: fila.estado, observaciones: fila.observaciones ?? '' });
    setErrorFormulario(null);
    setModal('editar');
  };

  const abrirGestiones = async (fila) => {
    setValores({ id: fila.id, numeroSolicitud: fila.numeroSolicitud, fechaGestion: new Date().toISOString().slice(0, 10), compromisoPago: '', observaciones: '' });
    setErrorFormulario(null);
    setModal('gestiones');
    try {
      const respuesta = await cobroService.gestiones(fila.id);
      setGestiones(respuesta.data ?? []);
    } catch {
      setGestiones([]);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorFormulario(null);
    try {
      if (modal === 'crear') {
        await cobroService.crear({
          incapacidadId: Number(valores.incapacidadId),
          radicacionId: Number(valores.radicacionId),
          numeroSolicitud: valores.numeroSolicitud,
          fechaSolicitud: valores.fechaSolicitud,
          valorReconocido: Number(valores.valorReconocido),
          observaciones: valores.observaciones || undefined
        });
        toast.exito('Cobro registrado correctamente');
      } else if (modal === 'editar') {
        await cobroService.actualizar(valores.id, {
          estado: valores.estado,
          observaciones: valores.observaciones || undefined
        });
        toast.exito('Cobro actualizado correctamente');
      } else if (modal === 'gestiones') {
        await cobroService.registrarGestion(valores.id, {
          fechaGestion: valores.fechaGestion,
          compromisoPago: valores.compromisoPago || undefined,
          observaciones: valores.observaciones
        });
        toast.exito('Gestión registrada correctamente');
      }
      cerrar();
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const columnas = [
    { titulo: 'Solicitud', clave: 'numeroSolicitud', render: (fila) => <span className="fw-semibold">{fila.numeroSolicitud}</span> },
    { titulo: 'Incapacidad', clave: 'incapacidad', render: (fila) => <Link to={`/incapacidades/${fila.incapacidad?.id}`}>{fila.incapacidad?.codigo ?? '—'}</Link> },
    { titulo: 'Empleado', clave: 'empleado', render: (fila) => fila.incapacidad?.empleado?.nombreCompleto ?? '—' },
    { titulo: 'Entidad', clave: 'entidad', render: (fila) => fila.entidad?.nombre ?? '—' },
    { titulo: 'Radicación', clave: 'radicacion', render: (fila) => fila.radicacion?.numeroRadicado ?? '—' },
    { titulo: 'Valor', clave: 'valorReconocido', render: (fila) => formatoDinero(fila.valorReconocido) },
    { titulo: 'Saldo', clave: 'saldoPendiente', render: (fila) => formatoDinero(fila.saldoPendiente ?? fila.valorReconocido) },
    { titulo: 'Estado', clave: 'estado', render: (fila) => <StatusBadge valor={fila.estado} /> }
  ];

  const camposCrear = [
    {
      clave: 'incapacidadId', etiqueta: 'Incapacidad', tipo: 'select', requerido: true, ancho: 'col-12',
      opciones: incapacidades
        .filter((item) => ['TRANSCRITA', 'COBRADA'].includes(item.estado))
        .map((item) => ({ valor: item.id, etiqueta: `${item.codigo} · ${item.empleado?.nombreCompleto ?? ''} · ${item.estado}` }))
    },
    {
      clave: 'radicacionId', etiqueta: 'Radicación vinculada', tipo: 'select', requerido: true, ancho: 'col-12',
      opciones: radicaciones.map((item) => ({
        valor: item.id,
        etiqueta: `${item.numeroRadicado} · ${item.entidad?.nombre ?? ''} · rechazos: ${item.totalRechazos ?? 0} · cobros: ${item.totalCobros ?? 0}`
      })),
      ayuda: 'Selecciona explícitamente la radicación del cobro. No se asume automáticamente la más reciente.'
    },
    { clave: 'numeroSolicitud', etiqueta: 'Número de solicitud', requerido: true },
    { clave: 'fechaSolicitud', etiqueta: 'Fecha de solicitud', tipo: 'date', requerido: true },
    { clave: 'valorReconocido', etiqueta: 'Valor reconocido', tipo: 'number', requerido: true },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }
  ];

  const camposEditar = [
    {
      clave: 'estado', etiqueta: 'Estado', tipo: 'select', requerido: true,
      opciones: ESTADOS_EDITABLES.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
    },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }
  ];

  const camposGestion = [
    { clave: 'fechaGestion', etiqueta: 'Fecha de gestión', tipo: 'date', requerido: true },
    { clave: 'compromisoPago', etiqueta: 'Compromiso de pago', tipo: 'date' },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', requerido: true, ancho: 'col-12' }
  ];

  return (
    <>
      <PageHeader
        titulo="Cobros"
        subtitulo="Solicitudes de cobro vinculadas a una radicación específica"
        acciones={tienePermiso('COBROS_CREAR') ? [
          <button key="nuevo" type="button" className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo cobro</button>
        ] : []}
      />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body pb-0">
          <FilterBar
            campos={[
              { clave: 'buscar', etiqueta: 'Buscar', placeholder: 'Número de solicitud' },
              {
                clave: 'incapacidadId', etiqueta: 'ID incapacidad', tipo: 'number', placeholder: 'Ej. 12'
              },
              {
                clave: 'entidadId', etiqueta: 'Entidad', tipo: 'select',
                opciones: entidades.map((entidad) => ({ valor: entidad.id, etiqueta: entidad.nombre }))
              },
              {
                clave: 'estado', etiqueta: 'Estado', tipo: 'select',
                opciones: ESTADOS_COBRO.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
              },
              { clave: 'fechaDesde', etiqueta: 'Desde', tipo: 'date' },
              { clave: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date' },
              {
                clave: 'soloPendientes', etiqueta: 'Solo pendientes', tipo: 'select',
                opciones: [{ valor: 'true', etiqueta: 'Sí' }, { valor: 'false', etiqueta: 'No' }]
              }
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
              acciones={(fila) => (
                <>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => abrirGestiones(fila)}>Gestiones</button>
                  {tienePermiso('COBROS_CREAR') && (
                    <button type="button" className="btn btn-outline-primary" onClick={() => abrirEditar(fila)}>Editar</button>
                  )}
                </>
              )}
              vacio="No hay cobros registrados"
            />
          )}
        </div>
      </div>

      {modal && modal !== 'gestiones' && (
        <FormModal
          titulo={modal === 'crear' ? 'Nuevo cobro' : 'Editar cobro'}
          campos={modal === 'crear' ? camposCrear : camposEditar}
          valores={valores}
          onChange={(clave, valor) => setValores((actuales) => ({ ...actuales, [clave]: valor }))}
          onSubmit={guardar}
          onClose={cerrar}
          onLimpiar={(vacios) => setValores((actuales) => ({ ...actuales, ...vacios }))}
          guardando={guardando}
          error={errorFormulario}
        />
      )}

      {modal === 'gestiones' && (
        <div className="modal d-block" role="dialog" aria-modal="true">
          <div className="modal-backdrop show" style={{ opacity: 0.45 }} onClick={cerrar} />
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <form onSubmit={(evento) => { evento.preventDefault(); guardar(); }}>
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold">Gestiones de cobro · {valores.numeroSolicitud}</h5>
                  <button type="button" className="btn-close" onClick={cerrar} />
                </div>
                <div className="modal-body">
                  {errorFormulario && <div className="alert alert-danger">{errorFormulario}</div>}
                  <div className="table-responsive mb-4">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light"><tr><th>Fecha</th><th>Compromiso</th><th>Observaciones</th><th>Usuario</th></tr></thead>
                      <tbody>
                        {gestiones.length === 0 ? <tr><td colSpan="4" className="text-center text-muted">Sin gestiones</td></tr> : gestiones.map((item) => (
                          <tr key={item.id}>
                            <td>{formatoFecha(item.fechaGestion)}</td>
                            <td>{formatoFecha(item.compromisoPago)}</td>
                            <td>{item.observaciones}</td>
                            <td>{item.usuario?.nombre ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {tienePermiso('COBROS_CREAR') && (
                    <div className="row g-3">
                      {camposGestion.map((campo) => (
                        <div key={campo.clave} className={`col-12 ${campo.ancho ?? 'col-md-6'}`}>
                          <label className="form-label fw-semibold" htmlFor={`gestion-${campo.clave}`}>{campo.etiqueta}{campo.requerido ? ' *' : ''}</label>
                          {campo.tipo === 'textarea' ? (
                            <textarea
                              id={`gestion-${campo.clave}`}
                              className="form-control"
                              rows="3"
                              required={campo.requerido}
                              value={valores[campo.clave] ?? ''}
                              onChange={(evento) => setValores((actuales) => ({ ...actuales, [campo.clave]: evento.target.value }))}
                            />
                          ) : (
                            <input
                              id={`gestion-${campo.clave}`}
                              type={campo.tipo}
                              className="form-control"
                              required={campo.requerido}
                              value={valores[campo.clave] ?? ''}
                              onChange={(evento) => setValores((actuales) => ({ ...actuales, [campo.clave]: evento.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={cerrar}>Cerrar</button>
                  {tienePermiso('COBROS_CREAR') && (
                    <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar gestión'}</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
