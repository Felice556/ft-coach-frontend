import { describe, expect, it } from 'vitest';
import { raggruppaPerEsercizio } from '../src/raggruppaStorico';
import type { SerieStorico } from '../src/api';

let id = 0;
const s = (nomeEsercizio: string, nomeScheda: string, data: string, pesoUsato: number, repsFatte = 8): SerieStorico => ({
  id: ++id, nomeEsercizio, nomeScheda, schedaId: nomeScheda.length, data, pesoUsato, repsFatte, esercizioId: 1, clienteId: 1,
});

describe('Storico pesi generale', () => {
  it('mette insieme lo stesso esercizio di schede diverse (maiuscole, accenti e spazi non contano)', () => {
    const gruppi = raggruppaPerEsercizio([
      s('Panca piana', 'Giorno A - settembre', '2026-09-10T18:00:00Z', 60),
      s('Squat', 'Giorno B', '2026-09-12T18:00:00Z', 90),
      s('panca  Piàna', 'Giorno A - ottobre', '2026-10-20T18:00:00Z', 65, 6),
      s('Panca Piana', 'Giorno A - ottobre', '2026-10-20T18:05:00Z', 65, 7),
    ]);
    expect(gruppi.map((g) => g.nome)).toEqual(['Panca Piana', 'Squat']); // dal più recente, col nome più recente
    const panca = gruppi[0];
    expect(panca.serie).toHaveLength(3);
    expect(panca.giorni).toBe(2);
    expect(panca.schede).toEqual(['Giorno A - ottobre', 'Giorno A - settembre']);
    expect([panca.record.pesoUsato, panca.record.repsFatte]).toEqual([65, 7]);
  });

  it('senza serie non c’è niente da mostrare', () => {
    expect(raggruppaPerEsercizio([])).toEqual([]);
  });
});
