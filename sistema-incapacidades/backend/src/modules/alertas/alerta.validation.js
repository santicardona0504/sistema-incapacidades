import { z } from 'zod';

const UMBRALES = ['DIAS_90', 'DIAS_120', 'DIAS_150', 'DIAS_180'];
const ESTADOS = ['REGISTRADA', 'TRANSCRITA', 'COBRADA', 'RECHAZADA', 'PAGADA'];
const fechaSchema = z.coerce.date();
const idParamSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive() }) });

export const listarAlertasSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    umbral: z.enum(UMBRALES).optional(),
    leida: z.enum(['true', 'false']).optional(),
    empleadoId: z.coerce.number().int().positive().optional(),
    entidadId: z.coerce.number().int().positive().optional(),
    estado: z.enum(ESTADOS).optional(),
    fechaDesde: fechaSchema.optional(),
    fechaHasta: fechaSchema.optional()
  })
});

export const idAlertaSchema = idParamSchema;

export const marcarTodasSchema = z.object({
  body: z.object({
    umbral: z.enum(UMBRALES).optional()
  })
});
