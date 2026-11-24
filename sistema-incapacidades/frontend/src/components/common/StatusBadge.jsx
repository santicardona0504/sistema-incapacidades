import { claseEstado, etiqueta } from '../../utils/constantes.js';

export function StatusBadge({ valor, texto }) {
  return <span className={`badge rounded-pill ${claseEstado(valor)}`}>{texto ?? etiqueta(valor)}</span>;
}
