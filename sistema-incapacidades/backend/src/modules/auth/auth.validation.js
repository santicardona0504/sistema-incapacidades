import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    correo: z.string().trim().email('Correo electrónico inválido').max(160),
    password: z.string().min(1, 'La contraseña es obligatoria').max(200)
  })
});
