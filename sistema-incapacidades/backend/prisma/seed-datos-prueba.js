import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (process.env.PERMITIR_DATOS_DEMO !== '1') {
  console.error('Este script crea datos ficticios y está deshabilitado. Solo se puede ejecutar de forma explícita con PERMITIR_DATOS_DEMO=1; no se invoca desde el arranque ni desde las migraciones.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function obtenerDatosBase() {
  const [usuario, empleados, entidades] = await Promise.all([
    prisma.usuario.findFirst({ where: { activo: true, rol: { nombre: 'ADMINISTRADOR' } } }),
    prisma.empleado.findMany({ where: { activo: true }, orderBy: { id: 'asc' }, take: 3 }),
    prisma.entidadSalud.findMany({ where: { activa: true }, orderBy: { id: 'asc' } })
  ]);

  if (!usuario || empleados.length < 2 || entidades.length < 2) {
    throw new Error('Ejecuta primero npm run seed para crear usuarios, empleados y entidades');
  }

  return { usuario, empleados, entidades };
}

async function upsertIncapacidad(datos) {
  return prisma.incapacidad.upsert({
    where: { codigo: datos.codigo },
    update: {},
    create: datos
  });
}

async function upsertRadicacion(datos) {
  return prisma.radicacion.upsert({
    where: {
      entidadId_numeroRadicado: {
        entidadId: datos.entidadId,
        numeroRadicado: datos.numeroRadicado
      }
    },
    update: {},
    create: datos
  });
}

async function crearSiNoExiste(modelo, where, datos) {
  const existente = await modelo.findFirst({ where });
  if (existente) return existente;
  return modelo.create({ data: datos });
}

async function main() {
  const { usuario, empleados, entidades } = await obtenerDatosBase();
  const eps = entidades.find((entidad) => entidad.tipo === 'EPS') ?? entidades[0];
  const arl = entidades.find((entidad) => entidad.tipo === 'ARL') ?? entidades[1];

  const incapacidad = await upsertIncapacidad({
    codigo: 'INC-DEMO-9001',
    empleadoId: empleados[0].id,
    entidadId: eps.id,
    tipo: 'INCAPACIDAD_TEMPORAL',
    origen: 'COMUN',
    fechaInicio: new Date('2025-01-01T00:00:00.000Z'),
    fechaFin: new Date('2025-01-30T00:00:00.000Z'),
    dias: 30,
    fechaRecepcion: new Date('2024-12-30T00:00:00.000Z'),
    observaciones: 'Dato ficticio de demostración con dos radicaciones y cobro parcial',
    estado: 'COBRADA',
    registradaPorId: usuario.id
  });

  const radicacionRechazada = await upsertRadicacion({
    incapacidadId: incapacidad.id,
    entidadId: eps.id,
    fechaTranscripcion: new Date('2025-01-02T00:00:00.000Z'),
    numeroRadicado: 'RAD-DEMO-9001-A',
    fechaRadicacion: new Date('2025-01-03T00:00:00.000Z'),
    responsable: 'Gestión Humana Demo',
    observaciones: 'Radicación rechazada; conservada para demostrar trazabilidad'
  });

  await crearSiNoExiste(prisma.rechazo, {
    incapacidadId: incapacidad.id,
    causal: 'Rechazo ficticio de demostración'
  }, {
    incapacidadId: incapacidad.id,
    radicacionId: radicacionRechazada.id,
    causal: 'Rechazo ficticio de demostración',
    accionesCorrectivas: 'Se corrige soporte y se radica nuevamente',
    fechaRechazo: new Date('2025-01-10T00:00:00.000Z'),
    registradoPorId: usuario.id
  });

  const radicacionVigente = await upsertRadicacion({
    incapacidadId: incapacidad.id,
    entidadId: eps.id,
    fechaTranscripcion: new Date('2025-01-12T00:00:00.000Z'),
    numeroRadicado: 'RAD-DEMO-9001-B',
    fechaRadicacion: new Date('2025-01-13T00:00:00.000Z'),
    responsable: 'Gestión Humana Demo'
  });

  await crearSiNoExiste(prisma.historialEstado, {
    incapacidadId: incapacidad.id,
    estadoNuevo: 'REGISTRADA'
  }, {
    incapacidadId: incapacidad.id,
    estadoNuevo: 'REGISTRADA',
    usuarioId: usuario.id,
    observaciones: 'Carga de datos ficticios'
  });

  await crearSiNoExiste(prisma.historialEstado, {
    incapacidadId: incapacidad.id,
    estadoNuevo: 'TRANSCRITA'
  }, {
    incapacidadId: incapacidad.id,
    estadoAnterior: 'REGISTRADA',
    estadoNuevo: 'TRANSCRITA',
    usuarioId: usuario.id,
    observaciones: 'Radicado RAD-DEMO-9001-A'
  });

  await crearSiNoExiste(prisma.historialEstado, {
    incapacidadId: incapacidad.id,
    estadoNuevo: 'RECHAZADA'
  }, {
    incapacidadId: incapacidad.id,
    estadoAnterior: 'TRANSCRITA',
    estadoNuevo: 'RECHAZADA',
    usuarioId: usuario.id,
    observaciones: 'Rechazo ficticio de demostración'
  });

  await crearSiNoExiste(prisma.historialEstado, {
    incapacidadId: incapacidad.id,
    estadoNuevo: 'COBRADA',
    observaciones: 'Radicado RAD-DEMO-9001-B'
  }, {
    incapacidadId: incapacidad.id,
    estadoAnterior: 'TRANSCRITA',
    estadoNuevo: 'COBRADA',
    usuarioId: usuario.id,
    observaciones: 'Radicado RAD-DEMO-9001-B'
  });

  const cobroParcial = await prisma.cobro.upsert({
    where: { numeroSolicitud: 'COB-DEMO-9001-A' },
    update: {},
    create: {
      incapacidadId: incapacidad.id,
      radicacionId: radicacionRechazada.id,
      numeroSolicitud: 'COB-DEMO-9001-A',
      fechaSolicitud: new Date('2025-01-15T00:00:00.000Z'),
      valorReconocido: 500000,
      estado: 'GESTIONADO',
      responsableId: usuario.id,
      observaciones: 'Cobro vinculado a la primera radicación, no a la más reciente'
    }
  });

  const cobroSaldado = await prisma.cobro.upsert({
    where: { numeroSolicitud: 'COB-DEMO-9001-B' },
    update: {},
    create: {
      incapacidadId: incapacidad.id,
      radicacionId: radicacionVigente.id,
      numeroSolicitud: 'COB-DEMO-9001-B',
      fechaSolicitud: new Date('2025-01-20T00:00:00.000Z'),
      valorReconocido: 250000,
      estado: 'COBRADO',
      responsableId: usuario.id
    }
  });

  const pagoParcial = await crearSiNoExiste(prisma.pago, {
    referencia: 'REF-DEMO-9001-1'
  }, {
    cobroId: cobroParcial.id,
    entidadId: eps.id,
    fechaPago: new Date('2025-02-05T00:00:00.000Z'),
    valorPagado: 300000,
    referencia: 'REF-DEMO-9001-1',
    registradoPorId: usuario.id
  });

  const pagoTotal = await crearSiNoExiste(prisma.pago, {
    referencia: 'REF-DEMO-9001-2'
  }, {
    cobroId: cobroSaldado.id,
    entidadId: eps.id,
    fechaPago: new Date('2025-02-10T00:00:00.000Z'),
    valorPagado: 250000,
    referencia: 'REF-DEMO-9001-2',
    registradoPorId: usuario.id
  });

  const conciliacion = await prisma.conciliacion.upsert({
    where: { periodo: '2025-02' },
    update: {},
    create: {
      periodo: '2025-02',
      fechaInicio: new Date('2025-02-01T00:00:00.000Z'),
      fechaFin: new Date('2025-02-28T00:00:00.000Z'),
      estado: 'VALIDADA',
      consolidadaPorId: usuario.id,
      validadaPorId: usuario.id,
      fechaValidacion: new Date('2025-03-01T00:00:00.000Z'),
      observaciones: 'Conciliación ficticia con una diferencia controlada'
    }
  });

  await prisma.detalleConciliacion.upsert({
    where: {
      conciliacionId_pagoId: { conciliacionId: conciliacion.id, pagoId: pagoParcial.id }
    },
    update: {},
    create: {
      conciliacionId: conciliacion.id,
      pagoId: pagoParcial.id,
      valorConciliado: 300000,
      diferencia: 0
    }
  });

  await prisma.detalleConciliacion.upsert({
    where: {
      conciliacionId_pagoId: { conciliacionId: conciliacion.id, pagoId: pagoTotal.id }
    },
    update: {},
    create: {
      conciliacionId: conciliacion.id,
      pagoId: pagoTotal.id,
      valorConciliado: 249950,
      diferencia: 50,
      observaciones: 'Diferencia ficticia de cincuenta pesos'
    }
  });

  const incapacidadLaboral = await upsertIncapacidad({
    codigo: 'INC-DEMO-9002',
    empleadoId: empleados[1].id,
    entidadId: arl.id,
    tipo: 'INCAPACIDAD_TEMPORAL',
    origen: 'LABORAL',
    fechaInicio: new Date('2025-02-01T00:00:00.000Z'),
    fechaFin: new Date('2025-04-30T00:00:00.000Z'),
    dias: 89,
    fechaRecepcion: new Date('2025-01-31T00:00:00.000Z'),
    observaciones: 'Dato ficticio para alertas de incapacidad prolongada',
    estado: 'RECHAZADA',
    registradaPorId: usuario.id
  });

  const radicacionLaboral = await upsertRadicacion({
    incapacidadId: incapacidadLaboral.id,
    entidadId: arl.id,
    fechaTranscripcion: new Date('2025-02-03T00:00:00.000Z'),
    numeroRadicado: 'RAD-DEMO-9002-A',
    responsable: 'Gestión Humana Demo'
  });

  await crearSiNoExiste(prisma.rechazo, {
    incapacidadId: incapacidadLaboral.id,
    causal: 'Rechazo ficticio de ARL'
  }, {
    incapacidadId: incapacidadLaboral.id,
    radicacionId: radicacionLaboral.id,
    causal: 'Rechazo ficticio de ARL',
    fechaRechazo: new Date('2025-03-01T00:00:00.000Z'),
    registradoPorId: usuario.id
  });

  const umbrales = [
    ['DIAS_90', 90],
    ['DIAS_120', 120],
    ['DIAS_150', 150],
    ['DIAS_180', 180]
  ];

  for (const [umbral] of umbrales) {
    await prisma.alerta.upsert({
      where: {
        incapacidadId_umbral: { incapacidadId: incapacidad.id, umbral }
      },
      update: {},
      create: {
        incapacidadId: incapacidad.id,
        umbral,
        fechaGenerada: new Date('2026-11-01T00:00:00.000Z')
      }
    });
  }

  console.log('Datos ficticios de etapa 4 cargados: radicaciones, cobros, pagos, conciliación y alertas.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
