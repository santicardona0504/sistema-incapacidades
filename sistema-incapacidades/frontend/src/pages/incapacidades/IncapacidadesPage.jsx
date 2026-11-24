import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { incapacidadService } from '../../services/incapacidad.service.js';
import { entidadService, empleadoService } from '../../services/empleado.service.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ManagePage } from '../../components/common/ManagePage.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { ESTADOS_INCAPACIDAD, ORIGENES, TIPOS_INCAPACIDAD, etiqueta } from '../../utils/constantes.js';
import { formatoFecha } from '../../utils/formato.js';

const servicio = { listar: (filtros) => incapacidadService.listar(filtros) };

export function IncapacidadesPage() {
  const { tienePermiso } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [entidades, setEntidades] = useState([]);

  useEffect(() => {
    Promise.all([
      empleadoService.listar({ activo: 'true', limite: 200 }),
      entidadService.listar({ limite: 200 })
    ]).then(([respuestaEmpleados, respuestaEntidades]) => {
      setEmpleados(respuestaEmpleados.data.empleados ?? []);
      setEntidades(respuestaEntidades.data.entidades ?? []);
    }).catch(() => {});
  }, []);

  const columnas = useMemo(() => [
    {
      titulo: 'Código', clave: 'codigo',
      render: (fila) => <Link to={`/incapacidades/${fila.id}`} className="fw-semibold">{fila.codigo}</Link>
    },
    { titulo: 'Empleado', clave: 'empleado', render: (fila) => fila.empleado?.nombreCompleto ?? '—' },
    { titulo: 'Entidad', clave: 'entidad', render: (fila) => fila.entidad?.nombre ?? '—' },
    { titulo: 'Tipo', clave: 'tipo', render: (fila) => etiqueta(fila.tipo) },
    { titulo: 'Origen', clave: 'origen', render: (fila) => etiqueta(fila.origen) },
    { titulo: 'Inicio', clave: 'fechaInicio', render: (fila) => formatoFecha(fila.fechaInicio) },
    { titulo: 'Fin', clave: 'fechaFin', render: (fila) => formatoFecha(fila.fechaFin) },
    { titulo: 'Días', clave: 'dias' },
    { titulo: 'Estado', clave: 'estado', render: (fila) => <StatusBadge valor={fila.estado} /> }
  ], []);

  const filtrosCampos = useMemo(() => [
    { clave: 'buscar', etiqueta: 'Código', placeholder: 'INC-2026-0001' },
    {
      clave: 'empleadoId', etiqueta: 'Empleado', tipo: 'select',
      opciones: empleados.map((empleado) => ({ valor: empleado.id, etiqueta: empleado.nombreCompleto }))
    },
    {
      clave: 'entidadId', etiqueta: 'Entidad', tipo: 'select',
      opciones: entidades.map((entidad) => ({ valor: entidad.id, etiqueta: entidad.nombre }))
    },
    {
      clave: 'tipo', etiqueta: 'Tipo', tipo: 'select',
      opciones: TIPOS_INCAPACIDAD.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
    },
    {
      clave: 'origen', etiqueta: 'Origen', tipo: 'select',
      opciones: ORIGENES.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
    },
    {
      clave: 'estado', etiqueta: 'Estado', tipo: 'select',
      opciones: ESTADOS_INCAPACIDAD.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
    },
    { clave: 'fechaDesde', etiqueta: 'Desde', tipo: 'date' },
    { clave: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date' }
  ], [empleados, entidades]);

  return (
    <ManagePage
      titulo="Incapacidades"
      subtitulo="Registro, seguimiento y trazabilidad de incapacidades"
      permisoVer="INCAPACIDADES_VER"
      servicio={servicio}
      coleccion="incapacidades"
      columnas={columnas}
      filtrosCampos={filtrosCampos}
      botonesSuperiores={tienePermiso('INCAPACIDADES_CREAR') ? [
        <Link key="nueva" to="/incapacidades/nueva" className="btn btn-primary">+ Nueva incapacidad</Link>
      ] : []}
      accionesFila={(fila) => (
        <>
          <Link className="btn btn-outline-primary" to={`/incapacidades/${fila.id}`}>Ver</Link>
          {tienePermiso('INCAPACIDADES_EDITAR') && (
            <Link className="btn btn-outline-secondary" to={`/incapacidades/${fila.id}/editar`}>Editar</Link>
          )}
        </>
      )}
      textoVacio="No hay incapacidades registradas"
    />
  );
}
