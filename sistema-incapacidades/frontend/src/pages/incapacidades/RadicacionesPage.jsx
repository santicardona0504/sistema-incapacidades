import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { radicacionService } from '../../services/incapacidad.service.js';
import { entidadService } from '../../services/empleado.service.js';
import { incapacidadService } from '../../services/incapacidad.service.js';
import { ManagePage } from '../../components/common/ManagePage.jsx';
import { formatoFecha } from '../../utils/formato.js';
import { listarTodo } from '../../utils/listados.js';

export function RadicacionesPage() {
  const { id } = useParams();
  const incapacidadId = id ? Number(id) : null;
  const [entidades, setEntidades] = useState([]);
  const [incapacidades, setIncapacidades] = useState([]);
  const [incapacidad, setIncapacidad] = useState(null);

  useEffect(() => {
    Promise.all([
      listarTodo(entidadService.listar, { activa: 'true' }, 'entidades'),
      listarTodo(incapacidadService.listar, {}, 'incapacidades')
    ]).then(([respuestaEntidades, respuestaIncapacidades]) => {
      setEntidades(respuestaEntidades.data.entidades ?? []);
      setIncapacidades(respuestaIncapacidades.data.incapacidades ?? []);
    }).catch(() => {});

    if (incapacidadId) {
      incapacidadService.obtener(incapacidadId).then((respuesta) => setIncapacidad(respuesta.data)).catch(() => {});
    }
  }, [incapacidadId]);

  const servicio = useMemo(() => ({
    listar: (filtros) => radicacionService.listar(incapacidadId ? { ...filtros, incapacidadId } : filtros),
    crear: (datos) => radicacionService.crear(datos.incapacidadId, datos)
  }), [incapacidadId]);

  const columnas = useMemo(() => [
    { titulo: 'Número', clave: 'numeroRadicado', render: (fila) => <span className="fw-semibold">{fila.numeroRadicado}</span> },
    { titulo: 'Incapacidad', clave: 'codigoIncapacidad', render: (fila) => <Link to={`/incapacidades/${fila.incapacidadId}`}>{fila.codigoIncapacidad}</Link> },
    { titulo: 'Entidad', clave: 'entidad', render: (fila) => fila.entidad?.nombre ?? '—' },
    { titulo: 'Transcripción', clave: 'fechaTranscripcion', render: (fila) => formatoFecha(fila.fechaTranscripcion) },
    { titulo: 'Radicación', clave: 'fechaRadicacion', render: (fila) => formatoFecha(fila.fechaRadicacion) },
    { titulo: 'Responsable', clave: 'responsable' },
    { titulo: 'Estado', clave: 'avance', render: (fila) => <span className="badge bg-light text-dark border">{fila.avance?.estadoActual ?? '—'}</span> },
    { titulo: 'Rechazos', clave: 'totalRechazos', render: (fila) => fila.avance?.totalRechazos ?? 0 }
  ], []);

  const campos = useMemo(() => [
    {
      clave: 'incapacidadId', etiqueta: 'Incapacidad', tipo: 'select', requerido: true,
      deshabilitado: Boolean(incapacidadId),
      opciones: incapacidades.map((item) => ({
        valor: item.id,
        etiqueta: `${item.codigo} · ${item.empleado?.nombreCompleto ?? ''}`
      }))
    },
    {
      clave: 'entidadId', etiqueta: 'Entidad', tipo: 'select', requerido: true,
      opciones: entidades.map((entidad) => ({ valor: entidad.id, etiqueta: entidad.nombre }))
    },
    { clave: 'numeroRadicado', etiqueta: 'Número de radicado', requerido: true },
    { clave: 'fechaTranscripcion', etiqueta: 'Fecha de transcripción', tipo: 'date', requerido: true },
    { clave: 'fechaRadicacion', etiqueta: 'Fecha de radicación', tipo: 'date' },
    { clave: 'responsable', etiqueta: 'Responsable', requerido: true },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', ancho: 'col-12' }
  ], [incapacidades, entidades, incapacidadId]);

  const filtrosCampos = useMemo(() => [
    { clave: 'numeroRadicado', etiqueta: 'Número de radicado', placeholder: 'RAD-2026-0001' },
    ...(incapacidadId ? [] : [{
      clave: 'incapacidadId', etiqueta: 'Incapacidad', tipo: 'select',
      opciones: incapacidades.map((item) => ({ valor: item.id, etiqueta: item.codigo }))
    }]),
    {
      clave: 'entidadId', etiqueta: 'Entidad', tipo: 'select',
      opciones: entidades.map((entidad) => ({ valor: entidad.id, etiqueta: entidad.nombre }))
    },
    { clave: 'fechaDesde', etiqueta: 'Desde', tipo: 'date' },
    { clave: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date' }
  ], [incapacidades, entidades, incapacidadId]);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <ManagePage
      titulo={incapacidad ? `Radicaciones de ${incapacidad.codigo}` : 'Radicaciones'}
      subtitulo="Registro de transcripciones y radicados ante entidades"
      permisoVer="RADICACIONES_VER"
      permisoCrear="RADICACIONES_CREAR"
      servicio={servicio}
      coleccion="radicaciones"
      columnas={columnas}
      campos={campos}
      filtrosCampos={filtrosCampos}
      valoresIniciales={{
        incapacidadId: incapacidadId ?? '',
        entidadId: String(incapacidad?.entidad?.id ?? ''),
        numeroRadicado: '',
        fechaTranscripcion: hoy,
        fechaRadicacion: '',
        responsable: '',
        observaciones: ''
      }}
      botonesSuperiores={incapacidad ? [
        <Link key="volver" to={`/incapacidades/${incapacidad.id}`} className="btn btn-outline-secondary">Volver a la incapacidad</Link>
      ] : []}
      textoVacio="No hay radicaciones registradas"
    />
  );
}
