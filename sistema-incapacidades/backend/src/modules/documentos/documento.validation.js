import { z } from 'zod';

const TIPOS_DOCUMENTO = [
  'CERTIFICADO',
  'SOPORTE',
  'RADICACION',
  'CORRECCION',
  'SOPORTE_PAGO',
  'OTRO'
];

export const listarDocumentosSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    incapacidadId: z.coerce.number().int().positive().optional(),
    rechazoId: z.coerce.number().int().positive().optional(),
    tipo: z.enum(TIPOS_DOCUMENTO).optional()
  })
});

export const crearDocumentoSchema = z.object({
  params: z.object({ incapacidadId: z.coerce.number().int().positive() }),
  body: z.object({
    tipo: z.enum(TIPOS_DOCUMENTO),
    rechazoId: z.preprocess(
      (valor) => (valor === '' || valor === undefined ? undefined : valor),
      z.coerce.number().int().positive().optional()
    )
  })
});

export const idDocumentoSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});
