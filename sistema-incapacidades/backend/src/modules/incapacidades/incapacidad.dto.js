export function toIncapacidadDto(incapacidad) {
  return {
    id: incapacidad.id,
    codigo: incapacidad.codigo,
    empleado: incapacidad.empleado ? {
      id: incapacidad.empleado.id,
      identificacion: incapacidad.empleado.identificacion,
      nombreCompleto: `${incapacidad.empleado.nombres} ${incapacidad.empleado.apellidos}`,
      cargo: incapacidad.empleado.cargo,
      area: incapacidad.empleado.area
    } : null,
    entidad: incapacidad.entidad ? {
      id: incapacidad.entidad.id,
      nombre: incapacidad.entidad.nombre,
      tipo: incapacidad.entidad.tipo
    } : null,
    tipo: incapacidad.tipo,
    origen: incapacidad.origen,
    fechaInicio: incapacidad.fechaInicio,
    fechaFin: incapacidad.fechaFin,
    dias: incapacidad.dias,
    fechaRecepcion: incapacidad.fechaRecepcion,
    observaciones: incapacidad.observaciones,
    estado: incapacidad.estado,
    registradaPor: incapacidad.registradaPor ? {
      id: incapacidad.registradaPor.id,
      nombre: incapacidad.registradaPor.nombre
    } : null,
    totalDocumentos: incapacidad._count?.documentos ?? 0,
    totalRadicaciones: incapacidad._count?.radicaciones ?? 0,
    totalRechazos: incapacidad._count?.rechazos ?? 0,
    creadoEn: incapacidad.creadoEn,
    actualizadoEn: incapacidad.actualizadoEn
  };
}

export function toRechazoDto(rechazo) {
  return {
    id: rechazo.id,
    radicacionId: rechazo.radicacionId,
    causal: rechazo.causal,
    accionesCorrectivas: rechazo.accionesCorrectivas,
    fechaRechazo: rechazo.fechaRechazo,
    registradoPor: rechazo.registradoPor ? {
      id: rechazo.registradoPor.id,
      nombre: rechazo.registradoPor.nombre
    } : null,
    totalDocumentos: rechazo._count?.documentos ?? 0,
    creadoEn: rechazo.creadoEn
  };
}
