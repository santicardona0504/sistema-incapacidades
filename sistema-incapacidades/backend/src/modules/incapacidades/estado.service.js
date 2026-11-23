import { AppError } from '../../utils/api-response.js';

export const ESTADOS_INCAPACIDAD = [
  'REGISTRADA',
  'TRANSCRITA',
  'COBRADA',
  'RECHAZADA',
  'PAGADA'
];

export const TRANSICIONES_PERMITIDAS = {
  REGISTRADA: ['TRANSCRITA'],
  TRANSCRITA: ['COBRADA', 'RECHAZADA'],
  COBRADA: ['PAGADA', 'RECHAZADA'],
  RECHAZADA: ['TRANSCRITA'],
  PAGADA: []
};

export function validarTransicion(estadoActual, estadoNuevo) {
  if (estadoActual === estadoNuevo) {
    throw new AppError(400, `La incapacidad ya está en el estado ${estadoNuevo}`);
  }

  const permitidos = TRANSICIONES_PERMITIDAS[estadoActual] ?? [];

  if (!permitidos.includes(estadoNuevo)) {
    throw new AppError(400, `Transición no permitida: ${estadoActual} → ${estadoNuevo}`, {
      estadoActual,
      estadoNuevo,
      permitidos
    });
  }
}

export async function registrarCambioEstado(tx, datos) {
  return tx.historialEstado.create({
    data: {
      incapacidadId: datos.incapacidadId,
      estadoAnterior: datos.estadoAnterior ?? null,
      estadoNuevo: datos.estadoNuevo,
      usuarioId: datos.usuarioId,
      observaciones: datos.observaciones ?? null
    }
  });
}
