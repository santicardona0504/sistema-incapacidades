import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { asegurarCatalogos } from './catalogos.js';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(asegurarCatalogos);
  console.log('Catálogos base asegurados: roles y permisos. No se crearon usuarios ni datos de demostración.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
