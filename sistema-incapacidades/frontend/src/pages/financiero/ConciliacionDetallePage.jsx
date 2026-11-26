import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { conciliacionService } from '../../services/gestion.service.js';
import { pagoService as serviciosPago } from '../../services/cobro.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { FormModal } from '../../components/common/Modals.jsx';
import { formatoDinero, formatoFecha, formatoFechaHora } from '../../utils/formato.js';
import { listarTodo } from '../../utils/listados.js';

export function ConciliacionDetallePage() {
  const { id } = useParams();
  const { tienePermiso } = useAuth();
  const toast = useToast();

  const [conciliacion, setConciliacion] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [valores, setValores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await conciliacionService.obtener(id);
      const datos = respuesta.data;
      setConciliacion(datos);
      const [respuestaPagos, respuestaHistorial] = await Promise.all([
        listarTodo(serviciosPago.listar, {
          fechaDesde: datos.fechaInicio,
          fechaHasta: datos.fechaFin
        }, 'pagos'),
        conciliacionService.historial(id)
      ]);
      setPagos(respuestaPagos.data.pagos ?? []);
      setHistorial(respuestaHistorial.data ?? []);
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!tienePermiso('CONCILIACIONES_VER')) return <AccesoDenegado />;
  if (cargando) return <Loading mensaje="Cargando conciliación…" />;
  if (error) return <ErrorState mensaje={error} onReintentar={cargar} />;

  const puedeConsolidar = tienePermiso('CONCILIACIONES_CONSOLIDAR') && conciliacion.estado === 'EN_REVISION';
  const puedeValidar = tienePermiso('CONCILIACIONES_VALIDAR') && conciliacion.estado === 'EN_REVISION';
  const idsEnDetalle = new Set((conciliacion.detalles ?? []).map((detalle) => detalle.pagoId));
  const pagosDisponibles = pagos.filter((pago) => !idsEnDetalle.has(pago.id));

  const abrirAgregar = () => {
    setValores({ pagoId: '', valorConciliado: '', observaciones: '' });
    setErrorFormulario(null);
    setModal('agregar');
  };

  const abrirValidar = () => {
    setValores({ observaciones: '' });
    setErrorFormulario(null);
    setModal('validar');
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorFormulario(null);
    try {
      if (modal === 'agregar') {
        await conciliacionService.agregarPago(id, {
          pagoId: Number(valores.pagoId),
          valorConciliado: Number(valores.valorConciliado),
          observaciones: valores.observaciones || undefined
        });
        toast.exito('Pago agregado a la conciliación');
      } else {
        await conciliacionService.validar(id, valores.observaciones || undefined);
        toast.exito('Conciliación validada correctamente');
      }
      setModal(null);
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (pagoId) => {
    try {
      await conciliacionService.quitarPago(id, pagoId);
      toast.exito('Pago retirado de la conciliación');
      cargar();
    } catch (fallo) {
      toast.error(mensajeError(fallo));
    }
  };

  const seleccionarPago = (pagoId) => {
    const pago = pagos.find((item) => String(item.id) === String(pagoId));
    setValores((actuales) => ({ ...actuales, pagoId, valorConciliado: String(pago?.valorPagado ?? '') }));
  };

  return (
    <>
      <PageHeader
        titulo={`Conciliación ${conciliacion.periodo}`}
        subtitulo={`${formatoFecha(conciliacion.fechaInicio)} al ${formatoFecha(conciliacion.fechaFin)}`}
        acciones={[
          <Link key="volver" to="/conciliaciones" className="btn btn-outline-secondary">Volver</Link>,
          ...(puedeConsolidar ? [(
            <button key="agregar" type="button" className="btn btn-outline-primary" onClick={abrirAgregar}>+ Agregar pago</button>
          )] : []),
          ...(puedeValidar ? [(
            <button key="validar" type="button" className="btn btn-primary" onClick={abrirValidar}>Validar conciliación</button>
          )] : [])
        ]}
      />

      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100"><div className="card-body"><p className="detail-label">Estado</p><StatusBadge valor={conciliacion.estado} texto={conciliacion.estadoVisible} /></div></div>
        </div>
        <StatCard titulo="Total pagado" valor={formatoDinero(conciliacion.totalPagado)} icono="P" variante="primary" />
        <StatCard titulo="Total conciliado" valor={formatoDinero(conciliacion.totalConciliado)} icono="C" variante="success" />
        <StatCard titulo="Diferencia" valor={formatoDinero(conciliacion.totalDiferencia)} icono="D" variante={Number(conciliacion.totalDiferencia) !== 0 ? 'danger' : 'success'} />
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row">
            <div className="col-md-3"><p className="detail-label">Consolidada por</p><p className="detail-value">{conciliacion.consolidadaPor?.nombre ?? '—'}</p></div>
            <div className="col-md-3"><p className="detail-label">Validada por</p><p className="detail-value">{conciliacion.validadaPor?.nombre ?? '—'}</p></div>
            <div className="col-md-3"><p className="detail-label">Fecha validación</p><p className="detail-value">{formatoFechaHora(conciliacion.fechaValidacion)}</p></div>
            <div className="col-md-3"><p className="detail-label">Detalles</p><p className="detail-value">{conciliacion.totalDetalles}</p></div>
          </div>
          {conciliacion.observaciones && <p className="border-top pt-3 mb-0 small"><strong>Observaciones:</strong> {conciliacion.observaciones}</p>}
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white"><h6 className="fw-bold mb-0">Detalle de pagos conciliados</h6></div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr><th>Pago</th><th>Fecha</th><th>Empleado</th><th>Entidad</th><th>Valor pagado</th><th>Valor conciliado</th><th>Diferencia</th><th /></tr>
            </thead>
            <tbody>
              {(conciliacion.detalles ?? []).length === 0 ? (
                <tr><td colSpan="8" className="text-center text-muted py-4">No hay pagos agregados</td></tr>
              ) : conciliacion.detalles.map((detalle) => (
                <tr key={detalle.id}>
                  <td className="fw-semibold">{detalle.pago?.referencia ?? `Pago #${detalle.pagoId}`}</td>
                  <td>{formatoFecha(detalle.pago?.fechaPago)}</td>
                  <td>{detalle.pago?.empleado?.nombreCompleto ?? '—'}</td>
                  <td>{detalle.pago?.entidad?.nombre ?? '—'}</td>
                  <td>{formatoDinero(detalle.pago?.valorPagado)}</td>
                  <td>{formatoDinero(detalle.valorConciliado)}</td>
                  <td className={Number(detalle.diferencia) !== 0 ? 'text-danger fw-semibold' : 'text-success'}>{formatoDinero(detalle.diferencia)}</td>
                  <td className="text-end">
                    {puedeConsolidar && (
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => quitar(detalle.pagoId)}>Quitar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white"><h6 className="fw-bold mb-0">Historial de eventos</h6></div>
        <div className="card-body">
          {historial.length === 0 ? <p className="text-muted text-center mb-0">Sin eventos</p> : historial.map((evento) => (
            <div key={evento.id} className="timeline-item">
              <strong>{evento.accion}</strong>
              <p className="text-muted small mb-0">{formatoFechaHora(evento.creadoEn)} · {evento.usuario?.nombre ?? 'Sistema'}</p>
            </div>
          ))}
        </div>
      </div>

      {modal === 'agregar' && (
        <FormModal
          titulo="Agregar pago a la conciliación"
          campos={[
            {
              clave: 'pagoId', etiqueta: 'Pago', tipo: 'select', requerido: true, ancho: 'col-12',
              opciones: pagosDisponibles.map((pago) => ({
                valor: pago.id,
                etiqueta: `${pago.referencia || `Pago #${pago.id}`} · ${pago.cobro?.incapacidad?.empleado?.nombreCompleto ?? ''} · ${formatoDinero(pago.valorPagado)}`
              }))
            },
            { clave: 'valorConciliado', etiqueta: 'Valor conciliado', tipo: 'number', requerido: true },
            { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }
          ]}
          valores={valores}
          onChange={(clave, valor) => clave === 'pagoId' ? seleccionarPago(valor) : setValores((actuales) => ({ ...actuales, [clave]: valor }))}
          onSubmit={guardar}
          onClose={() => setModal(null)}
          onLimpiar={(vacios) => setValores((actuales) => ({ ...actuales, ...vacios }))}
          guardando={guardando}
          error={errorFormulario}
        />
      )}

      {modal === 'validar' && (
        <FormModal
          titulo="Validar conciliación"
          campos={[{ clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }]}
          valores={valores}
          onChange={(clave, valor) => setValores((actuales) => ({ ...actuales, [clave]: valor }))}
          onSubmit={guardar}
          onClose={() => setModal(null)}
          onLimpiar={(vacios) => setValores((actuales) => ({ ...actuales, ...vacios }))}
          guardando={guardando}
          error={errorFormulario}
        />
      )}
    </>
  );
}
