import { z } from 'zod';

const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});

export const idRolSchema = idParamSchema;

export const asignarPermisosSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    permisoIds: z.array(z.coerce.number().int().positive())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length, 'Los permisos no deben repetirse')
  })
});
