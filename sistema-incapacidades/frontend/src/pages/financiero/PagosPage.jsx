import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pagoService } from '../../services/cobro.service.js';
import { documentoService } from '../../services/documento.service.js';
import { entidadService } from '../../services/empleado.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { FilterBar } from '../../components/common/FilterBar.jsx';
import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';
import { FormModal } from '../../components/common/Modals.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { formatoDinero, formatoFecha } from '../../utils/formato.js';

export function PagosPage() {
  const { tienePermiso } = useAuth();
  const toast = useToast();

  const [filas, setFilas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pendientes, setPendientes] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [documentosPago, setDocumentosPago] = useState([]);
  const [valoresFiltro, setValoresFiltro] = useState({});
  const [filtros, setFiltros] = useState({});
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
      const respuesta = await pagoService.listar({ ...filtros, pagina });
      setFilas(respuesta.data.pagos ?? []);
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
      pagoService.pendientes({ limite: 200 }),
      entidadService.listar({ activa: 'true', limite: 200 }),
      documentoService.listar({ tipo: 'SOPORTE_PAGO', limite: 500 })
    ]).then(([respuestaPendientes, respuestaEntidades, respuestaDocumentos]) => {
      setPendientes(respuestaPendientes.data.cobros ?? []);
      setEntidades(respuestaEntidades.data.entidades ?? []);
      setDocumentosPago(respuestaDocumentos.data.documentos ?? []);
    }).catch(() => {});
  }, []);

  if (!tienePermiso('PAGOS_VER')) return <AccesoDenegado />;

  const cobroSeleccionado = pendientes.find((cobro) => String(cobro.id) === String(valores.cobroId));
  const documentosDisponibles = documentosPago.filter((documento) => (
    !valores.incapacidadId || String(documento.incapacidad?.id) === String(valores.incapacidadId)
  ));

  const cerrar = () => {
    setModal(null);
    setValores({});
    setErrorFormulario(null);
  };

  const abrirNuevo = () => {
    setValores({
      cobroId: '', entidadId: '', fechaPago: new Date().toISOString().slice(0, 10),
      valorPagado: '', referencia: '', soporteDocumentoId: '', incapacidadId: ''
    });
    setErrorFormulario(null);
    setModal('crear');
  };

  const abrirSoporte = (fila) => {
    setValores({
      id: fila.id,
      incapacidadId: String(fila.cobro?.incapacidad?.id ?? ''),
      soporteDocumentoId: String(fila.soporteDocumento?.id ?? '')
    });
    setErrorFormulario(null);
    setModal('soporte');
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorFormulario(null);
    try {
      if (modal === 'crear') {
        await pagoService.crear({
          cobroId: Number(valores.cobroId),
          entidadId: Number(valores.entidadId),
          fechaPago: valores.fechaPago,
          valorPagado: Number(valores.valorPagado),
          referencia: valores.referencia || undefined,
          soporteDocumentoId: valores.soporteDocumentoId ? Number(valores.soporteDocumentoId) : undefined
        });
        toast.exito('Pago registrado correctamente');
      } else {
        await pagoService.adjuntarSoporte(valores.id, Number(valores.soporteDocumentoId));
        toast.exito('Soporte asociado correctamente');
      }
      cerrar();
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarCobro = (cobroId) => {
    const cobro = pendientes.find((item) => String(item.id) === String(cobroId));
    setValores((actuales) => ({
      ...actuales,
      cobroId,
      entidadId: String(cobro?.entidad?.id ?? ''),
      incapacidadId: String(cobro?.incapacidad?.id ?? ''),
      valorPagado: String(cobro?.saldoPendiente ?? ''),
      soporteDocumentoId: ''
    }));
  };

  const columnas = [
    { titulo: 'Fecha', clave: 'fechaPago', render: (fila) => formatoFecha(fila.fechaPago) },
    { titulo: 'Referencia', clave: 'referencia', render: (fila) => fila.referencia ?? '—' },
    { titulo: 'Solicitud', clave: 'cobro', render: (fila) => fila.cobro?.numeroSolicitud ?? '—' },
    { titulo: 'Incapacidad', clave: 'incapacidad', render: (fila) => <Link to={`/incapacidades/${fila.cobro?.incapacidad?.id}`}>{fila.cobro?.incapacidad?.codigo ?? '—'}</Link> },
    { titulo: 'Empleado', clave: 'empleado', render: (fila) => fila.cobro?.incapacidad?.empleado?.nombreCompleto ?? '—' },
    { titulo: 'Entidad', clave: 'entidad', render: (fila) => fila.entidad?.nombre ?? '—' },
    { titulo: 'Valor', clave: 'valorPagado', render: (fila) => formatoDinero(fila.valorPagado) },
    { titulo: 'Soporte', clave: 'soporte', render: (fila) => fila.soporteDocumento ? <span className="badge bg-success">Adjunto</span> : <span className="badge bg-warning text-dark">Pendiente</span> }
  ];

  const camposCrear = [
    {
      clave: 'cobroId', etiqueta: 'Cobro a pagar', tipo: 'select', requerido: true, ancho: 'col-12',
      opciones: pendientes.map((cobro) => ({
        valor: cobro.id,
        etiqueta: `${cobro.numeroSolicitud} · ${cobro.incapacidad?.empleado?.nombreCompleto ?? ''} · saldo ${formatoDinero(cobro.saldoPendiente ?? cobro.valorReconocido)} · radicado ${cobro.radicacion?.numeroRadicado ?? '—'}`
      })),
      ayuda: 'El importe se valida contra el saldo pendiente del cobro seleccionado.'
    },
    {
      clave: 'entidadId', etiqueta: 'Entidad', tipo: 'select', requerido: true,
      opciones: entidades.map((entidad) => ({ valor: entidad.id, etiqueta: entidad.nombre }))
    },
    { clave: 'fechaPago', etiqueta: 'Fecha del pago', tipo: 'date', requerido: true },
    { clave: 'valorPagado', etiqueta: 'Valor pagado', tipo: 'number', requerido: true },
    { clave: 'referencia', etiqueta: 'Referencia', placeholder: 'Ej. TRANS-123456' },
    {
      clave: 'soporteDocumentoId', etiqueta: 'Soporte de pago', tipo: 'select',
      opciones: documentosDisponibles.map((documento) => ({ valor: documento.id, etiqueta: documento.nombreOriginal })),
      ayuda: 'Solo documentos tipo SOPORTE_PAGO de la incapacidad seleccionada.'
    }
  ];

  return (
    <>
      <PageHeader
        titulo="Pagos"
        subtitulo="Registro de pagos recibidos, validación de saldos y soportes"
        acciones={tienePermiso('PAGOS_CREAR') ? [
          <button key="nuevo" type="button" className="btn btn-primary" onClick={abrirNuevo}>+ Registrar pago</button>
        ] : []}
      />

      <div className="row g-3 mb-4">
        <StatCard titulo="Cobros con saldo" valor={pendientes.length} subtitulo="Disponibles para pago" icono="C" variante="warning" />
        <StatCard titulo="Pagos listados" valor={total} subtitulo="En el filtro actual" icono="P" variante="success" />
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body pb-0">
          <FilterBar
            campos={[
              { clave: 'referencia', etiqueta: 'Referencia', placeholder: 'Ej. TRANS-123' },
              {
                clave: 'entidadId', etiqueta: 'Entidad', tipo: 'select',
                opciones: entidades.map((entidad) => ({ valor: entidad.id, etiqueta: entidad.nombre }))
              },
              { clave: 'cobroId', etiqueta: 'ID cobro', placeholder: 'Ej. 8' },
              { clave: 'empleadoId', etiqueta: 'ID empleado', placeholder: 'Ej. 3' },
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
              acciones={(fila) => tienePermiso('PAGOS_CREAR') && !fila.soporteDocumento ? (
                <button type="button" className="btn btn-outline-primary" onClick={() => abrirSoporte(fila)}>Adjuntar soporte</button>
              ) : null}
              vacio="No hay pagos registrados"
            />
          )}
        </div>
      </div>

      {modal === 'crear' && (
        <FormModal
          titulo="Registrar pago"
          campos={camposCrear}
          valores={valores}
          onChange={(clave, valor) => clave === 'cobroId' ? cambiarCobro(valor) : setValores((actuales) => ({ ...actuales, [clave]: valor }))}
          onSubmit={guardar}
          onClose={cerrar}
          guardando={guardando}
          error={errorFormulario}
        />
      )}

      {modal === 'soporte' && (
        <FormModal
          titulo="Adjuntar soporte de pago"
          campos={[{
            clave: 'soporteDocumentoId', etiqueta: 'Documento de soporte', tipo: 'select', requerido: true, ancho: 'col-12',
            opciones: documentosDisponibles.map((documento) => ({ valor: documento.id, etiqueta: documento.nombreOriginal }))
          }]}
          valores={valores}
          onChange={(clave, valor) => setValores((actuales) => ({ ...actuales, [clave]: valor }))}
          onSubmit={guardar}
          onClose={cerrar}
          guardando={guardando}
          error={errorFormulario}
        />
      )}

      {cobroSeleccionado && modal === 'crear' && (
        <div className="alert alert-info position-fixed bottom-0 end-0 m-3 shadow" style={{ zIndex: 2000, maxWidth: '360px' }}>
          <strong>Saldo del cobro:</strong> {formatoDinero(cobroSeleccionado.saldoPendiente ?? cobroSeleccionado.valorReconocido)}<br />
          <strong>Radicación:</strong> {cobroSeleccionado.radicacion?.numeroRadicado ?? '—'}
        </div>
      )}
    </>
  );
}
