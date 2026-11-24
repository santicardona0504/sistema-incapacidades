export const ESTADOS_INCAPACIDAD = [
  'REGISTRADA', 'TRANSCRITA', 'COBRADA', 'RECHAZADA', 'PAGADA'
];

export const ORIGENES = ['COMUN', 'LABORAL'];

export const TIPOS_INCAPACIDAD = [
  'INCAPACIDAD_TEMPORAL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD'
];

export const ESTADOS_COBRO = [
  'PENDIENTE', 'GESTIONADO', 'COMPROMISO_PAGO', 'COBRADO', 'RECHAZADO'
];

export const UMBRALES = ['DIAS_90', 'DIAS_120', 'DIAS_150', 'DIAS_180'];

export const ROLES = [
  'ADMINISTRADOR', 'GESTION_HUMANA', 'ADMINISTRACION_PERSONAL',
  'TESORERIA', 'CONTABILIDAD', 'CONSULTA'
];

const ETIQUETAS = {
  REGISTRADA: 'Registrada',
  TRANSCRITA: 'Transcrita',
  COBRADA: 'Cobrada',
  RECHAZADA: 'Rechazada',
  PAGADA: 'Pagada',
  PENDIENTE: 'Pendiente',
  GESTIONADO: 'Gestionado',
  COMPROMISO_PAGO: 'Compromiso de pago',
  COBRADO: 'Cobrado',
  EN_CONSOLIDACION: 'En consolidación',
  EN_REVISION: 'Pendiente de revisión',
  VALIDADA: 'Validada',
  DIAS_90: '90 días',
  DIAS_120: '120 días',
  DIAS_150: '150 días',
  DIAS_180: '180 días',
  INCAPACIDAD_TEMPORAL: 'Incapacidad temporal',
  LICENCIA_MATERNIDAD: 'Licencia de maternidad',
  LICENCIA_PATERNIDAD: 'Licencia de paternidad',
  COMUN: 'Común',
  LABORAL: 'Laboral',
  EPS: 'EPS',
  ARL: 'ARL',
  ADMINISTRADOR: 'Administrador',
  GESTION_HUMANA: 'Gestión Humana',
  ADMINISTRACION_PERSONAL: 'Administración de Personal',
  TESORERIA: 'Tesorería',
  CONTABILIDAD: 'Contabilidad',
  CONSULTA: 'Consulta'
};

export function etiqueta(valor) {
  if (!valor) return '—';
  return ETIQUETAS[valor] ?? String(valor).replaceAll('_', ' ').toLowerCase()
    .replace(/^./, (letra) => letra.toUpperCase());
}

export function claseEstado(valor) {
  const mapa = {
    REGISTRADA: 'bg-secondary',
    TRANSCRITA: 'bg-info text-dark',
    COBRADA: 'bg-primary',
    RECHAZADA: 'bg-danger',
    PAGADA: 'bg-success',
    PENDIENTE: 'bg-warning text-dark',
    GESTIONADO: 'bg-info text-dark',
    COMPROMISO_PAGO: 'bg-primary',
    COBRADO: 'bg-success',
    EN_CONSOLIDACION: 'bg-secondary',
    EN_REVISION: 'bg-warning text-dark',
    VALIDADA: 'bg-success',
    ACTIVO: 'bg-success',
    INACTIVO: 'bg-secondary'
  };
  return mapa[valor] ?? 'bg-light text-dark border';
}
