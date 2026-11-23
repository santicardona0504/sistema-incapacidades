import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './utils/prisma.js';

await prisma.$connect();

const server = app.listen(env.PORT, () => {
  console.log(`Backend escuchando en http://localhost:${env.PORT}`);
});

async function cerrarServicio(senal) {
  console.log(`Cerrando servicio por ${senal}`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => cerrarServicio('SIGINT'));
process.on('SIGTERM', () => cerrarServicio('SIGTERM'));
