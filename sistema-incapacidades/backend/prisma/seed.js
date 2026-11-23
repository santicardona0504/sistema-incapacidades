import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';
import { PERMISOS, PERMISOS_POR_ROL } from '../src/config/permissions.js';

const prisma = new PrismaClient();

const DESCRIPCIONES_ROL = {
  ADMINISTRADOR: 'Administrador del sistema con acceso completo',
  GESTION_HUMANA: 'Gestión de incapacidades, empleados y conciliaciones',
  ADMINISTRACION_PERSONAL: 'Registro y seguimiento de empleados e incapacidades',
  TESORERIA: 'Gestión de cobros, pagos y validación de conciliaciones',
  CONTABILIDAD: 'Revisión contable y validación de conciliaciones',
  CONSULTA: 'Consulta de información sin permisos de modificación'
};

const USUARIOS = [
  { nombre: 'Ana Administradora', correo: 'admin@incapacidades.test', rol: 'ADMINISTRADOR' },
  { nombre: 'Gabriela Gestión', correo: 'gestion.humana@incapacidades.test', rol: 'GESTION_HUMANA' },
  { nombre: 'Andrés Personal', correo: 'personal@incapacidades.test', rol: 'ADMINISTRACION_PERSONAL' },
  { nombre: 'Teresa Tesorería', correo: 'tesoreria@incapacidades.test', rol: 'TESORERIA' },
  { nombre: 'Carlos Contabilidad', correo: 'contabilidad@incapacidades.test', rol: 'CONTABILIDAD' },
  { nombre: 'Claudia Consulta', correo: 'consulta@incapacidades.test', rol: 'CONSULTA' }
];

const ENTIDADES = [
  { nit: '900000001', nombre: 'EPS Demo Salud Integral', tipo: 'EPS' },
  { nit: '900000002', nombre: 'ARL Demo Riesgos Seguros', tipo: 'ARL' },
  { nit: '900000003', nombre: 'EPS Demo Vida Saludable', tipo: 'EPS' }
];

const EMPLEADOS = [
  {
    identificacion: '1000000001',
    nombres: 'María Fernanda',
    apellidos: 'Pérez López',
    cargo: 'Analista de Cartera',
    area: 'Financiera',
    correo: 'maria.perez@empleado.test',
    telefono: '3001110001'
  },
  {
    identificacion: '1000000002',
    nombres: 'Juan David',
    apellidos: 'Ramírez Torres',
    cargo: 'Desarrollador',
    area: 'Tecnología',
    correo: 'juan.ramirez@empleado.test',
    telefono: '3001110002'
  },
  {
    identificacion: '1000000003',
    nombres: 'Luz Marina',
    apellidos: 'Gómez Ruiz',
    cargo: 'Coordinadora de Talento',
    area: 'Gestión Humana',
    correo: 'luz.gomez@empleado.test',
    telefono: '3001110003'
  },
  {
    identificacion: '1000000004',
    nombres: 'Pedro Antonio',
    apellidos: 'Soto Maya',
    cargo: 'Técnico de Mantenimiento',
    area: 'Operaciones',
    correo: 'pedro.soto@empleado.test',
    telefono: '3001110004'
  },
  {
    identificacion: '1000000005',
    nombres: 'Sara Isabel',
    apellidos: 'Castro Vega',
    cargo: 'Contadora',
    area: 'Contabilidad',
    correo: 'sara.castro@empleado.test',
    telefono: '3001110005'
  },
  {
    identificacion: '1000000006',
    nombres: 'Diego Alejandro',
    apellidos: 'Bravo León',
    cargo: 'Auxiliar Administrativo',
    area: 'Administración',
    correo: 'diego.bravo@empleado.test',
    telefono: '3001110006'
  }
];

async function main() {
  const passwordHash = await hashPassword('Demo1234!');

  await prisma.$transaction(async (tx) => {
    for (const permiso of PERMISOS) {
      await tx.permiso.upsert({
        where: { clave: permiso.clave },
        update: { descripcion: permiso.descripcion },
        create: permiso
      });
    }

    for (const [nombre, descripcion] of Object.entries(DESCRIPCIONES_ROL)) {
      await tx.rol.upsert({
        where: { nombre },
        update: { descripcion },
        create: { nombre, descripcion }
      });
    }

    const permisos = await tx.permiso.findMany({ select: { id: true, clave: true } });
    const permisosPorClave = new Map(permisos.map((permiso) => [permiso.clave, permiso.id]));

    for (const [nombre, claves] of Object.entries(PERMISOS_POR_ROL)) {
      const rol = await tx.rol.findUnique({ where: { nombre } });

      await tx.rolPermiso.deleteMany({ where: { rolId: rol.id } });
      await tx.rolPermiso.createMany({
        data: claves.map((clave) => ({ rolId: rol.id, permisoId: permisosPorClave.get(clave) }))
      });
    }

    const roles = await tx.rol.findMany({ select: { id: true, nombre: true } });
    const rolesPorNombre = new Map(roles.map((rol) => [rol.nombre, rol.id]));

    for (const usuario of USUARIOS) {
      await tx.usuario.upsert({
        where: { correo: usuario.correo },
        update: {
          nombre: usuario.nombre,
          passwordHash,
          rolId: rolesPorNombre.get(usuario.rol),
          activo: true
        },
        create: {
          nombre: usuario.nombre,
          correo: usuario.correo,
          passwordHash,
          rolId: rolesPorNombre.get(usuario.rol),
          activo: true
        }
      });
    }

    for (const entidad of ENTIDADES) {
      await tx.entidadSalud.upsert({
        where: { nit: entidad.nit },
        update: { nombre: entidad.nombre, tipo: entidad.tipo, activa: true },
        create: entidad
      });
    }

    for (const empleado of EMPLEADOS) {
      await tx.empleado.upsert({
        where: { identificacion: empleado.identificacion },
        update: empleado,
        create: empleado
      });
    }
  });

  console.log('Seed aplicado: roles, permisos, usuarios, entidades y empleados ficticios.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
