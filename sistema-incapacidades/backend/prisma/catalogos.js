import { PERMISOS, PERMISOS_POR_ROL } from '../src/config/permissions.js';

export const DESCRIPCIONES_ROL = {
  ADMINISTRADOR: 'Administrador del sistema con acceso completo',
  GESTION_HUMANA: 'Gestión de incapacidades, empleados y conciliaciones',
  ADMINISTRACION_PERSONAL: 'Registro y seguimiento de empleados e incapacidades',
  TESORERIA: 'Gestión de cobros, pagos y validación de conciliaciones',
  CONTABILIDAD: 'Revisión contable y validación de conciliaciones',
  CONSULTA: 'Consulta de información sin permisos de modificación'
};

/**
 * Asegura que existan los permisos, los roles y las relaciones rol/permiso.
 * Es aditivo: nunca elimina ni sobrescribe asignaciones que ya existan,
 * para no alterar la configuración hecha desde la interfaz.
 */
export async function asegurarCatalogos(tx) {
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
    const asignados = await tx.rolPermiso.findMany({
      where: { rolId: rol.id },
      select: { permisoId: true }
    });
    const idsAsignados = new Set(asignados.map((registro) => registro.permisoId));

    const faltantes = claves
      .map((clave) => permisosPorClave.get(clave))
      .filter((permisoId) => permisoId !== undefined && !idsAsignados.has(permisoId))
      .map((permisoId) => ({ rolId: rol.id, permisoId }));

    if (faltantes.length > 0) {
      await tx.rolPermiso.createMany({ data: faltantes, skipDuplicates: true });
    }
  }
}
