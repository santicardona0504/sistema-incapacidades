import { z } from 'zod';
import { aNumero, enRangoValido } from '../../utils/dinero.js';

const ESTADOS_COBRO = ['PENDIENTE', 'GESTIONADO', 'COMPROMISO_PAGO', 'COBRADO', 'RECHAZADO'];
const fechaSchema = z.coerce.date();
const idParamSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive() }) });

export const listarCobrosSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    estado: z.enum(ESTADOS_COBRO).optional(),
    incapacidadId: z.coerce.number().int().positive().optional(),
    radicacionId: z.coerce.number().int().positive().optional(),
    entidadId: z.coerce.number().int().positive().optional(),
    empleadoId: z.coerce.number().int().positive().optional(),
    fechaDesde: fechaSchema.optional(),
    fechaHasta: fechaSchema.optional(),
    soloPendientes: z.enum(['true', 'false']).optional(),
    buscar: z.string().trim().max(80).optional()
  })
});

export const idCobroSchema = idParamSchema;

export const crearCobroSchema = z.object({
  body: z.object({
    incapacidadId: z.coerce.number().int().positive(),
    radicacionId: z.coerce.number().int().positive(),
    numeroSolicitud: z.string().trim().min(3).max(60),
    fechaSolicitud: fechaSchema,
    valorReconocido: z.coerce.number().refine(enRangoValido, 'El valor reconocido debe estar entre 0.01 y 999999999999.99'),
    responsableId: z.coerce.number().int().positive().optional(),
    observaciones: z.string().trim().max(2000).optional()
  })
});

export const editarCobroSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    estado: z.enum(ESTADOS_COBRO).optional(),
    responsableId: z.coerce.number().int().positive().optional(),
    observaciones: z.string().trim().max(2000).optional()
  }).refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo')
});

export const crearGestionSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    fechaGestion: fechaSchema,
    compromisoPago: fechaSchema.optional(),
    observaciones: z.string().trim().min(3).max(2000)
  }).refine((datos) => !datos.compromisoPago || datos.compromisoPago >= datos.fechaGestion, {
    message: 'El compromiso de pago no puede ser anterior a la gestión',
    path: ['compromisoPago']
  })
});

export function normalizarValor(valor) {
  return aNumero(valor);
}
