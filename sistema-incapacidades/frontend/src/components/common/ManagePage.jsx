import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { esCancelado, mensajeError } from '../../api/client.js';
import { FilterBar } from './FilterBar.jsx';
import { DataTable } from './DataTable.jsx';
import { PageHeader } from './PageHeader.jsx';
import { ErrorState } from './States.jsx';
import { ConfirmModal, FormModal } from './Modals.jsx';

export function AccesoDenegado() {
  return (
    <div className="alert alert-warning shadow-sm" role="alert">
      <h5 className="alert-heading">Acceso no autorizado</h5>
      <p className="mb-0">Tu rol no tiene permisos para ver esta información.</p>
    </div>
  );
}

export function ManagePage({
  titulo,
  subtitulo,
  permisoVer,
  permisoCrear,
  permisoEditar,
  permisoEliminar,
  servicio,
  coleccion,
  columnas,
  filtrosCampos = [],
  campos = [],
  valoresIniciales = {},
  aEditar,
  botonesSuperiores = [],
  accionesFila,
  buscarTexto = 'Buscar',
  textoVacio = 'No hay registros para mostrar'
}) {
  const { tienePermiso } = useAuth();
  const toast = useToast();

  const [valoresFiltro, setValoresFiltro] = useState({});
  const [filtros, setFiltros] = useState({});
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [valoresFormulario, setValoresFormulario] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const controladorRef = useRef(null);

  const puedeVer = tienePermiso(permisoVer);
  const puedeCrear = tienePermiso(permisoCrear);
  const puedeEditar = tienePermiso(permisoEditar);
  const puedeEliminar = tienePermiso(permisoEliminar);

  const cargar = useCallback(async () => {
    if (!puedeVer) return;
    controladorRef.current?.abort();
    const controlador = new AbortController();
    controladorRef.current = controlador;

    setCargando(true);
    setError(null);
    try {
      const respuesta = await servicio.listar({ ...filtros, pagina }, { signal: controlador.signal });
      if (!controlador.signal.aborted) setDatos(respuesta.data);
    } catch (fallo) {
      if (!esCancelado(fallo) && !controlador.signal.aborted) setError(mensajeError(fallo));
    } finally {
      if (!controlador.signal.aborted) setCargando(false);
    }
  }, [puedeVer, servicio, filtros, pagina]);

  useEffect(() => {
    cargar();
    return () => controladorRef.current?.abort();
  }, [cargar]);

  const filas = datos?.[coleccion] ?? [];

  const abrirNuevo = () => {
    setValoresFormulario({ ...valoresIniciales });
    setErrorFormulario(null);
    setModal({ modo: 'crear' });
  };

  const abrirEditar = (fila) => {
    const origen = aEditar ? aEditar(fila) : fila;
    setValoresFormulario({ ...valoresIniciales, ...origen });
    setErrorFormulario(null);
    setModal({ modo: 'editar', id: fila.id });
  };

  const cambiarCampo = (clave, valor) => {
    setValoresFormulario((actuales) => ({ ...actuales, [clave]: valor }));
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorFormulario(null);
    try {
      if (modal.modo === 'crear') {
        await servicio.crear(valoresFormulario);
        toast.exito('Registro creado correctamente');
      } else {
        await servicio.actualizar(modal.id, valoresFormulario);
        toast.exito('Registro actualizado correctamente');
      }
      setModal(null);
      cargar();
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    setGuardando(true);
    try {
      await servicio.eliminar(confirmacion.id);
      toast.exito('Registro actualizado correctamente');
      setConfirmacion(null);
      cargar();
    } catch (fallo) {
      toast.error(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const columnasFinales = useMemo(() => columnas, [columnas]);

  if (!puedeVer) return <AccesoDenegado />;

  return (
    <>
      <PageHeader
        titulo={titulo}
        subtitulo={subtitulo}
        acciones={[
          ...botonesSuperiores,
          ...(puedeCrear && servicio.crear ? [(
            <button key="nuevo" type="button" className="btn btn-primary" onClick={abrirNuevo}>
              + Nuevo registro
            </button>
          )] : [])
        ]}
      />

      {filtrosCampos.length > 0 && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body pb-0">
            <FilterBar
              campos={filtrosCampos}
              valores={valoresFiltro}
              onChange={setValoresFiltro}
              onBuscar={() => { setFiltros({ ...valoresFiltro }); setPagina(1); }}
              onLimpiar={() => { setValoresFiltro({}); setFiltros({}); setPagina(1); }}
            />
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {error ? (
            <div className="p-3"><ErrorState mensaje={error} onReintentar={cargar} /></div>
          ) : (
            <DataTable
              columnas={columnasFinales}
              filas={filas}
              cargando={cargando}
              total={datos?.total ?? 0}
              pagina={pagina}
              totalPaginas={datos?.totalPaginas ?? 1}
              onPagina={setPagina}
              vacio={textoVacio}
              acciones={(fila) => (
                <>
                  {puedeEditar && servicio.actualizar && (
                    <button type="button" className="btn btn-outline-primary" title="Editar" onClick={() => abrirEditar(fila)}>
                      Editar
                    </button>
                  )}
                  {accionesFila?.(fila)}
                  {puedeEliminar && servicio.eliminar && (
                    <button type="button" className="btn btn-outline-danger" title="Desactivar" onClick={() => setConfirmacion(fila)}>
                      Baja
                    </button>
                  )}
                </>
              )}
            />
          )}
        </div>
      </div>

      {modal && (
        <FormModal
          titulo={modal.modo === 'crear' ? `Nuevo registro · ${titulo}` : `Editar registro · ${titulo}`}
          campos={campos.map((campo) => ({
            ...campo,
            deshabilitado: campo.soloCrear ? modal.modo === 'editar' : campo.deshabilitado
          }))}
          valores={valoresFormulario}
          onChange={cambiarCampo}
          onSubmit={guardar}
          onClose={() => setModal(null)}
          guardando={guardando}
          error={errorFormulario}
        />
      )}

      {confirmacion && (
        <ConfirmModal
          titulo="Confirmar acción"
          mensaje="¿Deseas continuar con esta acción? La operación quedará registrada en la auditoría."
          etiqueta="Confirmar"
          cargando={guardando}
          onConfirmar={eliminar}
          onCancelar={() => setConfirmacion(null)}
        />
      )}
    </>
  );
}
