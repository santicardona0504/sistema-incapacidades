import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { documentoService } from '../../services/documento.service.js';
import { incapacidadService } from '../../services/incapacidad.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { FilterBar } from '../../components/common/FilterBar.jsx';
import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';
import { formatoFechaHora } from '../../utils/formato.js';

const TIPOS_DOCUMENTO = ['CERTIFICADO', 'SOPORTE', 'RADICACION', 'CORRECCION', 'SOPORTE_PAGO', 'OTRO'];

function DocumentosContenido({ incapacidadId }) {
  const { tienePermiso } = useAuth();
  const toast = useToast();
  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [valoresFiltro, setValoresFiltro] = useState({});
  const [filtros, setFiltros] = useState({});
  const [incapacidades, setIncapacidades] = useState([]);
  const [rechazos, setRechazos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [abrirModal, setAbrirModal] = useState(false);
  const [valores, setValores] = useState({ incapacidadId: incapacidadId ?? '', tipo: 'SOPORTE', rechazoId: '' });
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await documentoService.listar({
        ...filtros,
        pagina,
        ...(incapacidadId ? { incapacidadId } : {})
      });
      setFilas(respuesta.data.documentos ?? []);
      setTotal(respuesta.data.total ?? 0);
      setTotalPaginas(respuesta.data.totalPaginas ?? 1);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina, incapacidadId]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (incapacidadId) {
      incapacidadService.rechazos(incapacidadId).then((respuesta) => setRechazos(respuesta.data ?? [])).catch(() => {});
    } else {
      incapacidadService.listar({ limite: 500 }).then((respuesta) => setIncapacidades(respuesta.data.incapacidades ?? [])).catch(() => {});
    }
  }, [incapacidadId]);

  useEffect(() => {
    if (valores.incapacidadId) {
      incapacidadService.rechazos(valores.incapacidadId).then((respuesta) => setRechazos(respuesta.data ?? [])).catch(() => setRechazos([]));
    }
  }, [valores.incapacidadId]);

  const subir = async (evento) => {
    evento.preventDefault();
    if (!archivo) { setErrorFormulario('Selecciona un archivo'); return; }
    setGuardando(true);
    setErrorFormulario(null);
    try {
      const datos = new FormData();
      datos.append('archivo', archivo);
      datos.append('tipo', valores.tipo);
      if (valores.rechazoId) datos.append('rechazoId', valores.rechazoId);
      await documentoService.subir(valores.incapacidadId, datos);
      toast.exito('Documento cargado correctamente');
      setAbrirModal(false);
      setArchivo(null);
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const columnas = [
    { titulo: 'Nombre', clave: 'nombreOriginal', render: (fila) => <span className="fw-semibold">{fila.nombreOriginal}</span> },
    { titulo: 'Incapacidad', clave: 'incapacidad', render: (fila) => <Link to={`/incapacidades/${fila.incapacidad?.id}`}>{fila.incapacidad?.codigo ?? '—'}</Link> },
    { titulo: 'Tipo', clave: 'tipo', render: (fila) => fila.tipo.replaceAll('_', ' ') },
    { titulo: 'Tamaño', clave: 'tamanoBytes', render: (fila) => `${(fila.tamanoBytes / 1024).toFixed(1)} KB` },
    { titulo: 'Subido por', clave: 'subidoPor', render: (fila) => fila.subidoPor?.nombre ?? '—' },
    { titulo: 'Fecha', clave: 'creadoEn', render: (fila) => formatoFechaHora(fila.creadoEn) }
  ];

  return (
    <>
      <PageHeader
        titulo="Documentos"
        subtitulo="Soportes, certificados y radicaciones cargados al sistema"
        acciones={tienePermiso('DOCUMENTOS_SUBIR') ? [
          <button key="subir" type="button" className="btn btn-primary" onClick={() => setAbrirModal(true)}>+ Cargar documento</button>
        ] : []}
      />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body pb-0">
          <FilterBar
            campos={[
              ...(incapacidadId ? [] : [{
                clave: 'incapacidadId', etiqueta: 'Incapacidad', tipo: 'select',
                opciones: incapacidades.map((item) => ({ valor: item.id, etiqueta: item.codigo }))
              }]),
              {
                clave: 'tipo', etiqueta: 'Tipo', tipo: 'select',
                opciones: TIPOS_DOCUMENTO.map((tipo) => ({ valor: tipo, etiqueta: tipo.replaceAll('_', ' ') }))
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
              acciones={(fila) => tienePermiso('DOCUMENTOS_DESCARGAR') ? (
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => documentoService.descargar(fila.id, fila.nombreOriginal)}>Descargar</button>
              ) : null}
              vacio="No hay documentos registrados"
            />
          )}
        </div>
      </div>

      {abrirModal && (
        <div className="modal d-block" role="dialog" aria-modal="true">
          <div className="modal-backdrop show" style={{ opacity: 0.45 }} onClick={() => setAbrirModal(false)} />
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content border-0 shadow" onSubmit={subir}>
              <div className="modal-header bg-light"><h5 className="modal-title fw-bold">Cargar documento</h5><button type="button" className="btn-close" onClick={() => setAbrirModal(false)} /></div>
              <div className="modal-body">
                {errorFormulario && <div className="alert alert-danger">{errorFormulario}</div>}
                {!incapacidadId && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold" htmlFor="incapacidadDocumento">Incapacidad *</label>
                    <select
                      id="incapacidadDocumento"
                      className="form-select"
                      required
                      value={valores.incapacidadId}
                      onChange={(evento) => setValores((actuales) => ({ ...actuales, incapacidadId: evento.target.value, rechazoId: '' }))}
                    >
                      <option value="">Seleccione…</option>
                      {incapacidades.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.empleado?.nombreCompleto ?? ''}</option>)}
                    </select>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="tipoDocumento">Tipo de documento *</label>
                  <select id="tipoDocumento" className="form-select" value={valores.tipo} onChange={(evento) => setValores((actuales) => ({ ...actuales, tipo: evento.target.value }))} required>
                    {TIPOS_DOCUMENTO.map((tipo) => <option key={tipo} value={tipo}>{tipo.replaceAll('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="rechazoDocumento">Rechazo asociado</label>
                  <select id="rechazoDocumento" className="form-select" value={valores.rechazoId} onChange={(evento) => setValores((actuales) => ({ ...actuales, rechazoId: evento.target.value }))}>
                    <option value="">Ninguno</option>
                    {rechazos.map((item) => <option key={item.id} value={item.id}>{item.causal.slice(0, 60)}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="archivoDocumento">Archivo (PDF, JPG o PNG, máx. 10 MB) *</label>
                  <input id="archivoDocumento" type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)} required />
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setAbrirModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Cargando…' : 'Cargar documento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DocumentosPage() {
  const { id } = useParams();
  const { tienePermiso } = useAuth();
  if (!tienePermiso('DOCUMENTOS_VER')) return <AccesoDenegado />;
  return <DocumentosContenido incapacidadId={id ? Number(id) : null} />;
}
