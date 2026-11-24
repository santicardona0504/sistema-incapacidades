import test, { before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.API_URL ?? 'http://localhost:4000';
const CLAVE = 'Demo1234!';

let cookieAdmin = '';
let cookieConsulta = '';

function extraerCookie(respuesta) {
  const valores = respuesta.headers.getSetCookie?.() ?? [];
  if (valores.length > 0) return valores.map((valor) => valor.split(';')[0]).join('; ');
  const cabecera = respuesta.headers.get('set-cookie');
  return cabecera ? cabecera.split(';')[0] : '';
}

async function peticion(ruta, { metodo = 'GET', cookie, cuerpo, cabeceras = {} } = {}) {
  const opciones = { method: metodo, headers: { ...cabeceras } };
  if (cookie) opciones.headers.Cookie = cookie;
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  return fetch(`${BASE_URL}${ruta}`, opciones);
}

async function json(respuesta) {
  return respuesta.json();
}

async function iniciarSesion(correo) {
  const respuesta = await peticion('/api/auth/login', {
    metodo: 'POST',
    cuerpo: { correo, password: CLAVE }
  });
  assert.equal(respuesta.status, 200, `No se pudo autenticar a ${correo}`);
  const datos = await json(respuesta);
  assert.equal(datos.ok, true);
  return extraerCookie(respuesta);
}

before(async () => {
  try {
    await peticion('/api/health');
  } catch {
    assert.fail(`El backend no está disponible en ${BASE_URL}. Inícialo antes de ejecutar npm test.`);
  }
  cookieAdmin = await iniciarSesion('admin@incapacidades.test');
  cookieConsulta = await iniciarSesion('consulta@incapacidades.test');
  assert.ok(cookieAdmin, 'La respuesta de login no devolvió cookie de sesión');
});

test('GET /api/health responde públicamente con la base conectada', async () => {
  const respuesta = await peticion('/api/health');
  const datos = await json(respuesta);
  assert.equal(respuesta.status, 200);
  assert.equal(datos.ok, true);
  assert.equal(datos.data.baseDeDatos, 'conectada');
});

test('POST /api/auth/login rechaza credenciales inválidas', async () => {
  const respuesta = await peticion('/api/auth/login', {
    metodo: 'POST',
    cuerpo: { correo: 'admin@incapacidades.test', password: 'Incorrecta123!' }
  });
  assert.equal(respuesta.status, 401);
  assert.equal((await json(respuesta)).ok, false);
});

test('Las rutas protegidas rechazan peticiones sin cookie', async () => {
  const respuesta = await peticion('/api/empleados');
  assert.equal(respuesta.status, 401);
  assert.equal((await json(respuesta)).ok, false);
});

test('GET /api/auth/me devuelve el perfil y los permisos del administrador', async () => {
  const respuesta = await peticion('/api/auth/me', { cookie: cookieAdmin });
  const datos = await json(respuesta);
  assert.equal(respuesta.status, 200);
  assert.equal(datos.data.usuario.correo, 'admin@incapacidades.test');
  assert.ok(datos.data.usuario.permisos.includes('AUDITORIA_VER'));
  assert.ok(datos.data.usuario.permisos.includes('COBROS_CREAR'));
});

test('El rol Consulta no puede crear empleados aunque envíe un cuerpo válido', async () => {
  const respuesta = await peticion('/api/empleados', {
    metodo: 'POST',
    cookie: cookieConsulta,
    cuerpo: {
      identificacion: 'CC-TEST-999',
      nombres: 'Sin',
      apellidos: 'Permiso',
      cargo: 'Prueba',
      area: 'QA'
    }
  });
  assert.equal(respuesta.status, 403);
});

test('Los esquemas Zod rechazan datos inconsistentes', async () => {
  const respuesta = await peticion('/api/incapacidades', {
    metodo: 'POST',
    cookie: cookieAdmin,
    cuerpo: {
      empleadoId: 1,
      entidadId: 1,
      tipo: 'INCAPACIDAD_TEMPORAL',
      origen: 'COMUN',
      fechaInicio: '2026-02-10',
      fechaFin: '2026-02-01',
      fechaRecepcion: '2026-02-09'
    }
  });
  assert.equal(respuesta.status, 400);
  assert.equal((await json(respuesta)).ok, false);
});

test('Los listados de las etapas 1 a 3 conservan la forma paginada', async () => {
  for (const [ruta, clave] of [
    ['/api/empleados', 'empleados'],
    ['/api/incapacidades', 'incapacidades'],
    ['/api/radicaciones', 'radicaciones'],
    ['/api/documentos', 'documentos'],
    ['/api/historial', 'historial']
  ]) {
    const respuesta = await peticion(ruta, { cookie: cookieAdmin });
    const datos = await json(respuesta);
    assert.equal(respuesta.status, 200, ruta);
    assert.ok(Array.isArray(datos.data[clave]), ruta);
    assert.equal(typeof datos.data.total, 'number', ruta);
    assert.equal(typeof datos.data.totalPaginas, 'number', ruta);
  }
});

test('Los módulos de la etapa 4 responden con datos reales', async () => {
  for (const [ruta, clave] of [
    ['/api/cobros', 'cobros'],
    ['/api/pagos', 'pagos'],
    ['/api/conciliaciones', 'conciliaciones'],
    ['/api/alertas', 'alertas'],
    ['/api/auditoria', 'eventos']
  ]) {
    const respuesta = await peticion(ruta, { cookie: cookieAdmin });
    const datos = await json(respuesta);
    assert.equal(respuesta.status, 200, ruta);
    assert.ok(Array.isArray(datos.data[clave]), ruta);
    assert.equal(typeof datos.data.total, 'number', ruta);
  }

  for (const ruta of ['/api/dashboard/resumen', '/api/dashboard/graficas', '/api/alertas/resumen']) {
    const respuesta = await peticion(ruta, { cookie: cookieAdmin });
    assert.equal(respuesta.status, 200, ruta);
    assert.ok((await json(respuesta)).data, ruta);
  }
});

test('La matriz de permisos separa auditoría de reportes', async () => {
  const auditoria = await peticion('/api/auditoria', { cookie: cookieConsulta });
  const reportes = await peticion('/api/reportes/tipos', { cookie: cookieConsulta });
  assert.equal(auditoria.status, 403);
  assert.equal(reportes.status, 200);
  assert.equal((await json(reportes)).data.length, 7);
});

test('GET /api/reportes/:tipo?formato=csv devuelve un CSV con BOM', async () => {
  const respuesta = await peticion('/api/reportes/incapacidades?formato=csv', { cookie: cookieAdmin });
  const buffer = Buffer.from(await respuesta.arrayBuffer());
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-type') ?? '', /text\/csv/);
  assert.match(respuesta.headers.get('content-disposition') ?? '', /attachment/);
  assert.deepEqual([...buffer.subarray(0, 3)], [0xEF, 0xBB, 0xBF]);
  assert.match(buffer.toString('utf8'), /Código/);
});

test('La carga de documentos rechaza archivos cuya firma no coincide con el MIME declarado', async (contexto) => {
  const lista = await peticion('/api/incapacidades?limite=1', { cookie: cookieAdmin });
  const incapacidades = (await json(lista)).data.incapacidades ?? [];
  if (incapacidades.length === 0) return contexto.skip('No hay incapacidades en los datos de prueba');

  const datos = new FormData();
  datos.append('tipo', 'SOPORTE');
  datos.append('archivo', new Blob(['contenido falso'], { type: 'image/png' }), 'falso.png');

  const respuesta = await fetch(`${BASE_URL}/api/documentos/incapacidad/${incapacidades[0].id}`, {
    method: 'POST',
    headers: { Cookie: cookieAdmin },
    body: datos
  });

  assert.equal(respuesta.status, 415);
  assert.equal((await json(respuesta)).ok, false);
});

test('Un cobro rechaza una radicación inexistente', async (contexto) => {
  const lista = await peticion('/api/incapacidades?estado=TRANSCRITA&limite=1', { cookie: cookieAdmin });
  const incapacidades = (await json(lista)).data.incapacidades ?? [];
  if (incapacidades.length === 0) return contexto.skip('No hay incapacidades transcritas en los datos de prueba');

  const respuesta = await peticion('/api/cobros', {
    metodo: 'POST',
    cookie: cookieAdmin,
    cuerpo: {
      incapacidadId: incapacidades[0].id,
      radicacionId: 999999999,
      numeroSolicitud: `SOL-INVALIDA-${Date.now()}`,
      fechaSolicitud: new Date().toISOString().slice(0, 10),
      valorReconocido: 1000
    }
  });
  assert.ok([400, 404].includes(respuesta.status));
});

test('Un pago no puede exceder el saldo pendiente del cobro', async (contexto) => {
  const lista = await peticion('/api/pagos/pendientes?limite=1', { cookie: cookieAdmin });
  const cobros = (await json(lista)).data.cobros ?? [];
  if (cobros.length === 0) return contexto.skip('No hay cobros pendientes en los datos de prueba');

  const cobro = cobros[0];
  const saldo = Number(cobro.saldoPendiente ?? cobro.valorReconocido);
  const respuesta = await peticion('/api/pagos', {
    metodo: 'POST',
    cookie: cookieAdmin,
    cuerpo: {
      cobroId: cobro.id,
      entidadId: cobro.entidad?.id,
      fechaPago: new Date().toISOString().slice(0, 10),
      valorPagado: saldo + 1
    }
  });
  assert.equal(respuesta.status, 400);
  assert.equal((await json(respuesta)).ok, false);
});
