import { z } from 'zod';

const fechaSchema = z.coerce.date();

export const listarAuditoriaSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    accion: z.string().trim().max(80).optional(),
    entidad: z.string().trim().max(80).optional(),
    entidadId: z.coerce.number().int().positive().optional(),
    usuarioId: z.coerce.number().int().positive().optional(),
    fechaDesde: fechaSchema.optional(),
    fechaHasta: fechaSchema.optional()
  })
});
