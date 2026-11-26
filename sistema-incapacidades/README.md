# Sistema de gestión de incapacidades

Proyecto académico Full Stack para registrar y seguir incapacidades médicas y licencias de maternidad/paternidad: recepción, transcripción, radicación, cobro, pago, conciliación y reportes.

## Estado actual

**Etapas 1 a 6 completadas.**

- Etapa 1: base de datos PostgreSQL, Prisma, autenticación JWT y RBAC.
- Etapa 2: usuarios, roles, permisos, empleados y entidades EPS/ARL.
- Etapa 3: incapacidades, radicaciones, rechazos, documentos e historial de estados.
- Etapa 4: cobros vinculados a radicación, pagos parciales, conciliaciones, alertas, reportes CSV, dashboard y auditoría.
- Etapa 5: frontend React/Vite con autenticación, guards por permiso, dashboard con Recharts y pantallas para todos los módulos.
- Etapa 6: pruebas `node:test` + `fetch`, endurecimiento de seguridad, documentación y verificación final.

El sistema funciona de extremo a extremo con datos registrados manualmente y el frontend se comunica con la API mediante cookies `httpOnly`. No se crean usuarios, empleados ni registros operativos de forma automática al iniciar, migrar o sembrar la base de datos.

## Requisitos previos

- Node.js 18 o superior (se probó con Node 24).
- npm 11 o superior.
- Docker Engine y Docker Compose.
- Git.
- Postman (opcional, para probar la API).

## Estructura de carpetas

```text
sistema-incapacidades/
  frontend/
    src/
      api/           # cliente Axios y manejo de errores
      components/    # layout y componentes comunes
      context/       # autenticación y notificaciones
      guards/        # sesión y permisos
      pages/         # dashboard y pantallas por módulo
      services/      # servicios REST por dominio
      utils/         # formato, constantes y query params
    index.html
    vite.config.js
    package.json
  backend/
    prisma/
      schema.prisma
      migrations/
      seed.js             # solo catálogos base (roles y permisos)
      catalogos.js        # siembra aditiva de catálogos
      crear-admin.js      # bootstrap del primer administrador
      desactivar-usuarios.js
      seed-datos-prueba.js # deshabilitado salvo autorización explícita
    src/
      config/
      modules/
        auth/ roles/ usuarios/ empleados/ entidades/
        incapacidades/ radicaciones/ documentos/ historial/
        cobros/ pagos/ conciliaciones/ alertas/
        reportes/ dashboard/ auditoria/ health/
      middlewares/
      utils/
    tests/
      utils.test.js
      api.integration.test.js
    storage/
      documentos/
    .env.example
    package.json
  database/
    compose.yaml
    .env.example
  README.md
  .gitignore
```

## Modelo entidad-relación

```mermaid
erDiagram
    ROL ||--o{ USUARIO : tiene
    ROL ||--o{ ROL_PERMISO : posee
    PERMISO ||--o{ ROL_PERMISO : asignado_a

    EMPLEADO ||--o{ INCAPACIDAD : tiene
    ENTIDAD_SALUD ||--o{ INCAPACIDAD : responsable
    USUARIO ||--o{ INCAPACIDAD : registra
    INCAPACIDAD ||--o{ DOCUMENTO : adjunta
    INCAPACIDAD ||--o{ RADICACION : tramita
    INCAPACIDAD ||--o{ HISTORIAL_ESTADO : registra
    INCAPACIDAD ||--o{ RECHAZO : sufre
    INCAPACIDAD ||--o{ COBRO : genera
    INCAPACIDAD ||--o{ ALERTA : produce

    RADICACION ||--o{ COBRO : vincula
    RADICACION ||--o{ RECHAZO : motiva
    RECHAZO ||--o{ DOCUMENTO : soporta
    COBRO ||--o{ GESTION_COBRO : seguimiento_semanal
    COBRO ||--o{ PAGO : recibe
    PAGO ||--o| DOCUMENTO : soporte
    CONCILIACION ||--o{ DETALLE_CONCILIACION : contiene
    PAGO ||--o{ DETALLE_CONCILIACION : conciliado_en
    USUARIO ||--o{ BITACORA_AUDITORIA : ejecuta
```

Relaciones principales:

