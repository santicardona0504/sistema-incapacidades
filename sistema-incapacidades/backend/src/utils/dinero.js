export function aNumero(valor) {
  if (valor === null || valor === undefined) return 0;
  return Math.round(Number(valor) * 100) / 100;
}

export function enRangoValido(valor) {
  return aNumero(valor) > 0 && aNumero(valor) <= 999999999999.99;
}
