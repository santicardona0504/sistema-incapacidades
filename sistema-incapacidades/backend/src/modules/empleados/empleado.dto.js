export function toEmpleadoDto(empleado) {
  return {
    id: empleado.id,
    identificacion: empleado.identificacion,
    nombres: empleado.nombres,
    apellidos: empleado.apellidos,
    nombreCompleto: `${empleado.nombres} ${empleado.apellidos}`,
    cargo: empleado.cargo,
    area: empleado.area,
    correo: empleado.correo,
    telefono: empleado.telefono,
    activo: empleado.activo,
    totalIncapacidades: empleado._count?.incapacidades,
    creadoEn: empleado.creadoEn,
    actualizadoEn: empleado.actualizadoEn
  };
}
