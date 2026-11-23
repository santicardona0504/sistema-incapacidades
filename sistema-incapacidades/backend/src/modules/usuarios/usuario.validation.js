import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/\d/, 'Debe incluir al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un carácter especial');

const correoSchema = z.string().trim().email('Correo electrónico inválido').max(160);
const nombreSchema = z.string().trim().min(2).max(120);
const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});

export const listarUsuariosSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    activo: z.enum(['true', 'false']).optional(),
    rolId: z.coerce.number().int().positive().optional(),
    buscar: z.string().trim().max(120).optional()
  })
});

export const crearUsuarioSchema = z.object({
  body: z.object({
    nombre: nombreSchema,
    correo: correoSchema,
    password: passwordSchema,
    rolId: z.coerce.number().int().positive(),
    activo: z.boolean().default(true)
  })
});

export const editarUsuarioSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    nombre: nombreSchema.optional(),
    correo: correoSchema.optional(),
    password: passwordSchema.optional(),
    rolId: z.coerce.number().int().positive().optional(),
    activo: z.boolean().optional()
  }).refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo')
});

export const idUsuarioSchema = idParamSchema;