- Un `Rol` tiene muchos `Usuario` y muchos `Permiso` a través de `RolPermiso`.
- Un `Empleado` tiene muchas `Incapacidad`; una `Incapacidad` pertenece a una EPS o ARL.
- Cada `Incapacidad` acumula documentos, radicaciones, rechazos, cobros, alertas e historial de estados; el historial nunca se sobrescribe.
- Un `Cobro` pertenece a una `Incapacidad` y se vincula explícitamente a una sola `Radicacion` mediante `radicacion_id` (obligatoria, `ON DELETE RESTRICT`). No se asume automáticamente la radicación más reciente.
- Un `Cobro` puede tener varias gestiones de seguimiento y varios pagos parciales. El saldo se calcula como `valorReconocido - suma(pagos)`.
- Una `Conciliacion` agrupa pagos mediante `DetalleConciliacion`, con unicidad por conciliación y pago.
- `Alerta` tiene unicidad por `(incapacidad, umbral)` para no duplicar avisos de 90/120/150/180 días, calculados desde `fechaInicio`.
- `BitacoraAuditoria` registra operaciones importantes con usuario, entidad afectada y datos en JSON.

Decisiones acordadas:

- Estado inicial: `REGISTRADA`.
- Flujo: `REGISTRADA → TRANSCRITA → COBRADA → PAGADA`.
- Un rechazo permite corregir y generar una nueva transcripción; el historial conserva todos los cambios.
- La transición a `TRANSCRITA` solo se produce al crear una radicación; `COBRADA` se alcanza al crear un cobro y `PAGADA` cuando el saldo del cobro queda en cero.
- Todo cobro exige una radicación existente y perteneciente a la misma incapacidad. La UI permite elegir explícitamente entre las radicaciones de la incapacidad; no se selecciona automáticamente la más reciente.
- Los pagos son parciales o totales; se rechaza un pago mayor al saldo pendiente y se impide duplicar el mismo soporte de pago.
- Las conciliaciones se muestran como `Pendiente de revisión` (`EN_REVISION`), `Conciliada` (`VALIDADA` sin diferencias) o `Con diferencias` (`VALIDADA` con diferencias).
- Las alertas se calculan por días transcurridos desde `fechaInicio` de cada incapacidad: 90, 120, 150 y 180 días; no se acumulan días entre empleados.
- Autenticación implementada: JWT en cookie `httpOnly` con contraseñas `bcrypt`.
- Arranque sin datos de demostración: `npm run seed` solo asegura catálogos (roles y permisos) de forma aditiva; `npm run crear:admin` crea el primer administrador con contraseña aleatoria y `npm run desactivar:usuarios` retira credenciales de cuentas específicas sin borrarlas. `npm run seed:demo` está deshabilitado y solo se habilita con `PERMITIR_DATOS_DEMO=1` en un entorno aislado.
- Documentos privados: PDF/JPG/PNG hasta `MAX_FILE_SIZE_MB`, guardados con nombre UUID en `backend/storage/documentos`, validados por firma real del archivo y servidos solo por endpoints autorizados.
- Reportes en CSV compatible con Excel (BOM UTF-8), también disponibles en JSON.

## Configuración

### 1. Variables de entorno

Desde `sistema-incapacidades/`:

```powershell
Copy-Item database\.env.example database\.env
Copy-Item backend\.env.example backend\.env
```

Edita ambos archivos. Los valores incluidos en los ejemplos son solo marcadores de posición; no uses esos secretos en entornos reales.

`database/.env`:

```env
POSTGRES_DB=incapacidades
POSTGRES_USER=incapacidades_user
POSTGRES_PASSWORD=reemplazar_contrasena_de_desarrollo
POSTGRES_PORT=5432
```

`backend/.env`: la URL debe usar el mismo usuario y contraseña:

```env
DATABASE_URL="postgresql://incapacidades_user:reemplazar_contrasena_de_desarrollo@localhost:5432/incapacidades?schema=public"
JWT_SECRET=un_valor_aleatorio_largo_y_unico
JWT_EXPIRES_IN=8h
JWT_COOKIE_NAME=incapacidades_token
DOCUMENT_STORAGE_PATH=storage/documentos
MAX_FILE_SIZE_MB=10
```

