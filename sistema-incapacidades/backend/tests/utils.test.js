import test from 'node:test';
import assert from 'node:assert/strict';
import { aNumero, enRangoValido } from '../src/utils/dinero.js';
import { construirCsv } from '../src/utils/csv.js';

test('aNumero redondea a dos decimales y trata vacíos como cero', () => {
  assert.equal(aNumero(1234.567), 1234.57);
  assert.equal(aNumero('45.5'), 45.5);
  assert.equal(aNumero(null), 0);
  assert.equal(aNumero(undefined), 0);
});

test('enRangoValido acepta montos positivos y rechaza cero o excesos', () => {
  assert.equal(enRangoValido(1), true);
  assert.equal(enRangoValido(999999999999.99), true);
  assert.equal(enRangoValido(0), false);
  assert.equal(enRangoValido(-5), false);
  assert.equal(enRangoValido(1000000000000), false);
});

test('construirCsv agrega BOM, escapa comillas y respeta columnas', () => {
  const csv = construirCsv(
    [{ titulo: 'Código', clave: 'codigo' }, { titulo: 'Observación', clave: 'nota' }],
    [{ codigo: 'A-1', nota: 'Dice "hola", correcto' }]
  );

  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /Código,Observación/);
  assert.match(csv, /"Dice ""hola"", correcto"/);
  assert.ok(csv.endsWith('\r\n'));
});
