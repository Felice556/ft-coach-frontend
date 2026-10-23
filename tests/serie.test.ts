import { describe, expect, it } from 'vitest';
import type { Esercizio } from '../src/api';
import { leggiReps, pianoSerie, riassuntoSerie, testoRecupero, testoReps } from '../src/serie';

const esercizio = (dati: Partial<Esercizio>) =>
  ({ id: 1, nome: 'Panca', serieTarget: 3, repsTarget: 10, repsMax: null, recuperoSecondi: 90, serieExtra: [], ...dati }) as Esercizio;

describe('Ripetizioni scritte dal trainer', () => {
  it.each([
    ['12', { reps: 12, repsMax: null, piuMax: false, rpSecondi: null }],
    ['6-9', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: null }],
    ['6 / 9', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: null }],
    ['6–9', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: null }],
    ['max', { reps: null, repsMax: null, piuMax: false, rpSecondi: null }],
    ['MAX', { reps: null, repsMax: null, piuMax: false, rpSecondi: null }],
    ['6-9 + max', { reps: 6, repsMax: 9, piuMax: true, rpSecondi: null }],
    ['6-9+MAX', { reps: 6, repsMax: 9, piuMax: true, rpSecondi: null }],
    ['10 + Max', { reps: 10, repsMax: null, piuMax: true, rpSecondi: null }],
    ['6-9 + rp 20', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: 20 }],
    ['6-9 + rp 20s', { reps: 6, repsMax: 9, piuMax: false, rpSecondi: 20 }],
    ['8+RP', { reps: 8, repsMax: null, piuMax: false, rpSecondi: 15 }],
    ['max + rp 10', { reps: null, repsMax: null, piuMax: false, rpSecondi: 10 }],
  ])('"%s" è valido', (testo, atteso) => {
    expect(leggiReps(testo)).toEqual(atteso);
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