Si la contraseña contiene caracteres especiales, codifícalos en la URL (por ejemplo `@` como `%40`).

### 2. Iniciar PostgreSQL

```powershell
docker compose --env-file database\.env -f database\compose.yaml up -d
```

Verificar:

```powershell
docker compose --env-file database\.env -f database\compose.yaml ps
```

El contenedor usa `postgres:16-alpine`, expone el puerto `5432` y guarda los datos en el volumen persistente `postgres_data`.

Para detenerlo sin borrar datos:

```powershell
docker compose --env-file database\.env -f database\compose.yaml down
```

### 3. Instalar dependencias del backend

```powershell
cd backend
npm install
```

### 4. Validar y aplicar el esquema

```powershell
npx prisma validate
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` crea la base de datos y aplica las tres migraciones versionadas sin ejecutar seeds. Para desarrollo con cambios de esquema usa `npx prisma migrate dev --name <cambio>`; ya no hay hook `prisma.seed`, por lo que tampoco en ese caso se generan datos automáticamente. En una copia ya migrada usa `npx prisma migrate status` para confirmar que no hay cambios pendientes.

### 5. Cargar solo los catálogos base

```powershell
npm run seed
```

El seed es aditivo e idempotente: asegura 6 roles, 34 permisos y sus asignaciones sin eliminar ni sobrescribir lo que ya configures desde la interfaz. **No crea usuarios, empleados, entidades ni registros operativos.**

`npm run seed:demo` está deshabilitado: solo se ejecuta de forma explícita con `PERMITIR_DATOS_DEMO=1` y no debe usarse en la base de trabajo.

### 5b. Crear el primer administrador

```powershell
$env:ADMIN_NOMBRE = 'Administrador'
$env:ADMIN_CORREO = 'administrador@incapacidades.local'
npm run crear:admin
```

Si no defines `ADMIN_PASSWORD`, el script genera una contraseña aleatoria y la muestra **una sola vez**; guárdala y cámbiala desde Usuarios tras iniciar sesión. El script falla si el correo ya existe, por lo que nunca sobrescribe un usuario. Para retirar credenciales de cuentas específicas sin borrarlas:

```powershell
$env:CORREOS_A_DESACTIVAR = 'correo1@dominio,correo2@dominio'
$env:CONFIRMAR = '1'
npm run desactivar:usuarios
```

La desactivación pone `activo=false` y sustituye el hash de contraseña por uno aleatorio; conserva todas las relaciones, el historial y la auditoría.

### 6. Iniciar el backend

```powershell
npm run dev
```

Deberías ver:

```text
Backend escuchando en http://localhost:4000
```

### 7. Instalar y ejecutar el frontend

En otra terminal, desde `sistema-incapacidades/`:

```powershell
cd frontend
npm install
npm run dev
```

Vite queda disponible en `http://localhost:5173` y redirige `/api` al backend en `http://localhost:4000` mediante `frontend/vite.config.js`. Para generar la versión de producción:

```powershell
npm run build
```

El resultado se escribe en `frontend/dist`.

## Verificación rápida

Abre `http://localhost:5173` e inicia sesión con el correo y la contraseña generados en el paso 5b. Si la base está vacía, el dashboard muestra «No hay información registrada» y los listados y reportes aparecen sin filas. Para comprobar solo la API, abre `http://localhost:4000/api/health` o ejecuta:

```powershell
curl http://localhost:4000/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "message": "Servicio disponible",
  "data": {
    "servicio": "backend",
    "baseDeDatos": "conectada",
    "latenciaMs": 1
  }
}
```

También puedes inspeccionar la base con:

```powershell
npx prisma studio
```

## Cómo empezar a registrar información propia

1. Inicia sesión con el administrador creado en el paso 5b.
2. En **Entidades EPS/ARL** registra las EPS y ARL que uses (botón *Nuevo* → NIT, nombre y tipo → *Guardar*).
3. En **Usuarios** crea una cuenta por persona, asigna uno de los seis roles existentes y entrega la contraseña por un canal seguro.
4. En **Roles y permisos** ajusta, si hace falta, los permisos de cada rol. No es necesario crear roles nuevos.
5. En **Empleados** registra cada persona (identificación, nombres, apellidos, cargo y área).
6. En **Incapacidades** registra cada caso usando el empleado y la entidad creados; el sistema genera el código y el historial inicial.
7. Sube los soportes en **Documentos**, transcribe en **Radicaciones** y continúa con **Cobros**, **Pagos** y **Conciliaciones**.
8. Consulta **Dashboard** y **Reportes**: solo muestran lo registrado; cuando no hay datos se indica explícitamente.

