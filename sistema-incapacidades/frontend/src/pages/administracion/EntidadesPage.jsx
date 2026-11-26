import { useMemo } from 'react';
import { entidadService } from '../../services/empleado.service.js';
import { ManagePage } from '../../components/common/ManagePage.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { formatoFecha } from '../../utils/formato.js';

const servicio = {
  listar: (filtros) => entidadService.listar(filtros),
  crear: (datos) => entidadService.crear(datos),
  actualizar: (id, datos) => entidadService.actualizar(id, datos),
  eliminar: (id) => entidadService.cambiarEstado(id, false)
};

export function EntidadesPage() {
  const columnas = useMemo(() => [
    { titulo: 'Entidad', clave: 'nombre', render: (fila) => <span className="fw-semibold">{fila.nombre}</span> },
    { titulo: 'NIT', clave: 'nit' },
    { titulo: 'Tipo', clave: 'tipo' },
    { titulo: 'Estado', clave: 'activa', render: (fila) => <StatusBadge valor={fila.activa ? 'ACTIVA' : 'INACTIVA'} texto={fila.activa ? 'Activa' : 'Inactiva'} /> },
    { titulo: 'Registro', clave: 'creadoEn', render: (fila) => formatoFecha(fila.creadoEn) }
  ], []);

  const campos = useMemo(() => [
    { clave: 'nit', etiqueta: 'NIT', requerido: true, soloCrear: true },
    { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
    {
      clave: 'tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true,
      opciones: [{ valor: 'EPS', etiqueta: 'EPS' }, { valor: 'ARL', etiqueta: 'ARL' }]
    }
  ], []);

  const filtrosCampos = useMemo(() => [
    { clave: 'buscar', etiqueta: 'Buscar', placeholder: 'Nombre o NIT' },
    {
      clave: 'tipo', etiqueta: 'Tipo', tipo: 'select',
      opciones: [{ valor: 'EPS', etiqueta: 'EPS' }, { valor: 'ARL', etiqueta: 'ARL' }]
    },
    {
      clave: 'activa', etiqueta: 'Estado', tipo: 'select',
      opciones: [{ valor: 'true', etiqueta: 'Activas' }, { valor: 'false', etiqueta: 'Inactivas' }]
    }
  ], []);

  return (
    <ManagePage
      titulo="Entidades EPS/ARL"
      subtitulo="Registro manual de entidades de salud y riesgos laborales"
      permisoVer="ENTIDADES_VER"
      permisoCrear="ENTIDADES_CREAR"
      permisoEditar="ENTIDADES_EDITAR"
      permisoEliminar="ENTIDADES_DESACTIVAR"
      servicio={servicio}
      coleccion="entidades"
      columnas={columnas}
      campos={campos}
      filtrosCampos={filtrosCampos}
      valoresIniciales={{ nit: '', nombre: '', tipo: '' }}
      aEditar={(fila) => ({ nit: fila.nit, nombre: fila.nombre, tipo: fila.tipo })}
      textoVacio="No hay entidades registradas"
    />
  );
}
