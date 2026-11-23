import { z } from 'zod';

const identificacionSchema = z.string()
  .trim()
  .min(6)
  .max(30)
  .regex(/^[A-Za-z0-9-]+$/, 'Solo se permiten letras, números y guiones');

const textoSchema = z.string().trim().min(2).max(120);
const correoSchema = z.string().trim().email('Correo electrónico inválido').max(160);
const telefonoSchema = z.string()
  .trim()
  .min(7)
  .max(30)
  .regex(/^[0-9+\-()\s]+$/, 'Teléfono inválido');

const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});

export const listarEmpleadosSchema = z.object({
  query: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    activo: z.enum(['true', 'false']).optional(),
    area: z.string().trim().max(120).optional(),
    buscar: z.string().trim().max(120).optional()
  })
});

export const crearEmpleadoSchema = z.object({
  body: z.object({
    identificacion: identificacionSchema,
    nombres: textoSchema,
    apellidos: textoSchema,
    cargo: textoSchema,
    area: textoSchema,
    correo: correoSchema.optional(),
    telefono: telefonoSchema.optional(),
    activo: z.boolean().default(true)
  })
});

export const editarEmpleadoSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    identificacion: identificacionSchema.optional(),
    nombres: textoSchema.optional(),
    apellidos: textoSchema.optional(),
    cargo: textoSchema.optional(),
    area: textoSchema.optional(),
    correo: correoSchema.optional(),
    telefono: telefonoSchema.optional()
  }).refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo')
});

export const cambiarEstadoSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({ activo: z.boolean() })
});

export const idEmpleadoSchema = idParamSchema;