Todos los formularios validan los datos antes de guardar y ofrecen *Guardar*, *Editar*, *Limpiar* y *Cancelar*. Los selectores se llenan con los registros creados por ti, recorriendo la paginación de la API (máximo 100 por página).

**Cuentas de demostración:** las seis cuentas `@incapacidades.test` que existían en la base de trabajo fueron desactivadas y su contraseña compartida fue rotada; ya no pueden iniciar sesión, pero sus registros e historial se conservan. El frontend tampoco muestra credenciales de prueba.

## API de la Etapa 2

Todas las rutas, excepto `/api/auth/login` y `/api/health`, requieren la cookie `incapacidades_token`.

| Método | Ruta | Permiso requerido |
| --- | --- | --- |
| POST | `/api/auth/login` | público, máximo 10 intentos por 15 minutos |
| GET | `/api/auth/me` | autenticado |
| POST | `/api/auth/logout` | autenticado u opcional |
| GET | `/api/roles` | `ROLES_VER` |
| GET | `/api/roles/:id` | `ROLES_VER` |
| GET | `/api/permisos` | `PERMISOS_VER` |
| PATCH | `/api/roles/:id/permisos` | `PERMISOS_ASIGNAR` |
| GET | `/api/usuarios` | `USUARIOS_VER` |
| GET | `/api/usuarios/:id` | `USUARIOS_VER` |
| POST | `/api/usuarios` | `USUARIOS_CREAR` |
| PATCH | `/api/usuarios/:id` | `USUARIOS_EDITAR` |
| DELETE | `/api/usuarios/:id` | `USUARIOS_DESACTIVAR` |
| GET | `/api/empleados` | `EMPLEADOS_VER` |
| GET | `/api/empleados/:id` | `EMPLEADOS_VER` |
| GET | `/api/empleados/:id/incapacidades` | `EMPLEADOS_VER` o `INCAPACIDADES_VER` |
| POST | `/api/empleados` | `EMPLEADOS_CREAR` |
| PATCH | `/api/empleados/:id` | `EMPLEADOS_EDITAR` |
| PATCH | `/api/empleados/:id/estado` | `EMPLEADOS_DESACTIVAR` |
| GET | `/api/entidades` | `ENTIDADES_VER` |
| GET | `/api/entidades/:id` | `ENTIDADES_VER` |
| POST | `/api/entidades` | `ENTIDADES_CREAR` |
| PATCH | `/api/entidades/:id` | `ENTIDADES_EDITAR` |
| PATCH | `/api/entidades/:id/estado` | `ENTIDADES_DESACTIVAR` |

Ejemplo de login:

```powershell
$body = @{ correo = 'administrador@incapacidades.local'; password = 'LA_CONTRASEÑA_GENERADA' } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri 'http://localhost:4000/api/auth/login' -ContentType 'application/json' -Body $body -UseBasicParsing
```

En Postman habilita el manejo de cookies; la respuesta de login establece una cookie `httpOnly` que debes enviar en las siguientes peticiones.

## API de la Etapa 3

Todas las rutas requieren autenticación y el permiso indicado.

