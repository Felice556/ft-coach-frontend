import { describe, expect, it } from 'vitest';
import type { Esercizio } from '../src/api';
import { gruppiSerie, leggiReps, pianoSerie, riassuntoSerie, testoRecupero, testoReps } from '../src/serie';

const esercizio = (dati: Partial<Esercizio>) =>
  ({ id: 1, nome: 'Panca', serieTarget: 3, repsTarget: 10, repsMax: null, recuperoSecondi: 90, serieExtra: [], ...dati }) as Esercizio;

describe('Ripetizioni scritte dal trainer', () => {
  it.each([
    ['12', { reps: 12, repsMax: null, piuMax: false, rpSecondi: null, cluster: null }],
    ['6-9', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: null, cluster: null }],
    ['6 / 9', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: null, cluster: null }],
    ['6–9', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: null, cluster: null }],
    ['max', { reps: null, repsMax: null, piuMax: false, rpSecondi: null, cluster: null }],
    ['MAX', { reps: null, repsMax: null, piuMax: false, rpSecondi: null, cluster: null }],
    ['6-9 + max', { reps: 6, repsMax: 9, piuMax: true, rpSecondi: null, cluster: null }],
    ['6-9+MAX', { reps: 6, repsMax: 9, piuMax: true, rpSecondi: null, cluster: null }],
    ['10 + Max', { reps: 10, repsMax: null, piuMax: true, rpSecondi: null, cluster: null }],
    ['6-9 + rp 20', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: 20, cluster: null }],
    ['6-9 + rp 20s', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: 20, cluster: null }],
    ['8+RP', { reps: 8, repsMax: null, piuMax: false, rpSecondi: 15, cluster: null }],
    ['max + rp 10', { reps: null, repsMax: null, piuMax: false, rpSecondi: 10, cluster: null }],
  ])('"%s" è valido', (testo, atteso) => {
    expect(leggiReps(testo)).toEqual(atteso);
  });

  it.each([
    ['5+5+5+5', { reps: 5, repsMax: null, piuMax: false, rpSecondi: 15, cluster: 4 }],
    ['5 + 5 + 5', { reps: 5, repsMax: null, piuMax: false, rpSecondi: 15, cluster: 3 }],
    ['5+5+5+5 + pausa 10', { reps: 5, repsMax: null, piuMax: false, rpSecondi: 10, cluster: 4 }],
    ['5+5+5+5 + pausa 10s', { reps: 5, repsMax: null, piuMax: false, rpSecondi: 10, cluster: 4 }],
    ['3+3 + rp 20', { reps: 3, repsMax: null, piuMax: false, rpSecondi: 20, cluster: 2 }],
    ['5+5+5+5 + pausa ', { reps: 5, repsMax: null, piuMax: false, rpSecondi: 15, cluster: 4 }],
  ])('cluster "%s" è valido', (testo, atteso) => {
    expect(leggiReps(testo)).toEqual(atteso);
  });

  it.each(['5+4+3', '5+', '0+0', '5+5 + pausa 3', '5+5 + pausa 500', '1+1+1+1+1+1+1+1+1+1+1', '5+5 + max'])('cluster "%s" non è valido', (testo) => {
    expect(leggiReps(testo)).toBeUndefined();
  });

  it.each(['9-6', '0-5', '0', '-3', '2.5', 'dieci', '', 'max + max', '+ max', '6-9 + rp 3', '6-9 + rp 500', '6-9 + rp 15 + max'])('"%s" non è valido', (testo) => {
    expect(leggiReps(testo)).toBeUndefined();
  });
});

