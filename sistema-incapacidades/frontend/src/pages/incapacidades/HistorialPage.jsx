import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { historialService } from '../../services/documento.service.js';
import { ManagePage } from '../../components/common/ManagePage.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { ESTADOS_INCAPACIDAD, etiqueta } from '../../utils/constantes.js';
import { formatoFechaHora } from '../../utils/formato.js';

const servicio = { listar: (filtros) => historialService.listar(filtros) };

export function HistorialPage() {
  const columnas = useMemo(() => [
    {
      titulo: 'Incapacidad', clave: 'incapacidad',
      render: (fila) => <Link to={`/incapacidades/${fila.incapacidad?.id}`} className="fw-semibold">{fila.incapacidad?.codigo ?? '—'}</Link>
    },
    { titulo: 'Estado anterior', clave: 'estadoAnterior', render: (fila) => etiqueta(fila.estadoAnterior) },
    { titulo: 'Estado nuevo', clave: 'estadoNuevo', render: (fila) => <StatusBadge valor={fila.estadoNuevo} /> },
    { titulo: 'Fecha', clave: 'fechaCambio', render: (fila) => formatoFechaHora(fila.fechaCambio) },
    { titulo: 'Usuario', clave: 'usuario', render: (fila) => fila.usuario?.nombre ?? 'Sistema' },
    { titulo: 'Observaciones', clave: 'observaciones', render: (fila) => fila.observaciones ?? '—' }
  ], []);

  const filtrosCampos = useMemo(() => [
    { clave: 'incapacidadId', etiqueta: 'ID incapacidad', placeholder: 'Ej. 12' },
    { clave: 'usuarioId', etiqueta: 'ID usuario', placeholder: 'Ej. 1' },
    {
      clave: 'estadoNuevo', etiqueta: 'Estado nuevo', tipo: 'select',
      opciones: ESTADOS_INCAPACIDAD.map((valor) => ({ valor, etiqueta: etiqueta(valor) }))
    },
    { clave: 'fechaDesde', etiqueta: 'Desde', tipo: 'date' },
    { clave: 'fechaHasta', etiqueta: 'Hasta', tipo: 'date' }
  ], []);

  return (
    <ManagePage
      titulo="Historial de incapacidades"
      subtitulo="Trazabilidad de todos los cambios de estado"
      permisoVer="HISTORIAL_VER"
      servicio={servicio}
      coleccion="historial"
      columnas={columnas}
      filtrosCampos={filtrosCampos}
      textoVacio="No hay eventos de historial"
    />
  );
}
