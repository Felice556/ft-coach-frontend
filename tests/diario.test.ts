import { describe, expect, it } from 'vitest';
import { cambiaQuantita, settimanaFinoA } from '../src/diario-calcoli';

describe('diario', () => {
  it('settimana di 7 giorni che finisce oggi', () => {
    expect(settimanaFinoA('2026-11-02')).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('olio e acqua: si sale e si scende a passi, mai sotto zero né oltre il massimo', () => {
    expect(cambiaQuantita(null, 0.5, 20)).toBe(0.5);
    expect(cambiaQuantita(1.5, 0.25, 10)).toBe(1.75);
    expect(cambiaQuantita(0.5, -0.5, 20)).toBeNull();
    expect(cambiaQuantita(null, -0.5, 20)).toBeNull();
    expect(cambiaQuantita(10, 0.25, 10)).toBe(10);
  });
});
