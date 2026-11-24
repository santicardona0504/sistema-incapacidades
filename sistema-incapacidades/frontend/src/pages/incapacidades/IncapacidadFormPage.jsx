import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { incapacidadService } from '../../services/incapacidad.service.js';
import { entidadService, empleadoService } from '../../services/empleado.service.js';
import { mensajeError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AccesoDenegado } from '../../components/common/ManagePage.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { ErrorState, Loading } from '../../components/common/States.jsx';
import { ESTADOS_INCAPACIDAD, ORIGENES, TIPOS_INCAPACIDAD, etiqueta } from '../../utils/constantes.js';
import { fechaParaInput } from '../../utils/formato.js';

const VALORES_VACIOS = {
  empleadoId: '', entidadId: '', tipo: '', origen: '',
  fechaInicio: '', fechaFin: '', fechaRecepcion: '', observaciones: ''
};

export function IncapacidadFormPage() {
  const { id } = useParams();
  const [busqueda] = useSearchParams();
  const navegar = useNavigate();
  const toast = useToast();
  const { tienePermiso } = useAuth();
  const esEdicion = Boolean(id);
  const permiso = esEdicion ? 'INCAPACIDADES_EDITAR' : 'INCAPACIDADES_CREAR';

  const [valores, setValores] = useState({
    ...VALORES_VACIOS,
    empleadoId: busqueda.get('empleadoId') ?? ''
  });
  const [empleados, setEmpleados] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [errorFormulario, setErrorFormulario] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const peticiones = [
        empleadoService.listar({ activo: 'true', limite: 500 }),
        entidadService.listar({ activa: 'true', limite: 500 })
      ];
      if (esEdicion) peticiones.push(incapacidadService.obtener(id));

      const respuestas = await Promise.all(peticiones);
      setEmpleados(respuestas[0].data.empleados ?? []);
      setEntidades(respuestas[1].data.entidades ?? []);

      if (esEdicion) {
        const registro = respuestas[2].data;
        setValores({
          empleadoId: String(registro.empleado?.id ?? ''),
          entidadId: String(registro.entidad?.id ?? ''),
          tipo: registro.tipo ?? '',
          origen: registro.origen ?? '',
          fechaInicio: fechaParaInput(registro.fechaInicio),
          fechaFin: fechaParaInput(registro.fechaFin),
          fechaRecepcion: fechaParaInput(registro.fechaRecepcion),
          observaciones: registro.observaciones ?? ''
        });
      }
    } catch (fallo) {
      setError(mensajeError(fallo));
    } finally {
      setCargando(false);
    }
  }, [id, esEdicion]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!tienePermiso(permiso)) return <AccesoDenegado />;
  if (cargando) return <Loading />;
  if (error) return <ErrorState mensaje={error} onReintentar={cargar} />;

  const cambiar = (clave, valor) => setValores((actuales) => ({ ...actuales, [clave]: valor }));

  const guardar = async (evento) => {
    evento.preventDefault();
    setErrorFormulario(null);

    if (valores.fechaFin < valores.fechaInicio) {
      setErrorFormulario('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    const datos = {
      empleadoId: Number(valores.empleadoId),
      entidadId: Number(valores.entidadId),
      tipo: valores.tipo,
      origen: valores.origen,
      fechaInicio: valores.fechaInicio,
      fechaFin: valores.fechaFin,
      fechaRecepcion: valores.fechaRecepcion,
      observaciones: valores.observaciones || undefined
    };

    setGuardando(true);
    try {
      const respuesta = esEdicion
        ? await incapacidadService.actualizar(id, datos)
        : await incapacidadService.crear(datos);
      toast.exito(esEdicion ? 'Incapacidad actualizada correctamente' : 'Incapacidad registrada correctamente');
      navegar(`/incapacidades/${respuesta.data.id}`);
    } catch (fallo) {
      setErrorFormulario(mensajeError(fallo));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <PageHeader
        titulo={esEdicion ? 'Editar incapacidad' : 'Nueva incapacidad'}
        subtitulo={esEdicion ? 'Actualiza la información de la incapacidad' : 'Completa los datos para registrar una incapacidad'}
        acciones={[<Link key="volver" to={esEdicion ? `/incapacidades/${id}` : '/incapacidades'} className="btn btn-outline-secondary">Volver</Link>]}
      />

      <div className="card border-0 shadow-sm">
        <form onSubmit={guardar}>
          <div className="card-body">
            {errorFormulario && <div className="alert alert-danger">{errorFormulario}</div>}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="empleadoId">Empleado *</label>
                <select id="empleadoId" className="form-select" required value={valores.empleadoId} onChange={(e) => cambiar('empleadoId', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {empleados.map((empleado) => <option key={empleado.id} value={empleado.id}>{empleado.nombreCompleto} · {empleado.identificacion}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="entidadId">Entidad *</label>
                <select id="entidadId" className="form-select" required value={valores.entidadId} onChange={(e) => cambiar('entidadId', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {entidades.map((entidad) => <option key={entidad.id} value={entidad.id}>{entidad.nombre} · {entidad.tipo}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="tipo">Tipo *</label>
                <select id="tipo" className="form-select" required value={valores.tipo} onChange={(e) => cambiar('tipo', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {TIPOS_INCAPACIDAD.map((valor) => <option key={valor} value={valor}>{etiqueta(valor)}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="origen">Origen *</label>
                <select id="origen" className="form-select" required value={valores.origen} onChange={(e) => cambiar('origen', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {ORIGENES.map((valor) => <option key={valor} value={valor}>{etiqueta(valor)}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="estado">Estado inicial</label>
                <input id="estado" className="form-control" value={esEdicion ? '' : etiqueta(ESTADOS_INCAPACIDAD[0])} placeholder="Registrada" disabled readOnly />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="fechaInicio">Fecha de inicio *</label>
                <input id="fechaInicio" type="date" className="form-control" required value={valores.fechaInicio} onChange={(e) => cambiar('fechaInicio', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="fechaFin">Fecha de fin *</label>
                <input id="fechaFin" type="date" className="form-control" required value={valores.fechaFin} onChange={(e) => cambiar('fechaFin', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold" htmlFor="fechaRecepcion">Fecha de recepción *</label>
                <input id="fechaRecepcion" type="date" className="form-control" required value={valores.fechaRecepcion} onChange={(e) => cambiar('fechaRecepcion', e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold" htmlFor="observaciones">Observaciones</label>
                <textarea id="observaciones" rows="4" maxLength="2000" className="form-control" value={valores.observaciones} onChange={(e) => cambiar('observaciones', e.target.value)} />
                <div className="form-text">{valores.observaciones.length}/2000 caracteres</div>
              </div>
            </div>
          </div>
          <div className="card-footer bg-light d-flex justify-content-end gap-2">
            <Link to={esEdicion ? `/incapacidades/${id}` : '/incapacidades'} className="btn btn-outline-secondary">Cancelar</Link>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar incapacidad'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
