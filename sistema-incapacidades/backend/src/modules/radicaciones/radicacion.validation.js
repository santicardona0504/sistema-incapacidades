import { z } from 'zod';

const fechaSchema = z.coerce.date();

export const listarRadicacionesSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    incapacidadId: z.coerce.number().int().positive().optional(),
    entidadId: z.coerce.number().int().positive().optional(),
    numeroRadicado: z.string().trim().max(80).optional(),
    fechaDesde: fechaSchema.optional(),
    fechaHasta: fechaSchema.optional()
  })
});

export const crearRadicacionSchema = z.object({
  params: z.object({ incapacidadId: z.coerce.number().int().positive() }),
  body: z.object({
    entidadId: z.coerce.number().int().positive().optional(),
    fechaTranscripcion: fechaSchema,
    numeroRadicado: z.string().trim().min(3).max(80),
    fechaRadicacion: fechaSchema.optional(),
    responsable: z.string().trim().min(3).max(160),
    observaciones: z.string().trim().max(2000).optional()
  })
});

export const idRadicacionSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});
