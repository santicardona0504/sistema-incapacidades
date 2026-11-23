-- CreateEnum
CREATE TYPE "RolNombre" AS ENUM ('ADMINISTRADOR', 'GESTION_HUMANA', 'ADMINISTRACION_PERSONAL', 'TESORERIA', 'CONTABILIDAD', 'CONSULTA');

-- CreateEnum
CREATE TYPE "OrigenIncapacidad" AS ENUM ('COMUN', 'LABORAL');

-- CreateEnum
CREATE TYPE "TipoEntidad" AS ENUM ('EPS', 'ARL');

-- CreateEnum
CREATE TYPE "TipoIncapacidad" AS ENUM ('INCAPACIDAD_TEMPORAL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD');

-- CreateEnum
CREATE TYPE "EstadoIncapacidad" AS ENUM ('REGISTRADA', 'TRANSCRITA', 'COBRADA', 'RECHAZADA', 'PAGADA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CERTIFICADO', 'SOPORTE', 'RADICACION', 'CORRECCION', 'SOPORTE_PAGO', 'OTRO');

-- CreateEnum
CREATE TYPE "UmbralAlerta" AS ENUM ('DIAS_90', 'DIAS_120', 'DIAS_150', 'DIAS_180');

-- CreateEnum
CREATE TYPE "EstadoCobro" AS ENUM ('PENDIENTE', 'GESTIONADO', 'COMPROMISO_PAGO', 'COBRADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoConciliacion" AS ENUM ('EN_CONSOLIDACION', 'EN_REVISION', 'VALIDADA');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" "RolNombre" NOT NULL,
    "descripcion" VARCHAR(255),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" SERIAL NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_permisos" (
    "rol_id" INTEGER NOT NULL,
    "permiso_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "correo" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" SERIAL NOT NULL,
    "identificacion" VARCHAR(30) NOT NULL,
    "nombres" VARCHAR(120) NOT NULL,
    "apellidos" VARCHAR(120) NOT NULL,
    "cargo" VARCHAR(120) NOT NULL,
    "area" VARCHAR(120) NOT NULL,
    "correo" VARCHAR(160),
    "telefono" VARCHAR(30),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entidades_salud" (
    "id" SERIAL NOT NULL,
    "nit" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(180) NOT NULL,
    "tipo" "TipoEntidad" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entidades_salud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incapacidades" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "tipo_incapacidad" "TipoIncapacidad" NOT NULL,
    "origen" "OrigenIncapacidad" NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "dias" SMALLINT NOT NULL,
    "fecha_recepcion" DATE NOT NULL,
    "observaciones" TEXT,
    "estado" "EstadoIncapacidad" NOT NULL DEFAULT 'REGISTRADA',
    "registrada_por_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incapacidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" SERIAL NOT NULL,
    "incapacidad_id" INTEGER NOT NULL,
    "rechazo_id" INTEGER,
    "subido_por_id" INTEGER NOT NULL,
    "nombre_original" VARCHAR(255) NOT NULL,
    "ruta_almacenamiento" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radicaciones" (
    "id" SERIAL NOT NULL,
    "incapacidad_id" INTEGER NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "fecha_transcripcion" DATE NOT NULL,
    "numero_radicado" VARCHAR(80) NOT NULL,
    "fecha_radicacion" DATE,
    "responsable" VARCHAR(160) NOT NULL,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados" (
    "id" SERIAL NOT NULL,
    "incapacidad_id" INTEGER NOT NULL,
    "estado_anterior" "EstadoIncapacidad",
    "estado_nuevo" "EstadoIncapacidad" NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "observaciones" TEXT,
    "fecha_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rechazos" (
    "id" SERIAL NOT NULL,
    "incapacidad_id" INTEGER NOT NULL,
    "radicacion_id" INTEGER,
    "causal" TEXT NOT NULL,
    "acciones_correctivas" TEXT,
    "fecha_rechazo" DATE NOT NULL,
    "registrado_por_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rechazos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobros" (
    "id" SERIAL NOT NULL,
    "incapacidad_id" INTEGER NOT NULL,
    "numero_solicitud" VARCHAR(60) NOT NULL,
    "fecha_solicitud" DATE NOT NULL,
    "valor_reconocido" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoCobro" NOT NULL DEFAULT 'PENDIENTE',
    "responsable_id" INTEGER,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gestiones_cobro" (
    "id" SERIAL NOT NULL,
    "cobro_id" INTEGER NOT NULL,
    "fecha_gestion" DATE NOT NULL,
    "compromiso_pago" DATE,
    "observaciones" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gestiones_cobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "cobro_id" INTEGER NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "fecha_pago" DATE NOT NULL,
    "valor_pagado" DECIMAL(14,2) NOT NULL,
    "referencia" VARCHAR(80),
    "soporte_documento_id" INTEGER,
    "registrado_por_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliaciones" (
    "id" SERIAL NOT NULL,
    "periodo" VARCHAR(20) NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" "EstadoConciliacion" NOT NULL DEFAULT 'EN_CONSOLIDACION',
    "consolidada_por_id" INTEGER NOT NULL,
    "validada_por_id" INTEGER,
    "fecha_validacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conciliaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_conciliacion" (
    "id" SERIAL NOT NULL,
    "conciliacion_id" INTEGER NOT NULL,
    "pago_id" INTEGER NOT NULL,
    "valor_conciliado" DECIMAL(14,2) NOT NULL,
    "diferencia" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detalles_conciliacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" SERIAL NOT NULL,
    "incapacidad_id" INTEGER NOT NULL,
    "umbral" "UmbralAlerta" NOT NULL,
    "fecha_generada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leida" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora_auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(80) NOT NULL,
    "entidad" VARCHAR(80) NOT NULL,
    "entidad_id" INTEGER,
    "detalles" JSONB,
    "direccion_ip" VARCHAR(45),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_clave_key" ON "permisos"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "usuarios_rol_id_idx" ON "usuarios"("rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_identificacion_key" ON "empleados"("identificacion");

-- CreateIndex
CREATE INDEX "empleados_activo_idx" ON "empleados"("activo");

-- CreateIndex
CREATE INDEX "empleados_nombres_apellidos_idx" ON "empleados"("nombres", "apellidos");

-- CreateIndex
CREATE UNIQUE INDEX "entidades_salud_nit_key" ON "entidades_salud"("nit");

-- CreateIndex
CREATE INDEX "entidades_salud_tipo_activa_idx" ON "entidades_salud"("tipo", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "incapacidades_codigo_key" ON "incapacidades"("codigo");

-- CreateIndex
CREATE INDEX "incapacidades_empleado_id_idx" ON "incapacidades"("empleado_id");

-- CreateIndex
CREATE INDEX "incapacidades_entidad_id_idx" ON "incapacidades"("entidad_id");

-- CreateIndex
CREATE INDEX "incapacidades_estado_idx" ON "incapacidades"("estado");

-- CreateIndex
CREATE INDEX "incapacidades_fecha_inicio_fecha_fin_idx" ON "incapacidades"("fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE INDEX "incapacidades_fecha_recepcion_idx" ON "incapacidades"("fecha_recepcion");

-- CreateIndex
CREATE INDEX "incapacidades_estado_fecha_recepcion_idx" ON "incapacidades"("estado", "fecha_recepcion");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_ruta_almacenamiento_key" ON "documentos"("ruta_almacenamiento");

-- CreateIndex
CREATE INDEX "documentos_incapacidad_id_idx" ON "documentos"("incapacidad_id");

-- CreateIndex
CREATE INDEX "documentos_rechazo_id_idx" ON "documentos"("rechazo_id");

-- CreateIndex
CREATE INDEX "documentos_tipo_idx" ON "documentos"("tipo");

-- CreateIndex
CREATE INDEX "radicaciones_incapacidad_id_idx" ON "radicaciones"("incapacidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "radicaciones_entidad_id_numero_radicado_key" ON "radicaciones"("entidad_id", "numero_radicado");

-- CreateIndex
CREATE INDEX "historial_estados_incapacidad_id_fecha_cambio_idx" ON "historial_estados"("incapacidad_id", "fecha_cambio");

-- CreateIndex
CREATE INDEX "historial_estados_usuario_id_idx" ON "historial_estados"("usuario_id");

-- CreateIndex
CREATE INDEX "rechazos_incapacidad_id_idx" ON "rechazos"("incapacidad_id");

-- CreateIndex
CREATE INDEX "rechazos_radicacion_id_idx" ON "rechazos"("radicacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "cobros_numero_solicitud_key" ON "cobros"("numero_solicitud");

-- CreateIndex
CREATE INDEX "cobros_incapacidad_id_idx" ON "cobros"("incapacidad_id");

-- CreateIndex
CREATE INDEX "cobros_estado_idx" ON "cobros"("estado");

-- CreateIndex
CREATE INDEX "gestiones_cobro_cobro_id_fecha_gestion_idx" ON "gestiones_cobro"("cobro_id", "fecha_gestion");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_soporte_documento_id_key" ON "pagos"("soporte_documento_id");

-- CreateIndex
CREATE INDEX "pagos_cobro_id_idx" ON "pagos"("cobro_id");

-- CreateIndex
CREATE INDEX "pagos_entidad_id_idx" ON "pagos"("entidad_id");

-- CreateIndex
CREATE INDEX "pagos_fecha_pago_idx" ON "pagos"("fecha_pago");

-- CreateIndex
CREATE UNIQUE INDEX "conciliaciones_periodo_key" ON "conciliaciones"("periodo");

-- CreateIndex
CREATE INDEX "conciliaciones_estado_idx" ON "conciliaciones"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "detalles_conciliacion_conciliacion_id_pago_id_key" ON "detalles_conciliacion"("conciliacion_id", "pago_id");

-- CreateIndex
CREATE INDEX "alertas_leida_idx" ON "alertas"("leida");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_incapacidad_id_umbral_key" ON "alertas"("incapacidad_id", "umbral");

-- CreateIndex
CREATE INDEX "bitacora_auditoria_entidad_entidad_id_idx" ON "bitacora_auditoria"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "bitacora_auditoria_usuario_id_idx" ON "bitacora_auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "bitacora_auditoria_creado_en_idx" ON "bitacora_auditoria"("creado_en");

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incapacidades" ADD CONSTRAINT "incapacidades_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incapacidades" ADD CONSTRAINT "incapacidades_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades_salud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incapacidades" ADD CONSTRAINT "incapacidades_registrada_por_id_fkey" FOREIGN KEY ("registrada_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_incapacidad_id_fkey" FOREIGN KEY ("incapacidad_id") REFERENCES "incapacidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_rechazo_id_fkey" FOREIGN KEY ("rechazo_id") REFERENCES "rechazos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radicaciones" ADD CONSTRAINT "radicaciones_incapacidad_id_fkey" FOREIGN KEY ("incapacidad_id") REFERENCES "incapacidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radicaciones" ADD CONSTRAINT "radicaciones_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades_salud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_incapacidad_id_fkey" FOREIGN KEY ("incapacidad_id") REFERENCES "incapacidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rechazos" ADD CONSTRAINT "rechazos_incapacidad_id_fkey" FOREIGN KEY ("incapacidad_id") REFERENCES "incapacidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rechazos" ADD CONSTRAINT "rechazos_radicacion_id_fkey" FOREIGN KEY ("radicacion_id") REFERENCES "radicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rechazos" ADD CONSTRAINT "rechazos_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_incapacidad_id_fkey" FOREIGN KEY ("incapacidad_id") REFERENCES "incapacidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gestiones_cobro" ADD CONSTRAINT "gestiones_cobro_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gestiones_cobro" ADD CONSTRAINT "gestiones_cobro_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cobro_id_fkey" FOREIGN KEY ("cobro_id") REFERENCES "cobros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades_salud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_soporte_documento_id_fkey" FOREIGN KEY ("soporte_documento_id") REFERENCES "documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliaciones" ADD CONSTRAINT "conciliaciones_consolidada_por_id_fkey" FOREIGN KEY ("consolidada_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliaciones" ADD CONSTRAINT "conciliaciones_validada_por_id_fkey" FOREIGN KEY ("validada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_conciliacion" ADD CONSTRAINT "detalles_conciliacion_conciliacion_id_fkey" FOREIGN KEY ("conciliacion_id") REFERENCES "conciliaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_conciliacion" ADD CONSTRAINT "detalles_conciliacion_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pagos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_incapacidad_id_fkey" FOREIGN KEY ("incapacidad_id") REFERENCES "incapacidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora_auditoria" ADD CONSTRAINT "bitacora_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
