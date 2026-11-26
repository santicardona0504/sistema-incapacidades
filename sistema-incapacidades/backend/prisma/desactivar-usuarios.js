import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

async function main() {
  const correos = (process.env.CORREOS_A_DESACTIVAR ?? '')
    .split(',')
    .map((correo) => correo.trim().toLowerCase())
    .filter(Boolean);

  if (correos.length === 0) {
    throw new Error('Indica los correos a desactivar en CORREOS_A_DESACTIVAR (separados por comas).');
  }
  if (process.env.CONFIRMAR !== '1') {
    throw new Error('Esta operación desactiva usuarios y sustituye su contraseña. Confirma con CONFIRMAR=1.');
  }

  // Contraseña nueva imposible de adivinar: la demo compartida deja de ser válida.
  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
  const desactivados = [];

  await prisma.$transaction(async (tx) => {
    for (const correo of correos) {
      const resultado = await tx.usuario.updateMany({
        where: { correo, activo: true },
        data: { activo: false, passwordHash }
      });
      if (resultado.count > 0) desactivados.push(correo);
    }

    if (desactivados.length > 0) {
      await tx.bitacoraAuditoria.create({
        data: {
          accion: 'USUARIO_DESACTIVAR',
          entidad: 'USUARIO',
          detalles: { correos: desactivados, motivo: 'Retiro de credenciales de demostración', via: 'script desactivar-usuarios' }
        }
      });
    }
  });

  console.log(`Usuarios desactivados y con contraseña rotada: ${desactivados.length}`);
  for (const correo of desactivados) console.log(`  - ${correo}`);
  const omitidos = correos.filter((correo) => !desactivados.includes(correo));
  if (omitidos.length > 0) {
    console.log('Sin cambios (no existían o ya estaban desactivados):');
    for (const correo of omitidos) console.log(`  - ${correo}`);
  }
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