| Método | Ruta | Permiso requerido |
| --- | --- | --- |
| GET | `/api/incapacidades` | `INCAPACIDADES_VER` |
| POST | `/api/incapacidades` | `INCAPACIDADES_CREAR` |
| GET | `/api/incapacidades/:id` | `INCAPACIDADES_VER` |
| PATCH | `/api/incapacidades/:id` | `INCAPACIDADES_EDITAR` |
| PATCH | `/api/incapacidades/:id/estado` | `INCAPACIDADES_EDITAR` |
| GET | `/api/incapacidades/:id/historial` | `HISTORIAL_VER` |
| GET | `/api/incapacidades/:id/rechazos` | `INCAPACIDADES_VER` |
| POST | `/api/incapacidades/:id/rechazos` | `INCAPACIDADES_EDITAR` |
| PATCH | `/api/incapacidades/rechazos/:id` | `INCAPACIDADES_EDITAR` |
| GET | `/api/radicaciones` | `RADICACIONES_VER` |
| GET | `/api/radicaciones/:id` | `RADICACIONES_VER` |
| POST | `/api/radicaciones/incapacidad/:incapacidadId` | `RADICACIONES_CREAR` |
| GET | `/api/historial` | `HISTORIAL_VER` |
| GET | `/api/documentos` | `DOCUMENTOS_VER` |
| GET | `/api/documentos/:id` | `DOCUMENTOS_VER` |
| POST | `/api/documentos/incapacidad/:incapacidadId` | `DOCUMENTOS_SUBIR` |
| GET | `/api/documentos/:id/descargar` | `DOCUMENTOS_DESCARGAR` |

Ejemplo de alta:

```json
{
  "empleadoId": 1,
  "entidadId": 1,
  "tipo": "INCAPACIDAD_TEMPORAL",
  "origen": "COMUN",
  "fechaInicio": "2026-01-05",
  "fechaFin": "2026-01-12",
  "fechaRecepcion": "2026-01-04",
  "observaciones": "Certificado recibido"
}
```

El backend genera el código `INC-YYYY-####`, calcula `dias` de forma inclusiva, deja el estado en `REGISTRADA` y crea el primer registro del historial.

Ejemplo de radicación:

```json
{
  "fechaTranscripcion": "2026-01-06",
  "numeroRadicado": "RAD-2026-0001",
  "responsable": "Gestión Humana"
}
```

La carga de documentos usa `multipart/form-data` con el campo `archivo` y el campo `tipo`, uno de `CERTIFICADO`, `SOPORTE`, `RADICACION`, `CORRECCION`, `SOPORTE_PAGO` u `OTRO`. El campo `rechazoId` es opcional. La respuesta no expone la ruta física; para obtener el archivo usa `GET /api/documentos/:id/descargar`.

Transiciones válidas: `REGISTRADA → TRANSCRITA → COBRADA → PAGADA` y `TRANSCRITA|COBRADA → RECHAZADA → TRANSCRITA`. Cualquier otro cambio responde `400`.

## API de la Etapa 4

Todas las rutas requieren autenticación y el permiso indicado. Los listados devuelven `{ datos, total, pagina, limite, totalPaginas }` dentro de `data`.

### Cobros y pagos

| Método | Ruta | Permiso requerido |
| --- | --- | --- |
| GET | `/api/cobros/incapacidad/:incapacidadId/radicaciones` | `COBROS_VER` |
| GET | `/api/cobros/pendientes` | `COBROS_VER` |
| GET | `/api/cobros` | `COBROS_VER` |
| POST | `/api/cobros` | `COBROS_CREAR` |
| GET | `/api/cobros/:id/gestiones` | `COBROS_VER` |
| POST | `/api/cobros/:id/gestiones` | `COBROS_CREAR` |
| GET | `/api/cobros/:id` | `COBROS_VER` |
| PATCH | `/api/cobros/:id` | `COBROS_CREAR` |
| GET | `/api/pagos/pendientes` | `PAGOS_VER` |
| GET | `/api/pagos` | `PAGOS_VER` |
| POST | `/api/pagos` | `PAGOS_CREAR` |
| PATCH | `/api/pagos/:id/soporte` | `PAGOS_CREAR` |
| GET | `/api/pagos/:id` | `PAGOS_VER` |

Ejemplo de cobro; `radicacionId` es obligatorio y debe pertenecer a `incapacidadId`:

```json
{
  "incapacidadId": 8,
  "radicacionId": 12,
  "fechaSolicitud": "2026-01-15",
  "valorReconocido": 500000,
  "observaciones": "Cobro vinculado a la radicación revisada"
}
```

Ejemplo de pago parcial:

```json
{
  "cobroId": 4,
  "fechaPago": "2026-02-10",
  "valor": 300000,
  "metodoPago": "TRANSFERENCIA",
  "referencia": "TR-2026-001",
  "observaciones": "Abono inicial"
}
```

