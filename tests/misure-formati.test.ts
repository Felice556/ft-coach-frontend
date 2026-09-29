import { describe, expect, it } from 'vitest';
import { dataCorta, dataLunga, giornoDi, leggiNumero, oggi } from '../src/misure-formati';

describe('Numeri scritti dal cliente', () => {
  it.each([
    ['72,5', 72.5], // tastiera italiana del telefono
    ['72.5', 72.5],
    [' 80 ', 80],
    ['18,25', 18.25],
  ])('"%s" → %d', (testo, atteso) => {
    expect(leggiNumero(testo)).toBe(atteso);
  });

  it.each(['', 'abc', '72,5,1', '-3', '1000', '72.555'])('"%s" non è valido', (testo) => {
    expect(leggiNumero(testo)).toBeNull();
  });
});

describe('Date delle misure', () => {
  it('conta solo il giorno, così il fuso orario non lo sposta', () => {
    const giorno = giornoDi('2026-09-29T00:00:00.000Z');
    expect(giorno).toBe('2026-09-29');
    expect(dataCorta(giorno)).toBe('29/09');
    expect(dataLunga(giorno)).toBe('29/09/2026');
  });

  it('oggi nel formato del campo data (AAAA-MM-GG)', () => {
    expect(oggi()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
