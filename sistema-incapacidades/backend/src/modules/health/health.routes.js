import { Router } from 'express';
import { prisma } from '../../utils/prisma.js';
import { success } from '../../utils/api-response.js';

export const healthRoutes = Router();

healthRoutes.get('/health', async (req, res, next) => {
  try {
    const startedAt = Date.now();
    await prisma.$queryRaw`SELECT 1 AS ok`;

    return success(res, {
      servicio: 'backend',
      baseDeDatos: 'conectada',
      latenciaMs: Date.now() - startedAt
    }, 'Servicio disponible');
  } catch (error) {
    return next(error);
  }
});
