import { describe, expect, it } from 'vitest';
import { recordPerGiorno } from '../src/calcoloProgressi';

describe('Record di ogni giorno', () => {
  it('conta le serie che battono la migliore di sempre; il primo giorno non conta', () => {
    const s = (data: string, pesoUsato: number, repsFatte: number, id: number) => ({ id, data, pesoUsato, repsFatte, esercizioId: 1, clienteId: 1 });
    const mappa = recordPerGiorno([
      s('2026-10-01T18:00:00Z', 60, 8, 1),
      s('2026-10-01T18:05:00Z', 62.5, 6, 2),
      s('2026-10-08T18:00:00Z', 62.5, 7, 3), // stesso peso, più reps: record
      s('2026-10-08T18:05:00Z', 65, 5, 4), // più peso: record
      s('2026-10-15T18:00:00Z', 60, 10, 5), // niente record
    ]);
    expect(mappa.get(new Date('2026-10-01T18:00:00Z').toDateString())).toBeUndefined();
    expect(mappa.get(new Date('2026-10-08T18:00:00Z').toDateString())).toBe(2);
    expect(mappa.get(new Date('2026-10-15T18:00:00Z').toDateString())).toBeUndefined();
  });
});

describe('Serie record e volume', () => {
  it('segna le singole serie record e somma il volume', async () => {
    const { serieRecord, volume } = await import('../src/calcoloProgressi');
    const s = (data: string, pesoUsato: number, repsFatte: number, id: number) => ({ id, data, pesoUsato, repsFatte, esercizioId: 1, clienteId: 1 });
    const storico = [s('2026-10-01T18:00:00Z', 60, 8, 1), s('2026-10-08T18:00:00Z', 62.5, 7, 2), s('2026-10-08T18:05:00Z', 60, 10, 3)];
    expect([...serieRecord(storico)]).toEqual([2]);
    expect(volume([s('x', 62.5, 8, 1), s('x', 62.5, 7, 2)])).toBe(937.5);
  });
});
