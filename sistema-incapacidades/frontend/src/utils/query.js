export function buildQuery(filtros = {}) {
  const parametros = new URLSearchParams();

  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return;
    parametros.append(clave, String(valor));
  });

  const consulta = parametros.toString();
  return consulta ? `?${consulta}` : '';
}
