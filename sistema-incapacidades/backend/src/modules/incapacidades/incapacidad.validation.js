import { z } from 'zod';
import { ESTADOS_INCAPACIDAD } from './estado.service.js';

const TIPOS = [
  'INCAPACIDAD_TEMPORAL',
  'LICENCIA_MATERNIDAD',
  'LICENCIA_PATERNIDAD'
];
const ORIGENES = ['COMUN', 'LABORAL'];
const fechaSchema = z.coerce.date();
const observacionesSchema = z.string().trim().max(2000).optional();
const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});

export const idIncapacidadSchema = idParamSchema;

export const listarIncapacidadesSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    empleadoId: z.coerce.number().int().positive().optional(),
    entidadId: z.coerce.number().int().positive().optional(),
    tipo: z.enum(TIPOS).optional(),
    origen: z.enum(ORIGENES).optional(),
    estado: z.enum(ESTADOS_INCAPACIDAD).optional(),
    fechaDesde: fechaSchema.optional(),
    fechaHasta: fechaSchema.optional(),
    buscar: z.string().trim().max(80).optional()
  })
});

export const crearIncapacidadSchema = z.object({
  body: z.object({
    empleadoId: z.coerce.number().int().positive(),
    entidadId: z.coerce.number().int().positive(),
    tipo: z.enum(TIPOS),
    origen: z.enum(ORIGENES),
    fechaInicio: fechaSchema,
    fechaFin: fechaSchema,
    fechaRecepcion: fechaSchema,
    observaciones: observacionesSchema
  }).refine((datos) => datos.fechaFin >= datos.fechaInicio, {
    message: 'La fecha final debe ser igual o posterior a la fecha de inicio',
    path: ['fechaFin']
  })
});

export const editarIncapacidadSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    empleadoId: z.coerce.number().int().positive().optional(),
    entidadId: z.coerce.number().int().positive().optional(),
    tipo: z.enum(TIPOS).optional(),
    origen: z.enum(ORIGENES).optional(),
    fechaInicio: fechaSchema.optional(),
    fechaFin: fechaSchema.optional(),
    fechaRecepcion: fechaSchema.optional(),
    observaciones: observacionesSchema
  }).refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo')
}).refine((datos) => {
  if (!datos.body.fechaInicio || !datos.body.fechaFin) {
    return true;
  }
  return datos.body.fechaFin >= datos.body.fechaInicio;
}, {
  message: 'La fecha final debe ser igual o posterior a la fecha de inicio',
  path: ['body', 'fechaFin']
});

export const cambiarEstadoSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    estado: z.enum(ESTADOS_INCAPACIDAD),
    observaciones: observacionesSchema
  })
});

export const crearRechazoSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    radicacionId: z.coerce.number().int().positive().optional(),
    causal: z.string().trim().min(5).max(2000),
    accionesCorrectivas: z.string().trim().max(2000).optional(),
    fechaRechazo: fechaSchema,
    observaciones: observacionesSchema
  })
});

export const editarRechazoSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    accionesCorrectivas: z.string().trim().min(3).max(2000)
  })
});

export const historialPorIncapacidadSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(50)
  })
});