Si el valor supera el saldo, la respuesta es `400`. Si el soporte ya está registrado en otro pago, la respuesta es `409`. Cuando el saldo llega a cero, la incapacidad pasa a `PAGADA`.

### Conciliaciones, alertas, reportes, dashboard y auditoría

| Método | Ruta | Permiso requerido |
| --- | --- | --- |
| GET | `/api/conciliaciones` | `CONCILIACIONES_VER` |
| POST | `/api/conciliaciones` | `CONCILIACIONES_CONSOLIDAR` |
| GET | `/api/conciliaciones/:id/historial` | `CONCILIACIONES_VER` |
| POST | `/api/conciliaciones/:id/detalles` | `CONCILIACIONES_CONSOLIDAR` |
| DELETE | `/api/conciliaciones/:id/detalles/:pagoId` | `CONCILIACIONES_CONSOLIDAR` |
| PATCH | `/api/conciliaciones/:id/validar` | `CONCILIACIONES_VALIDAR` |
| GET | `/api/conciliaciones/:id` | `CONCILIACIONES_VER` |
| GET | `/api/alertas/resumen` | `ALERTAS_VER` |
| GET | `/api/alertas` | `ALERTAS_VER` |
| POST | `/api/alertas/generar` | `ALERTAS_VER` |
| PATCH | `/api/alertas/leidas` | `ALERTAS_VER` |
| PATCH | `/api/alertas/:id/leida` | `ALERTAS_VER` |
| GET | `/api/reportes/tipos` | `REPORTES_VER` |
| GET | `/api/reportes/:tipo?formato=csv\|json` | `REPORTES_VER` |
| GET | `/api/dashboard/resumen` | `INCAPACIDADES_VER` |
| GET | `/api/dashboard/graficas` | `INCAPACIDADES_VER` |
| GET | `/api/dashboard/ultimos-registros` | `INCAPACIDADES_VER` |
| GET | `/api/auditoria` | `AUDITORIA_VER` |

Tipos de reporte disponibles: `incapacidades`, `cobros-pendientes`, `pagos-realizados`, `pagos-pendientes`, `rechazadas`, `prolongadas` y `conciliaciones`. El formato `csv` agrega BOM UTF-8 para Excel y cabeceras `Content-Disposition: attachment`.

La generación de alertas es idempotente: repetir `POST /api/alertas/generar` no duplica avisos para la misma incapacidad y umbral.

## Frontend de la Etapa 5

Tecnologías: React 19, Vite 7, React Router 7, Axios, Bootstrap 5 y Recharts. No se usa TypeScript.

- `src/api/client.js`: base URL relativa `/api`, `withCredentials: true`, interceptor de errores y helper `mensajeError`.
- `src/context/AuthContext.jsx`: sesión en memoria, `/api/auth/me`, permisos y helper `tienePermiso`.
- `src/context/ToastContext.jsx`: notificaciones de éxito/error.
- `src/guards/RutaPrivada.jsx` y `src/guards/Permiso.jsx`: bloquean rutas y acciones según sesión/permiso.
- `src/components/common/ManagePage.jsx`: base reutilizable de listados con búsqueda, filtros, paginación, modales y acciones por permiso.
- `src/components/layout/Layout.jsx`, `Sidebar.jsx` y `Topbar.jsx`: navegación adaptable al rol.
- `src/pages`: dashboard con gráficas Recharts y pantallas de empleados, incapacidades, radicaciones, documentos, historial, cobros, pagos, conciliaciones, alertas, reportes, auditoría, usuarios, roles/permisos y 404.
- `src/utils`: formato de moneda/fechas, constantes y construcción de query params.

Rutas principales: `/login`, `/dashboard`, `/empleados`, `/entidades`, `/incapacidades`, `/radicaciones`, `/documentos`, `/historial`, `/cobros`, `/pagos`, `/conciliaciones`, `/alertas`, `/reportes`, `/auditoria`, `/usuarios`, `/roles-permisos` y `*`.

`src/utils/listados.js` recorre las páginas de la API para que los selectores muestren todos los registros, sin enviar `limite` valores superiores al máximo de 100.

El frontend no guarda tokens en `localStorage`/`sessionStorage`; usa la cookie `httpOnly` de la API. El proxy de Vite solo existe para desarrollo; en producción el servidor web debe publicar `frontend/dist` y redirigir `/api` al backend.

