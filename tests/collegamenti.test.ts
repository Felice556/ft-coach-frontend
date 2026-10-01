import { describe, expect, it } from 'vitest';
import type { TipoCollegamento } from '../src/api';
import { gruppiCollegati, prossimoPasso, sigla } from '../src/collegamenti';

const es = (collegamento: TipoCollegamento | null, recuperoSecondi = 90) => ({ collegamento, recuperoSecondi });
const tutti = () => true;

describe('Gruppi di esercizi collegati', () => {
  it('lettere e posizioni: singolo, superset, singolo, jumpset', () => {
    const g = gruppiCollegati([es(null), es('SUPERSET'), es(null), es(null), es('JUMPSET'), es(null)]);
    expect(g.map(sigla)).toEqual([null, 'A1', 'A2', null, 'B1', 'B2']);
    expect(g[1]?.nome).toBe('Superset');
    expect(g[4]?.nome).toBe('Jumpset');
  });

  it('tre superset di fila = triset; tipi misti = circuito', () => {
    expect(gruppiCollegati([es('SUPERSET'), es('SUPERSET'), es(null)])[0]?.nome).toBe('Triset');
    expect(gruppiCollegati([es('SUPERSET'), es('JUMPSET'), es(null)])[0]?.nome).toBe('Circuito');
  });

  it("il collegamento sull'ultimo esercizio si ignora", () => {
    expect(gruppiCollegati([es(null), es('SUPERSET')]).map(sigla)).toEqual([null, null]);
  });
});

describe('Prossimo passo dopo una serie', () => {
  it('esercizio singolo: recupero normale, resta sullo stesso', () => {
    expect(prossimoPasso([es(null, 120)], 0, tutti, 120)).toEqual({ prossimo: 0, recupero: 120 });
    expect(prossimoPasso([es(null, 120)], 0, () => false, 120)).toEqual({ prossimo: null, recupero: 120 });
  });

  it('superset: subito al secondo, poi recupero di fine giro (quello del secondo) e di nuovo il primo', () => {
    const scheda = [es('SUPERSET', 0), es(null, 150)];
    expect(prossimoPasso(scheda, 0, tutti, 0)).toEqual({ prossimo: 1, recupero: 0 });
    expect(prossimoPasso(scheda, 1, tutti, 150)).toEqual({ prossimo: 0, recupero: 150 });
  });

  it('jumpset: recupero tra uno e l’altro', () => {
    const scheda = [es('JUMPSET', 60), es(null, 90)];
    expect(prossimoPasso(scheda, 0, tutti, 60)).toEqual({ prossimo: 1, recupero: 60 });
    expect(prossimoPasso(scheda, 1, tutti, 90)).toEqual({ prossimo: 0, recupero: 90 });
  });

  it('serie diverse: quando uno finisce si continua con l’altro, col recupero di fine giro', () => {
    // A1 ha 4 serie, A2 solo 3: dopo l'ultima di A2 resta solo A1
    const scheda = [es('SUPERSET', 0), es(null, 150)];
    const soloA1 = (i: number) => i === 0;
    expect(prossimoPasso(scheda, 1, soloA1, 150)).toEqual({ prossimo: 0, recupero: 150 });
    expect(prossimoPasso(scheda, 0, soloA1, 0)).toEqual({ prossimo: 0, recupero: 150 });
  });

  it('triset: un esercizio finito si salta', () => {
    const scheda = [es('SUPERSET', 0), es('SUPERSET', 0), es(null, 120)];
    const senzaA2 = (i: number) => i !== 1;
    expect(prossimoPasso(scheda, 0, senzaA2, 0)).toEqual({ prossimo: 2, recupero: 0 });
  });

  it('gruppo finito: niente più passi', () => {
    const scheda = [es('JUMPSET', 60), es(null, 90)];
    expect(prossimoPasso(scheda, 1, () => false, 90).prossimo).toBeNull();
  });

  it('esercizi fuori dal gruppo non vengono toccati', () => {
    const scheda = [es(null, 120), es('SUPERSET', 0), es(null, 90)];
    expect(prossimoPasso(scheda, 0, tutti, 120)).toEqual({ prossimo: 0, recupero: 120 });
  });
});
