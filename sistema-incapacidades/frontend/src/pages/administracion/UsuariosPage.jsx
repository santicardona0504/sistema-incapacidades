import { useEffect, useMemo, useState } from 'react';
import { userService } from '../../services/usuario.service.js';
import { ManagePage } from '../../components/common/ManagePage.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { formatoFechaHora } from '../../utils/formato.js';

const servicio = {
  listar: (filtros) => userService.listar(filtros),
  crear: (datos) => userService.crear(datos),
  actualizar: (id, datos) => userService.actualizar(id, datos),
  eliminar: (id) => userService.desactivar(id)
};

export function UsuariosPage() {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    userService.roles().then((respuesta) => setRoles(respuesta.data ?? [])).catch(() => {});
  }, []);

  const columnas = useMemo(() => [
    { titulo: 'Nombre', clave: 'nombre', render: (fila) => <span className="fw-semibold">{fila.nombre}</span> },
    { titulo: 'Correo', clave: 'correo' },
    { titulo: 'Rol', clave: 'rol', render: (fila) => fila.rol?.nombre ?? '—' },
    { titulo: 'Estado', clave: 'activo', render: (fila) => <StatusBadge valor={fila.activo ? 'ACTIVO' : 'INACTIVO'} texto={fila.activo ? 'Activo' : 'Inactivo'} /> },
    { titulo: 'Último acceso', clave: 'ultimoAcceso', render: (fila) => formatoFechaHora(fila.ultimoAcceso) }
  ], []);

  const campos = useMemo(() => [
    { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
    { clave: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', requerido: true },
    { clave: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true, soloCrear: true, ayuda: 'Mínimo 8 caracteres, mayúscula, minúscula, dígito y carácter especial.' },
    {
      clave: 'rolId', etiqueta: 'Rol', tipo: 'select', requerido: true,
      opciones: roles.map((rol) => ({ valor: rol.id, etiqueta: rol.nombre }))
    },
    { clave: 'activo', etiqueta: 'Usuario activo', tipo: 'checkbox' }
  ], [roles]);

  const filtrosCampos = useMemo(() => [
    { clave: 'buscar', etiqueta: 'Buscar', placeholder: 'Nombre o correo' },
    {
      clave: 'rolId', etiqueta: 'Rol', tipo: 'select',
      opciones: roles.map((rol) => ({ valor: rol.id, etiqueta: rol.nombre }))
    },
    {
      clave: 'activo', etiqueta: 'Estado', tipo: 'select',
      opciones: [{ valor: 'true', etiqueta: 'Activos' }, { valor: 'false', etiqueta: 'Inactivos' }]
    }
  ], [roles]);

  return (
    <ManagePage
      titulo="Usuarios"
      subtitulo="Administración de cuentas y accesos al sistema"
      permisoVer="USUARIOS_VER"
      permisoCrear="USUARIOS_CREAR"
      permisoEditar="USUARIOS_EDITAR"
      permisoEliminar="USUARIOS_DESACTIVAR"
      servicio={servicio}
      coleccion="usuarios"
      columnas={columnas}
      campos={campos}
      filtrosCampos={filtrosCampos}
      valoresIniciales={{ nombre: '', correo: '', password: '', rolId: '', activo: true }}
      aEditar={(fila) => ({
        nombre: fila.nombre,
        correo: fila.correo,
        rolId: String(fila.rol?.id ?? ''),
        activo: Boolean(fila.activo)
      })}
      textoVacio="No hay usuarios registrados"
    />
  );
}
