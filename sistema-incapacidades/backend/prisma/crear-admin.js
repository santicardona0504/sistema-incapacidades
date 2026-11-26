import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';
import { crearUsuarioSchema } from '../src/modules/usuarios/usuario.validation.js';
import { asegurarCatalogos } from './catalogos.js';

const prisma = new PrismaClient();

function generarPassword() {
  // El prefijo garantiza las reglas de complejidad del sistema; el resto es aleatorio.
  return `Aa1!${randomBytes(24).toString('base64url')}`;
}

async function preguntar(mensaje) {
  if (!stdin.isTTY) {
    throw new Error(`Falta el dato requerido. Pasa la variable de entorno correspondiente o ejecuta el script en una terminal interactiva: ${mensaje}`);
  }
  const interfaz = createInterface({ input: stdin, output: stdout });
  try {
    return (await interfaz.question(mensaje)).trim();
  } finally {
    interfaz.close();
  }
}

async function main() {
  const nombre = process.env.ADMIN_NOMBRE || await preguntar('Nombre del administrador: ');
  const correo = process.env.ADMIN_CORREO || await preguntar('Correo del administrador: ');
  const password = process.env.ADMIN_PASSWORD || generarPassword();

  await prisma.$transaction(asegurarCatalogos);

  const rol = await prisma.rol.findUnique({ where: { nombre: 'ADMINISTRADOR' } });
  if (!rol) throw new Error('No fue posible obtener el rol ADMINISTRADOR');

  const existente = await prisma.usuario.findUnique({ where: { correo: correo.trim().toLowerCase() } });
  if (existente) {
    throw new Error(`Ya existe un usuario con el correo ${correo}. No se sobrescribió ningún dato.`);
  }

  const datos = crearUsuarioSchema.parse({
    body: { nombre, correo, password, rolId: rol.id, activo: true }
  }).body;

  const creado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        nombre: datos.nombre,
        correo: datos.correo,
        passwordHash: await hashPassword(datos.password),
        rolId: rol.id,
        activo: true
      },
      select: { id: true, nombre: true, correo: true }
    });

    await tx.bitacoraAuditoria.create({
      data: {
        accion: 'ADMIN_CREAR',
        entidad: 'USUARIO',
        entidadId: usuario.id,
        detalles: { via: 'script crear-admin' }
      }
    });

    return usuario;
  });

  console.log('Administrador inicial creado correctamente.');
  console.log(`  Nombre: ${creado.nombre}`);
  console.log(`  Correo: ${creado.correo}`);
  console.log(`  Contraseña: ${password}`);
  console.log('Guárdala en un lugar seguro y cámbiala desde Usuarios después de iniciar sesión.');
}

main()
  .catch((error) => {
    if (error?.issues) {
      console.error('Datos inválidos:', error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' · '));
    } else {
      console.error(error.message ?? error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
