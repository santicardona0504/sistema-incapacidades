import { z } from 'zod';
import { enRangoValido } from '../../utils/dinero.js';

const fechaSchema = z.coerce.date();
const idParamSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive() }) });

export const listarPagosSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    cobroId: z.coerce.number().int().positive().optional(),
    entidadId: z.coerce.number().int().positive().optional(),
    empleadoId: z.coerce.number().int().positive().optional(),
    incapacidadId: z.coerce.number().int().positive().optional(),
    fechaDesde: fechaSchema.optional(),
    fechaHasta: fechaSchema.optional(),
    referencia: z.string().trim().max(80).optional()
  })
});

export const idPagoSchema = idParamSchema;

export const crearPagoSchema = z.object({
  body: z.object({
    cobroId: z.coerce.number().int().positive(),
    entidadId: z.coerce.number().int().positive(),
    fechaPago: fechaSchema,
    valorPagado: z.coerce.number().refine(enRangoValido, 'El valor pagado debe estar entre 0.01 y 999999999999.99'),
    referencia: z.string().trim().max(80).optional(),
    soporteDocumentoId: z.coerce.number().int().positive().optional()
  })
});

export const adjuntarSoporteSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    soporteDocumentoId: z.coerce.number().int().positive()
  })
});
