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

const datosEntidad = {
  nit: z.string().trim().min(5, 'El NIT debe tener al menos 5 caracteres').max(30),
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(160),
  tipo: z.enum(['EPS', 'ARL'])
};

export const crearEntidadSchema = z.object({
  body: z.object({
    ...datosEntidad,
    activa: z.boolean().default(true)
  })
});

export const editarEntidadSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    nit: datosEntidad.nit.optional(),
    nombre: datosEntidad.nombre.optional(),
    tipo: datosEntidad.tipo.optional()
  }).refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo')
});

export const cambiarEstadoEntidadSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({ activa: z.boolean() })
});

export const idEntidadSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});