describe('Testi mostrati', () => {
  it('ripetizioni: numero, intervallo o Max', () => {
    expect(testoReps(10)).toBe('10');
    expect(testoReps(6, 9)).toBe('6-9');
    expect(testoReps(null)).toBe('Max');
    expect(testoReps(8, 8)).toBe('8'); // intervallo "finto"
    expect(testoReps(6, 9, true)).toBe('6-9 + max');
    expect(testoReps(10, null, true)).toBe('10 + max');
    expect(testoReps(6, 9, false, 15)).toBe('6-9 + rp 15s');
    expect(testoReps(null, null, false, 10)).toBe('Max + rp 10s');
    expect(testoReps(6, 9, true, 15)).toBe('6-9 + rp 15s'); // una tecnica sola: vince il rest-pause
    expect(testoReps(5, null, false, 10, 4)).toBe('5+5+5+5 + pausa 10s');
    expect(testoReps(5, null, false, null, 3)).toBe('5+5+5 + pausa 15s');
    // quello che si mostra si rilegge uguale (l'editor riapre la scheda con questo testo)
    expect(leggiReps(testoReps(5, null, false, 10, 4))).toEqual({ reps: 5, repsMax: null, piuMax: false, rpSecondi: 10, cluster: 4 });
  });

  it('recupero', () => {
    expect(testoRecupero(90)).toBe('recupero 90s');
    expect(testoRecupero(0)).toBe('nessun recupero');
  });

  it('riassunto di un esercizio con serie aggiunte', () => {
    const es = esercizio({ serieTarget: 2, repsTarget: 6, repsMax: 9, serieExtra: [{ reps: null, recuperoSecondi: 60 }] });
    expect(riassuntoSerie(es)).toBe('2 × 6-9 + 1 × Max');
  });

  it('riassunto con drop set', () => {
    const es = esercizio({ serieTarget: 2, repsTarget: 6, repsMax: 9, serieExtra: [{ reps: 6, repsMax: 9, piuMax: true, recuperoSecondi: 60 }] });
    expect(riassuntoSerie(es)).toBe('2 × 6-9 + 1 × 6-9 + max');
    expect(pianoSerie(es)[2].piuMax).toBe(true);
  });
});

describe('Piano delle serie', () => {
  it('prima le serie normali, poi quelle aggiunte con i loro valori', () => {
    const es = esercizio({ serieTarget: 2, repsTarget: 10, serieExtra: [{ reps: 15, recuperoSecondi: 30, nota: 'Dropset' }] });
    const piano = pianoSerie(es);
    expect(piano.map((s) => s.reps)).toEqual([10, 10, 15]);
    expect(piano.map((s) => s.numero)).toEqual([1, 2, 3]);
    expect(piano[2]).toMatchObject({ aggiunta: true, recuperoSecondi: 30, nota: 'Dropset' });
    expect(piano[0].aggiunta).toBe(false);
  });

  it('esercizio senza serie aggiunte', () => {
    expect(pianoSerie(esercizio({ serieTarget: 4 }))).toHaveLength(4);
  });
});

describe('Serie raggruppate per la barra del programma', () => {
  const extra = (d: object) => ({ id: 1, ordine: 0, reps: 10, repsMax: null, recuperoSecondi: 90, nota: null, piuMax: false, rpSecondi: null, ...d });
  it('serie tutte uguali: un gruppo solo (basta la barra Serie · Reps · Recupero)', () => {
    expect(gruppiSerie(pianoSerie(esercizio({})))).toHaveLength(1);
    // anche con una serie aggiunta identica alle altre
    const g = gruppiSerie(pianoSerie(esercizio({ serieExtra: [extra({})] as never })));
    expect(g).toHaveLength(1);
    expect(g[0].quante).toBe(4);
  });
  it('top set + back-off: due righe con reps e recupero di ognuna', () => {
    const es = esercizio({ serieTarget: 1, repsTarget: 6, repsMax: 9, recuperoSecondi: 150, serieExtra: [extra({ reps: 8, repsMax: 12, recuperoSecondi: 90 }), extra({ reps: 8, repsMax: 12, recuperoSecondi: 90 })] as never });
    const g = gruppiSerie(pianoSerie(es));
    expect(g.map((x) => [x.da, x.quante, testoReps(x.serie.reps, x.serie.repsMax), x.serie.recuperoSecondi])).toEqual([
      [0, 1, '6-9', 150],
      [1, 2, '8-12', 90],
    ]);
  });
  it('piramidale: una riga per ogni serie diversa', () => {
    const es = esercizio({ serieTarget: 1, repsTarget: 12, serieExtra: [extra({ reps: 10 }), extra({ reps: 8 }), extra({ reps: 6, piuMax: true })] as never });
    expect(gruppiSerie(pianoSerie(es)).map((x) => testoReps(x.serie.reps, x.serie.repsMax, x.serie.piuMax))).toEqual(['12', '10', '8', '6 + max']);
  });
});

describe('Cluster nel programma', () => {
  it('serie con cluster: pause e mini-serie nel piano, reps totali da segnare', async () => {
    const { repsTotali } = await import('../src/serie');
    const es = esercizio({ serieTarget: 3, repsTarget: 5, rpSecondi: 10, cluster: 4, recuperoSecondi: 120 } as never);
    const piano = pianoSerie(es);
    expect(piano).toHaveLength(3);
    expect(piano[0]).toMatchObject({ reps: 5, cluster: 4, rpSecondi: 10, recuperoSecondi: 120 });
    expect(repsTotali(piano[0])).toBe(20);
    expect(riassuntoSerie(es)).toBe('3 × 5+5+5+5 + pausa 10s');
    expect(gruppiSerie(piano)).toHaveLength(1);
  });
});
