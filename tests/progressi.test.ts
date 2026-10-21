import { describe, expect, it } from 'vitest';
import type { RegistroAllenamento } from '../src/api';
import { migliorePerGiorno, record, seriePerGiorno, testoSerie, testoVariazione, ultimaVoltaMigliore, variazione } from '../src/calcoloProgressi';

let id = 0;
const serie = (data: string, peso: number, reps: number): RegistroAllenamento => ({
  id: ++id,
  pesoUsato: peso,
  repsFatte: reps,
  data: `${data}T18:00:00`,
  esercizioId: 1,
  clienteId: 1,
});

const storico = [
  serie('2026-09-28', 60, 8),
  serie('2026-09-28', 60, 7),
  serie('2026-10-05', 62.5, 7),
  serie('2026-10-05', 62.5, 8), // a parità di peso vince quella con più reps
  serie('2026-10-19', 62.5, 8),
  serie('2026-10-19', 65, 6),
];

describe('Progressi di un esercizio', () => {
  it('la serie migliore di ogni giorno: più peso, a parità più ripetizioni', () => {
    const giorni = migliorePerGiorno(storico);
    expect(giorni.map((g) => [g.etichetta, g.peso, g.reps])).toEqual([
      ['28/09', 60, 8],
      ['05/10', 62.5, 8],
      ['19/10', 65, 6],
    ]);
  });

  it('record e variazione dal primo giorno', () => {
    const giorni = migliorePerGiorno(storico);
    expect(testoSerie(record(giorni)!)).toBe('65 kg × 6');
    const v = variazione(giorni)!;
    expect(v.tendenza).toBe('su');
    expect(testoVariazione(v)).toBe('+5 kg dal 28/09');
  });

  it('stesso peso: conta le ripetizioni; tutto uguale: stabile; meno peso: giù', () => {
    const reps = migliorePerGiorno([serie('2026-10-01', 60, 6), serie('2026-10-08', 60, 9)]);
    expect(testoVariazione(variazione(reps)!)).toBe('+3 ripetizioni dal 01/10');
    const uguale = migliorePerGiorno([serie('2026-10-01', 60, 8), serie('2026-10-08', 60, 8)]);
    expect(testoVariazione(variazione(uguale)!)).toBe('Stabile dal 01/10');
    const giu = migliorePerGiorno([serie('2026-10-01', 60, 8), serie('2026-10-08', 57.5, 8)]);
    const v = variazione(giu)!;
    expect(v.tendenza).toBe('giu');
    expect(testoVariazione(v)).toBe('−2,5 kg dal 01/10');
  });

  it('con un solo giorno non c’è variazione', () => {
    expect(variazione(migliorePerGiorno([serie('2026-10-01', 60, 8)]))).toBeNull();
    expect(record([])).toBeNull();
  });

  it("'ultima volta': la serie migliore dell'ultimo giorno prima di oggi, non l'ultima serie (extra più leggera)", () => {
    const conExtra = [
      serie('2026-10-14', 75, 8),
      serie('2026-10-17', 77.5, 7),
      serie('2026-10-17', 77.5, 8),
      serie('2026-10-17', 65, 11), // serie extra a cedimento, registrata per ultima
      serie('2026-10-21', 80, 5), // oggi: non conta
    ];
    const u = ultimaVoltaMigliore(conExtra, new Date('2026-10-21T12:00:00'))!;
    expect([u.pesoUsato, u.repsFatte]).toEqual([77.5, 8]);
    expect(ultimaVoltaMigliore([serie('2026-10-21', 80, 5)], new Date('2026-10-21T12:00:00'))).toBeNull();
  });

  it('serie raggruppate per giorno, dal più recente, in ordine di esecuzione', () => {
    const gruppi = seriePerGiorno(storico);
    expect(gruppi.map((g) => g.etichetta)).toEqual(['19/10', '05/10', '28/09']);
    expect(gruppi[0].serie.map((s) => s.pesoUsato)).toEqual([62.5, 65]);
  });
});
