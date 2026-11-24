import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { empleadoService } from '../../services/empleado.service.js';
import { ManagePage } from '../../components/common/ManagePage.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';

const servicio = {
  listar: (filtros) => empleadoService.listar(filtros),
  crear: (datos) => empleadoService.crear(datos),
  actualizar: (id, datos) => empleadoService.actualizar(id, datos),
  eliminar: (id) => empleadoService.cambiarEstado(id, false)
};

export function EmpleadosPage() {
  const columnas = useMemo(() => [
    {
      titulo: 'Empleado', clave: 'nombreCompleto',
      render: (fila) => <Link to={`/empleados/${fila.id}`} className="fw-semibold">{fila.nombreCompleto}</Link>
    },
    { titulo: 'Identificación', clave: 'identificacion' },
    { titulo: 'Cargo', clave: 'cargo' },
    { titulo: 'Área', clave: 'area' },
    { titulo: 'Incapacidades', clave: 'totalIncapacidades', render: (fila) => fila.totalIncapacidades ?? 0 },
    { titulo: 'Estado', clave: 'activo', render: (fila) => <StatusBadge valor={fila.activo ? 'ACTIVO' : 'INACTIVO'} texto={fila.activo ? 'Activo' : 'Inactivo'} /> }
  ], []);

  const campos = useMemo(() => [
    { clave: 'identificacion', etiqueta: 'Identificación', requerido: true, soloCrear: true, placeholder: 'CC-12345678' },
    { clave: 'nombres', etiqueta: 'Nombres', requerido: true },
    { clave: 'apellidos', etiqueta: 'Apellidos', requerido: true },
    { clave: 'cargo', etiqueta: 'Cargo', requerido: true },
    { clave: 'area', etiqueta: 'Área', requerido: true },
    { clave: 'correo', etiqueta: 'Correo electrónico', tipo: 'email' },
    { clave: 'telefono', etiqueta: 'Teléfono', placeholder: '+57 300 000 0000' }
  ], []);

  const filtrosCampos = useMemo(() => [
    { clave: 'buscar', etiqueta: 'Buscar', placeholder: 'Nombre o identificación' },
    { clave: 'area', etiqueta: 'Área', placeholder: 'Área' },
    {
      clave: 'activo', etiqueta: 'Estado', tipo: 'select',
      opciones: [{ valor: 'true', etiqueta: 'Activos' }, { valor: 'false', etiqueta: 'Inactivos' }]
    }
  ], []);

  return (
    <ManagePage
      titulo="Empleados"
      subtitulo="Gestión de la información básica del personal"
      permisoVer="EMPLEADOS_VER"
      permisoCrear="EMPLEADOS_CREAR"
      permisoEditar="EMPLEADOS_EDITAR"
      permisoEliminar="EMPLEADOS_DESACTIVAR"
      servicio={servicio}
      coleccion="empleados"
      columnas={columnas}
      campos={campos}
      filtrosCampos={filtrosCampos}
      valoresIniciales={{ identificacion: '', nombres: '', apellidos: '', cargo: '', area: '', correo: '', telefono: '' }}
      aEditar={(fila) => ({
        identificacion: fila.identificacion,
        nombres: fila.nombres,
        apellidos: fila.apellidos,
        cargo: fila.cargo,
        area: fila.area,
        correo: fila.correo ?? '',
        telefono: fila.telefono ?? ''
      })}
      accionesFila={(fila) => (
        <Link className="btn btn-outline-secondary" to={`/empleados/${fila.id}`}>Ver detalle</Link>
      )}
      textoVacio="No hay empleados registrados"
    />
  );
}
