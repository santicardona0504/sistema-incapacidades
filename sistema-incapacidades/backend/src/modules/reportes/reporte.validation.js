import { z } from 'zod';

const fechaSchema = z.coerce.date();

const TIPOS = ['INCAPACIDAD_TEMPORAL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD'];
const ORIGENES = ['COMUN', 'LABORAL'];
const ESTADOS = [
  'REGISTRADA', 'TRANSCRITA', 'COBRADA', 'RECHAZADA', 'PAGADA',
  'PENDIENTE', 'GESTIONADO', 'COMPROMISO_PAGO', 'COBRADO', 'RECHAZADO',
  'EN_CONSOLIDACION', 'EN_REVISION', 'VALIDADA'
];

export const reporteSchema = z.object({
  query: z.object({
    formato: z.enum(['csv', 'json']).default('csv'),
    fechaDesde: fechaSchema.optional(),
    fechaHasta: fechaSchema.optional(),
    empleadoId: z.coerce.number().int().positive().optional(),
    entidadId: z.coerce.number().int().positive().optional(),
    tipo: z.enum(TIPOS).optional(),
    estado: z.enum(ESTADOS).optional(),
    origen: z.enum(ORIGENES).optional(),
    numeroRadicado: z.string().trim().max(80).optional(),
    umbral: z.enum(['DIAS_90', 'DIAS_120', 'DIAS_150', 'DIAS_180']).optional(),
    leida: z.enum(['true', 'false']).optional()
  })
});
