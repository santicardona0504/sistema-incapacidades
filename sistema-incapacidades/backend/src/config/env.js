import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_COOKIE_NAME: z.string().default('incapacidades_token'),
  DOCUMENT_STORAGE_PATH: z.string().default('../storage/documentos'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10)
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Variables de entorno inválidas: ${parsed.error.message}`);
}

export const env = parsed.data;