## Pruebas y seguridad de la Etapa 6

Ejecutar desde `backend/`:

```powershell
npm test
```

La suite usa `node:test` y `fetch`. Las credenciales ya no están escritas en el código: se configuran por entorno y las pruebas que escriben solo se habilitan de forma explícita en una base aislada.

```powershell
$env:API_URL = 'http://localhost:4001'
$env:API_ADMIN_CORREO = 'verificador@incapacidades.local'
$env:API_ADMIN_PASSWORD = 'contraseña_del_administrador_de_pruebas'
$env:API_CONSULTA_CORREO = 'consulta@verificacion.local'      # opcional, para RBAC
$env:API_CONSULTA_PASSWORD = 'contraseña_de_lectura'
$env:PRUEBAS_ESCRITURA = '1'                                 # solo en BD aislada
npm test
```

Cubre health, login, RBAC, validación Zod, listados paginados, reportes CSV con BOM, rechazo de archivos con firma falsificada, regla cobro-radicación, límite de pago por saldo, CRUD manual de entidades y utilidades de dinero/CSV. Las pruebas dependientes de datos se omiten con un mensaje cuando la base está vacía.

Resultado verificado en la base aislada: **17 pruebas, 14 aprobadas, 0 fallidas, 3 omitidas por base vacía**. Con datos operativos, las tres omitidas también pasan. No requiere http-server ni supertest.

Medidas de seguridad verificadas:

- Helmet, CORS restringido a `CORS_ORIGIN`, `x-powered-by` desactivado.
- Rate limit global de 1000 solicitudes por IP cada 15 minutos, más límite estricto de 10 intentos de login por 15 minutos.
- JWT en cookie `httpOnly`, `sameSite=lax`, `secure` en producción; bcryptjs con 12 rondas.
- RBAC con `requireAuth` y `requirePermission` en rutas sensibles; auditoría y reportes son permisos distintos.
- Zod valida params, query y body; errores 5xx no exponen stack al cliente.
- Documentos con MIME permitido, límite de tamaño, nombre UUID, validación de firma real PDF/JPG/PNG, prevención de path traversal y descarga autorizada.
- Prisma usa consultas parametrizadas; no hay SQL crudo construido con entrada del usuario.
- Sin secretos reales versionados: `.env` está ignorado, no hay contraseñas demo en el código ni en el frontend, y las cuentas de prueba quedaron desactivadas sin borrar su historial.

## Respuestas de la API

Todas las respuestas usan esta forma:

```json
{ "ok": true, "message": "Mensaje", "data": {} }
```

En caso de error:

```json
{ "ok": false, "message": "Mensaje de error", "details": {} }
```

## Notas técnicas

- Se fija Prisma `6.19.3` para mantener una configuración simple y compatible con JavaScript.
- Node y React se ejecutan en la máquina host; Docker se usa únicamente para PostgreSQL.
- Los documentos se guardan en `backend/storage/documentos`, fuera de `frontend/public`, y se descargan por un endpoint autorizado. Esa carpeta está ignorada por Git.
- Las migraciones se versionan en Git; los archivos `.env` no se versionan.
- `npm audit` en backend reporta 6 avisos (2 moderados y 4 altos) originados en dependencias de desarrollo: CLI de Prisma 6 y `nodemon`/`minimatch`. No están en las dependencias de ejecución de la API; Zod se actualizó a `4.6.7`. No se aplicó `npm audit fix --force` porque instalaría Prisma 7, cuyo generador principal produce archivos TypeScript y este proyecto debe permanecer en JavaScript. `npm install` en frontend terminó con 0 vulnerabilidades.
- La CLI de Prisma solo debe ejecutarse con el esquema local de confianza; no se procesan esquemas enviados por usuarios.
- Las contraseñas se cifran con `bcryptjs` (12 rondas) y nunca se devuelven en las respuestas.
- La cookie de sesión es `httpOnly` y `sameSite=lax`; en producción se envía con `secure`.
- Los datos de entrada se validan con Zod y las operaciones importantes se registran en `bitacora_auditoria` dentro de transacciones cuando afectan varias tablas.
