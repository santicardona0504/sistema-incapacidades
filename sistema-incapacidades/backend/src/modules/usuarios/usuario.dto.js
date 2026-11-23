export function toUsuarioDto(usuario) {
  const rol = usuario.rol;
  const permisos = rol?.permisos?.map((item) => item.permiso.clave) ?? [];

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    activo: usuario.activo,
    ultimoAcceso: usuario.ultimoAcceso,
    creadoEn: usuario.creadoEn,
    rol: rol ? { id: rol.id, nombre: rol.nombre, descripcion: rol.descripcion } : null,
    permisos
  };
}
