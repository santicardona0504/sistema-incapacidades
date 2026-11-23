import { z } from 'zod';

export const listarHistorialSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    incapacidadId: z.coerce.number().int().positive().optional(),
    usuarioId: z.coerce.number().int().positive().optional(),
    estadoNuevo: z.enum([
      'REGISTRADA',
      'TRANSCRITA',
      'COBRADA',
      'RECHAZADA',
      'PAGADA'
    ]).optional(),
    fechaDesde: z.coerce.date().optional(),
    fechaHasta: z.coerce.date().optional()
  })
});
