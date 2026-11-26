import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  documentoService, historialService
} from '../../services/documento.service.js';
import {
  incapacidadService, radicacionService
} from '../../services/incapacidad.service.js';
import { entidadService } from '../../services/empleado.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { FormModal } from '../../components/common/Modals.jsx';
import { ESTADOS_INCAPACIDAD, etiqueta } from '../../utils/constantes.js';
import { fechaParaInput, formatoFecha, formatoFechaHora } from '../../utils/formato.js';
import { listarTodo } from '../../utils/listados.js';

const TRANSICIONES = {
  REGISTRADA: ['TRANSCRITA'],
  TRANSCRITA: ['COBRADA', 'RECHAZADA'],
  COBRADA: ['PAGADA', 'RECHAZADA'],
  RECHAZADA: ['TRANSCRITA'],
  PAGADA: []
};

function Detalle({ campo, valor }) {
  return (
    <div className="col-6 col-md-4 col-lg-3 mb-3">
      <p className="detail-label">{campo}</p>
      <p className="detail-value mb-0">{valor ?? '—'}</p>
    </div>
  );
}

export function IncapacidadDetallePage() {
  const { id } = useParams();
  const { tienePermiso } = useAuth();
  const toast = useToast();

  const [registro, setRegistro] = useState(null);
  const [radicaciones, setRadicaciones] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [rechazos, setRechazos] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [pestana, setPestana] = useState('resumen');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [valores, setValores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [archivo, setArchivo] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const peticiones = [
        incapacidadService.obtener(id),
        radicacionService.listar({ incapacidadId: id, limite: 100 }),
        documentoService.listar({ incapacidadId: id, limite: 100 }),
        historialService.listar({ incapacidadId: id, limite: 100 }),
        incapacidadService.rechazos(id),
        listarTodo(entidadService.listar, { activa: 'true' }, 'entidades')
      ];
      const respuestas = await Promise.all(peticiones);
      setRegistro(respuestas[0].data);
      setRadicaciones(respuestas[1].data.radicaciones ?? []);
      setDocumentos(respuestas[2].data.documentos ?? []);
      setHistorial(respuestas[3].data.historial ?? []);
      setRechazos(respuestas[4].data ?? []);
      setEntidades(respuestas[5].data.entidades ?? []);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!tienePermiso('INCAPACIDADES_VER')) return <AccesoDenegado />;
  if (cargando) return <Loading mensaje="Cargando incapacidad…" />;
  if (error) return <ErrorState mensaje={error} onReintentar={cargar} />;

  const cerrar = () => {
    setFormulario(null);
    setValores({});
    setArchivo(null);
    setErrorFormulario(null);
  };

  const abrir = (tipo, datos = {}) => {
    setFormulario(tipo);
    setValores(datos);
    setArchivo(null);
    setErrorFormulario(null);
  };

  const cambiar = (clave, valor) => setValores((actuales) => ({ ...actuales, [clave]: valor }));

  const guardar = async () => {
    setGuardando(true);
    setErrorFormulario(null);
    try {
      if (formulario === 'estado') {
        await incapacidadService.cambiarEstado(id, valores.estado, valores.observaciones || undefined);
        toast.exito('Estado actualizado correctamente');
      } else if (formulario === 'radicacion') {
        await radicacionService.crear(id, {
          entidadId: Number(valores.entidadId || registro.entidad?.id),
          fechaTranscripcion: valores.fechaTranscripcion,
          numeroRadicado: valores.numeroRadicado,
          fechaRadicacion: valores.fechaRadicacion || undefined,
          responsable: valores.responsable,
          observaciones: valores.observaciones || undefined
        });
        toast.exito('Radicación creada correctamente');
      } else if (formulario === 'rechazo') {
        await incapacidadService.crearRechazo(id, {
          radicacionId: valores.radicacionId ? Number(valores.radicacionId) : undefined,
          causal: valores.causal,
          accionesCorrectivas: valores.accionesCorrectivas || undefined,
          fechaRechazo: valores.fechaRechazo,
          observaciones: valores.observaciones || undefined
        });
        toast.exito('Rechazo registrado correctamente');
      } else if (formulario === 'correccion') {
        await incapacidadService.actualizarCorreccion(valores.id, valores.accionesCorrectivas);
        toast.exito('Acciones correctivas actualizadas');
      }
      cerrar();
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const subirDocumento = async (evento) => {
    evento.preventDefault();
    if (!archivo) {
      setErrorFormulario('Selecciona un archivo');
      return;
    }
    setGuardando(true);
    setErrorFormulario(null);
    try {
      const datos = new FormData();
      datos.append('archivo', archivo);
      datos.append('tipo', valores.tipo);
      if (valores.rechazoId) datos.append('rechazoId', valores.rechazoId);
      await documentoService.subir(id, datos);
      toast.exito('Documento cargado correctamente');
      cerrar();
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const transiciones = TRANSICIONES[registro.estado] ?? [];
  const camposEstado = [
    {
      clave: 'estado', etiqueta: 'Nuevo estado', tipo: 'select', requerido: true,
      opciones: transiciones.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
    },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }
  ];

  const camposRadicacion = [
    {
      clave: 'entidadId', etiqueta: 'Entidad', tipo: 'select', requerido: true,
      opciones: entidades.map((entidad) => ({ valor: entidad.id, etiqueta: entidad.nombre }))
    },
    { clave: 'numeroRadicado', etiqueta: 'Número de radicado', requerido: true },
    { clave: 'fechaTranscripcion', etiqueta: 'Fecha de transcripción', tipo: 'date', requerido: true },
    { clave: 'fechaRadicacion', etiqueta: 'Fecha de radicación', tipo: 'date' },
    { clave: 'responsable', etiqueta: 'Responsable', requerido: true },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }
  ];

  const camposRechazo = [
    {
      clave: 'radicacionId', etiqueta: 'Radicación asociada', tipo: 'select',
      opciones: radicaciones.map((radicacion) => ({ valor: radicacion.id, etiqueta: radicacion.numeroRadicado }))
    },
    { clave: 'fechaRechazo', etiqueta: 'Fecha del rechazo', tipo: 'date', requerido: true },
    { clave: 'causal', etiqueta: 'Causal del rechazo', tipo: 'textarea', requerido: true, ancho: 'col-12' },
    { clave: 'accionesCorrectivas', etiqueta: 'Acciones correctivas', tipo: 'textarea', ancho: 'col-12' },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }
  ];

  const FechaHoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        titulo={`Incapacidad ${registro.codigo}`}
        subtitulo={`${registro.empleado?.nombreCompleto ?? '—'} · ${registro.entidad?.nombre ?? '—'}`}
        acciones={[
          <Link key="volver" to="/incapacidades" className="btn btn-outline-secondary">Volver</Link>,
          <Link key="editar" to={`/incapacidades/${id}/editar`} className="btn btn-outline-primary">Editar</Link>,
          ...(tienePermiso('INCAPACIDADES_EDITAR') && transiciones.length > 0 ? [(
            <button key="estado" type="button" className="btn btn-primary" onClick={() => abrir('estado', { estado: transiciones[0], observaciones: '' })}>
              Cambiar estado
            </button>
          )] : [])
        ]}
      />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
            <StatusBadge valor={registro.estado} />
            <span className="text-muted small">Registrada por {registro.registradaPor?.nombre ?? '—'} el {formatoFecha(registro.creadoEn)}</span>
          </div>
          <div className="row">
            <Detalle campo="Empleado" valor={registro.empleado?.nombreCompleto} />
            <Detalle campo="Identificación" valor={registro.empleado?.identificacion} />
            <Detalle campo="Entidad" valor={registro.entidad?.nombre} />
            <Detalle campo="Tipo" valor={etiqueta(registro.tipo)} />
            <Detalle campo="Origen" valor={etiqueta(registro.origen)} />
            <Detalle campo="Fecha inicio" valor={formatoFecha(registro.fechaInicio)} />
            <Detalle campo="Fecha fin" valor={formatoFecha(registro.fechaFin)} />
            <Detalle campo="Días" valor={registro.dias} />
            <Detalle campo="Recepción" valor={formatoFecha(registro.fechaRecepcion)} />
            <Detalle campo="Radicaciones" valor={registro.totalRadicaciones} />
            <Detalle campo="Documentos" valor={registro.totalDocumentos} />
            <Detalle campo="Rechazos" valor={registro.totalRechazos} />
          </div>
          {registro.observaciones && <p className="border-top pt-3 mb-0 small"><strong>Observaciones:</strong> {registro.observaciones}</p>}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white p-0">
          <ul className="nav nav-tabs card-header-tabs">
            {[
              ['resumen', 'Resumen'],
              ['radicaciones', `Radicaciones (${radicaciones.length})`],
              ['documentos', `Documentos (${documentos.length})`],
              ['historial', 'Historial'],
              ['rechazos', `Rechazos (${rechazos.length})`]
            ].map(([clave, texto]) => (
              <li key={clave} className="nav-item">
                <button type="button" className={`nav-link ${pestana === clave ? 'active' : ''}`} onClick={() => setPestana(clave)}>{texto}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {pestana === 'resumen' && (
            <div className="row g-3">
              <div className="col-md-6">
                <h6 className="fw-bold">Últimos eventos</h6>
                <div className="timeline-item">
                  <strong>{etiqueta(registro.estado)}</strong>
                  <p className="text-muted small mb-0">Estado actual de la incapacidad</p>
                </div>
                {historial.slice(0, 5).map((item) => (
                  <div key={item.id} className="timeline-item">
                    <strong>{etiqueta(item.estadoAnterior)} → {etiqueta(item.estadoNuevo)}</strong>
                    <p className="text-muted small mb-0">{formatoFechaHora(item.fechaCambio)} · {item.usuario?.nombre ?? 'Sistema'}</p>
                  </div>
                ))}
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold">Acciones rápidas</h6>
                <div className="d-grid gap-2">
                  {tienePermiso('RADICACIONES_CREAR') && (
                    <button type="button" className="btn btn-outline-primary text-start" onClick={() => abrir('radicacion', { entidadId: String(registro.entidad?.id ?? ''), fechaTranscripcion: FechaHoy, responsable: '' })}>
                      Registrar nueva radicación
                    </button>
                  )}
                  {tienePermiso('DOCUMENTOS_SUBIR') && (
                    <button type="button" className="btn btn-outline-primary text-start" onClick={() => abrir('documento', { tipo: 'SOPORTE', rechazoId: '' })}>
                      Cargar documento de soporte
                    </button>
                  )}
                  {tienePermiso('INCAPACIDADES_EDITAR') && (
                    <button type="button" className="btn btn-outline-danger text-start" onClick={() => abrir('rechazo', { fechaRechazo: FechaHoy, radicacionId: String(radicaciones[0]?.id ?? ''), causal: '', accionesCorrectivas: '' })}>
                      Registrar rechazo de entidad
                    </button>
                  )}
                  <Link className="btn btn-outline-secondary text-start" to={`/cobros`}>Ver cobros relacionados</Link>
                </div>
              </div>
            </div>
          )}

          {pestana === 'radicaciones' && (
            <>
              <div className="d-flex justify-content-end mb-3">
                {tienePermiso('RADICACIONES_CREAR') && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => abrir('radicacion', { entidadId: String(registro.entidad?.id ?? ''), fechaTranscripcion: FechaHoy, responsable: '' })}>
                    + Nueva radicación
                  </button>
                )}
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th>Radicado</th><th>Entidad</th><th>Transcripción</th><th>Radicación</th><th>Responsable</th><th>Rechazos</th></tr></thead>
                  <tbody>
                    {radicaciones.length === 0 ? <tr><td colSpan="6" className="text-center text-muted py-4">Sin radicaciones</td></tr> : radicaciones.map((item) => (
                      <tr key={item.id}>
                        <td className="fw-semibold">{item.numeroRadicado}</td>
                        <td>{item.entidad?.nombre ?? '—'}</td>
                        <td>{formatoFecha(item.fechaTranscripcion)}</td>
                        <td>{formatoFecha(item.fechaRadicacion)}</td>
                        <td>{item.responsable}</td>
                        <td>{item.avance?.totalRechazos ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {pestana === 'documentos' && (
            <>
              <div className="d-flex justify-content-end mb-3">
                {tienePermiso('DOCUMENTOS_SUBIR') && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => abrir('documento', { tipo: 'SOPORTE', rechazoId: '' })}>
                    + Cargar documento
                  </button>
                )}
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th>Nombre</th><th>Tipo</th><th>Tamaño</th><th>Subido por</th><th>Fecha</th><th /></tr></thead>
                  <tbody>
                    {documentos.length === 0 ? <tr><td colSpan="6" className="text-center text-muted py-4">Sin documentos</td></tr> : documentos.map(item => (
                      <tr key={item.id}>
                        <td className="fw-semibold">{item.nombreOriginal}</td>
                        <td>{item.tipo.replaceAll('_', ' ')}</td>
                        <td>{(item.tamanoBytes / 1024).toFixed(1)} KB</td>
                        <td>{item.subidoPor?.nombre ?? '—'}</td>
                        <td>{formatoFechaHora(item.creadoEn)}</td>
                        <td className="text-end">
                          {tienePermiso('DOCUMENTOS_DESCARGAR') && (
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => documentoService.descargar(item.id, item.nombreOriginal)}>Descargar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {pestana === 'historial' && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Fecha</th><th>Estado anterior</th><th>Estado nuevo</th><th>Usuario</th><th>Observaciones</th></tr></thead>
                <tbody>
                  {historial.length === 0 ? <tr><td colSpan="5" className="text-center text-muted py-4">Sin historial</td></tr> : historial.map((item) => (
                    <tr key={item.id}>
                      <td>{formatoFechaHora(item.fechaCambio)}</td>
                      <td>{etiqueta(item.estadoAnterior)}</td>
                      <td><StatusBadge valor={item.estadoNuevo} /></td>
                      <td>{item.usuario?.nombre ?? 'Sistema'}</td>
                      <td>{item.observaciones ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pestana === 'rechazos' && (
            <>
              <div className="d-flex justify-content-end mb-3">
                {tienePermiso('INCAPACIDADES_EDITAR') && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => abrir('rechazo', { fechaRechazo: FechaHoy, radicacionId: String(radicaciones[0]?.id ?? ''), causal: '', accionesCorrectivas: '' })}>
                    + Registrar rechazo
                  </button>
                )}
              </div>
              {rechazos.map((item) => (
                <div key={item.id} className="border rounded p-3 mb-3">
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <strong>{formatoFecha(item.fechaRechazo)}</strong>
                    <span className="text-muted small">Radicación: {radicaciones.find((rad) => rad.id === item.radicacionId)?.numeroRadicado ?? '—'}</span>
                  </div>
                  <p className="mb-2"><strong>Causal:</strong> {item.causal}</p>
                  <p className="mb-2"><strong>Acciones correctivas:</strong> {item.accionesCorrectivas ?? 'Pendiente'}</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">{item.registradoPor?.nombre ?? '—'} · {item.totalDocumentos} documentos</small>
                    {tienePermiso('INCAPACIDADES_EDITAR') && (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => abrir('correccion', { id: item.id, accionesCorrectivas: item.accionesCorrectivas ?? '' })}>
                        Editar acciones
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {rechazos.length === 0 && <p className="text-muted text-center py-4">No hay rechazos registrados</p>}
            </>
          )}
        </div>
      </div>

      {formulario && formulario !== 'documento' && (
        <FormModal
          titulo={{
            estado: 'Cambiar estado de la incapacidad',
            radicacion: 'Nueva radicación',
            rechazo: 'Registrar rechazo',
            correccion: 'Editar acciones correctivas'
          }[formulario]}
          campos={{
            estado: camposEstado,
            radicacion: camposRadicacion,
            rechazo: camposRechazo,
            correccion: [{ clave: 'accionesCorrectivas', etiqueta: 'Acciones correctivas', tipo: 'textarea', requerido: true, ancho: 'col-12' }]
          }[formulario]}
          valores={valores}
          onChange={cambiar}
          onSubmit={guardar}
          onClose={cerrar}
          onLimpiar={(vacios) => setValores((actuales) => ({ ...actuales, ...vacios }))}
          guardando={guardando}
          error={errorFormulario}
        />
      )}

      {formulario === 'documento' && (
        <div className="modal d-block" role="dialog" aria-modal="true">
          <div className="modal-backdrop show" style={{ opacity: 0.45 }} onClick={cerrar} />
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content border-0 shadow" onSubmit={subirDocumento}>
              <div className="modal-header bg-light"><h5 className="modal-title fw-bold">Cargar documento</h5><button type="button" className="btn-close" onClick={cerrar} /></div>
              <div className="modal-body">
                {errorFormulario && <div className="alert alert-danger">{errorFormulario}</div>}
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="tipoDocumento">Tipo de documento *</label>
                  <select id="tipoDocumento" className="form-select" value={valores.tipo ?? ''} onChange={(e) => cambiar('tipo', e.target.value)} required>
                    {['CERTIFICADO', 'SOPORTE', 'RADICACION', 'CORRECCION', 'SOPORTE_PAGO', 'OTRO'].map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo.replaceAll('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="rechazoDocumento">Rechazo asociado</label>
                  <select id="rechazoDocumento" className="form-select" value={valores.rechazoId ?? ''} onChange={(e) => cambiar('rechazoId', e.target.value)}>
                    <option value="">Ninguno</option>
                    {rechazos.map((item) => <option key={item.id} value={item.id}>{formatoFecha(item.fechaRechazo)}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="archivoDocumento">Archivo (PDF, JPG o PNG, máx. 10 MB) *</label>
                  <input id="archivoDocumento" type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} required />
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={cerrar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Cargando…' : 'Cargar documento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
