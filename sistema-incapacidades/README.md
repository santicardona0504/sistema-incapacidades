# Sistema de gestión de incapacidades

Proyecto académico Full Stack para registrar y seguir incapacidades médicas y licencias de maternidad/paternidad: recepción, transcripción, radicación, cobro, pago, conciliación y reportes.

## Estado actual

**Etapa 3 completada:** registro y seguimiento de incapacidades, transcripción y radicación, rechazos con correcciones, historial inmutable de estados, entidades EPS/ARL y documentos privados con descarga autorizada.

Las siguientes etapas agregarán cobros, pagos, conciliación, alertas, reportes CSV y el frontend React.

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
  backend/
    prisma/
      schema.prisma
      migrations/
      seed.js
    src/
      config/
      modules/
        auth/
        usuarios/
        roles/
        empleados/
        incapacidades/
        radicaciones/
        documentos/
        historial/
        entidades/
        auditoria/
        health/
      middlewares/
      utils/
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
- Un `Cobro` puede tener varias gestiones de seguimiento y varios pagos parciales.
- Una `Conciliacion` agrupa pagos mediante `DetalleConciliacion`.
- `Alerta` tiene unicidad por `(incapacidad, umbral)` para no duplicar avisos de 90/120/150/180 días.
- `BitacoraAuditoria` registra operaciones importantes con usuario, entidad afectada y datos en JSON.

Decisiones acordadas:

- Estado inicial: `REGISTRADA`.
- Flujo: `REGISTRADA → TRANSCRITA → COBRADA → PAGADA`.
- Un rechazo permite corregir y generar una nueva transcripción; el historial conserva todos los cambios.
- La transición a `TRANSCRITA` solo se produce al crear una radicación; `PAGADA` queda reservada para el módulo de pagos de una etapa posterior.
- Autenticación implementada: JWT en cookie `httpOnly` con contraseñas `bcrypt`.
- Seed de prueba ficticio implementado y ejecutable con `npm run seed`.
- Documentos privados: PDF/JPG/PNG hasta `MAX_FILE_SIZE_MB`, guardados en `backend/storage/documentos` y servidos solo por endpoints autorizados.
- Reportes en CSV compatible con Excel.

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
npx prisma format
npx prisma migrate dev --name init
npx prisma generate
```

`migrate dev` crea la base de datos, aplica `prisma/migrations/<timestamp>_init` y genera el cliente de Prisma.

### 5. Cargar datos ficticios de prueba

```powershell
npm run seed
```

El seed es idempotente: crea o actualiza 6 roles, 31 permisos, 6 usuarios, 3 entidades EPS/ARL y 6 empleados ficticios.

### 6. Iniciar el backend

```powershell
npm run dev
```

Deberías ver:

```text
Backend escuchando en http://localhost:4000
```

## Prueba rápida de la Etapa 1

Abre `http://localhost:4000/api/health` o ejecuta:

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

## Usuarios de prueba

Todos son ficticios y usan el dominio reservado `.test`. Contraseña para los seis: `Demo1234!`.

| Correo | Rol |
| --- | --- |
| `admin@incapacidades.test` | Administrador |
| `gestion.humana@incapacidades.test` | Gestión Humana |
| `personal@incapacidades.test` | Administración de Personal |
| `tesoreria@incapacidades.test` | Tesorería |
| `contabilidad@incapacidades.test` | Contabilidad |
| `consulta@incapacidades.test` | Consulta |

También hay 6 empleados ficticios con identificaciones `1000000001` a `1000000006` y 3 entidades: EPS Demo Salud Integral, ARL Demo Riesgos Seguros y EPS Demo Vida Saludable.

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

Ejemplo de login:

```powershell
$body = @{ correo = 'admin@incapacidades.test'; password = 'Demo1234!' } | ConvertTo-Json
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
| GET | `/api/entidades` | `ENTIDADES_VER` |
| GET | `/api/entidades/:id` | `ENTIDADES_VER` |

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
- `npm audit` reporta 6 avisos (2 moderados y 4 altos) originados en dependencias de desarrollo: CLI de Prisma 6 y `nodemon`/`minimatch`. No están en las dependencias de ejecución de la API; Zod se actualizó a `4.6.7`. No se aplicó `npm audit fix --force` porque instalaría Prisma 7, cuyo generador principal produce archivos TypeScript y este proyecto debe permanecer en JavaScript.
- La CLI de Prisma solo debe ejecutarse con el esquema local de confianza; no se procesan esquemas enviados por usuarios.
- Las contraseñas se cifran con `bcryptjs` (12 rondas) y nunca se devuelven en las respuestas.
- La cookie de sesión es `httpOnly` y `sameSite=lax`; en producción se envía con `secure`.
- Los datos de entrada se validan con Zod y las operaciones importantes se registran en `bitacora_auditoria` dentro de transacciones cuando afectan varias tablas.
