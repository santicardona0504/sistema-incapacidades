function escapar(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor);
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function construirCsv(columnas, filas) {
  const encabezado = columnas.map((columna) => escapar(columna.titulo)).join(',');
  const cuerpo = filas.map((fila) => columnas.map((columna) => {
    const valor = typeof columna.obtener === 'function' ? columna.obtener(fila) : fila[columna.clave];
    return escapar(valor);
  }).join(',')).join('\r\n');
  return `\uFEFF${encabezado}\r\n${cuerpo}\r\n`;
}

export function enviarCsv(res, nombreArchivo, columnas, filas) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(construirCsv(columnas, filas));
}
