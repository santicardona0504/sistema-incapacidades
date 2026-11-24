import { z } from 'zod';

const fechaSchema = z.coerce.date();
const ESTADOS = ['EN_CONSOLIDACION', 'EN_REVISION', 'VALIDADA'];
const idParamSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive() }) });

export const listarConciliacionesSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    estado: z.enum(ESTADOS).optional(),
    periodo: z.string().trim().max(20).optional(),
    fechaDesde: fechaSchema.optional(),
    fechaHasta: fechaSchema.optional()
  })
});

export const idConciliacionSchema = idParamSchema;

export const crearConciliacionSchema = z.object({
  body: z.object({
    periodo: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El periodo debe tener formato YYYY-MM'),
    fechaInicio: fechaSchema,
    fechaFin: fechaSchema,
    observaciones: z.string().trim().max(2000).optional()
  }).refine((datos) => datos.fechaFin >= datos.fechaInicio, {
    message: 'La fecha final debe ser igual o posterior a la fecha de inicio',
    path: ['fechaFin']
  })
});

export const agregarDetalleSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    pagoId: z.coerce.number().int().positive(),
    valorConciliado: z.coerce.number().positive(),
    observaciones: z.string().trim().max(2000).optional()
  })
});

export const detalleParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    pagoId: z.coerce.number().int().positive()
  })
});

export const validarConciliacionSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    observaciones: z.string().trim().max(2000).optional()
  })
});
