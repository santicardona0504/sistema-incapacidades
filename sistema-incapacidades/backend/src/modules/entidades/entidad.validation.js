import { z } from 'zod';

export const listarEntidadesSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    tipo: z.enum(['EPS', 'ARL']).optional(),
    activa: z.enum(['true', 'false']).optional(),
    buscar: z.string().trim().max(120).optional()
  })
});

export const idEntidadSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});
