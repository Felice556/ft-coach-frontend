import { describe, expect, it } from 'vitest';
import type { EsercizioPreset } from '../src/api';
import { cercaConGenerali, cercaEsercizi, LIBRERIA_GENERALE, nomeGruppo, normalizza, perGruppo } from '../src/libreria';
import { ESERCIZI_GENERALI } from '../src/esercizi-generali';

let id = 0;
const es = (nome: string, gruppo: EsercizioPreset['gruppo'] = null): EsercizioPreset => ({ id: ++id, nome, gruppo });
const libreria = [
  es('Panca piana', 'PETTO'),
  es('Panca inclinata manubri', 'PETTO'),
  es('Lat machine', 'DORSO'),
  es('Pulley basso', 'DORSO'),
  es('Squat', 'GAMBE'),
  es('Stacco rumeno', 'GAMBE'),
  es('Curl manubri', 'BICIPITI'),
  es('Push down', 'TRICIPITI'),
  es('Croci vecchie', 'BRACCIA'), // salvato prima della divisione delle braccia
  es('Plank'),
];
const nomi = (lista: EsercizioPreset[]) => lista.map((p) => p.nome);

describe('Ricerca con poche lettere', () => {
  it('poche lettere bastano', () => {
    expect(nomi(cercaEsercizi(libreria, 'lat'))).toEqual(['Lat machine']);
    expect(nomi(cercaEsercizi(libreria, 'pan'))).toEqual(['Panca inclinata manubri', 'Panca piana']);
  });

  it('più parole, anche a metà: "pan pi" → Panca piana', () => {
    expect(nomi(cercaEsercizi(libreria, 'pan pi'))).toEqual(['Panca piana']);
  });

  it('maiuscole, accenti e spazi non contano', () => {
    expect(normalizza('  Pànca ')).toBe('panca');
    expect(nomi(cercaEsercizi(libreria, 'SQUAT '))).toEqual(['Squat']);
  });

  it('prima chi inizia con quello che scrivi', () => {
    // "manu" è l'inizio di "manubri" in due esercizi, in ordine alfabetico
    expect(nomi(cercaEsercizi(libreria, 'manu'))).toEqual(['Curl manubri', 'Panca inclinata manubri']);
  });

  it('si può cercare anche per gruppo muscolare, dopo gli esercizi col nome giusto', () => {
    expect(nomi(cercaEsercizi(libreria, 'tricip'))).toEqual(['Push down']);
    expect(nomi(cercaEsercizi(libreria, 'dorso'))).toEqual(['Lat machine', 'Pulley basso']);
  });

  it('campo vuoto o niente trovato: nessun suggerimento', () => {
    expect(cercaEsercizi(libreria, '   ')).toEqual([]);
    expect(cercaEsercizi(libreria, 'xyz')).toEqual([]);
  });
});

describe('Libreria divisa per gruppi muscolari', () => {
  it('sezioni nell’ordine dei gruppi, solo quelle con esercizi, "Senza gruppo" in fondo', () => {
    const sezioni = perGruppo(libreria);
    expect(sezioni.map((s) => s.nome)).toEqual(['Petto', 'Dorso', 'Bicipiti', 'Tricipiti', 'Braccia (da dividere)', 'Gambe', 'Senza gruppo']);
    expect(nomi(sezioni[0].esercizi)).toEqual(['Panca inclinata manubri', 'Panca piana']);
    expect(nomi(sezioni[6].esercizi)).toEqual(['Plank']);
    expect(nomeGruppo('BRACCIA')).toBe('Braccia (da dividere)');
  });
});

describe('Libreria generale di Liftio', () => {
  it('nomi unici (in italiano e in inglese) e ogni gruppo ha i suoi esercizi', () => {
    const it = ESERCIZI_GENERALI.map((e) => normalizza(e.it));
    const en = ESERCIZI_GENERALI.map((e) => normalizza(e.en));
    expect(new Set(it).size).toBe(it.length);
    expect(new Set(en).size).toBe(en.length);
    for (const g of ['PETTO', 'DORSO', 'SPALLE', 'BICIPITI', 'TRICIPITI', 'GAMBE', 'ADDOME', 'CARDIO']) {
      expect(ESERCIZI_GENERALI.filter((e) => e.gruppo === g).length).toBeGreaterThanOrEqual(6);
    }
    expect(ESERCIZI_GENERALI.some((e) => e.gruppo === 'BRACCIA')).toBe(false);
  });

  it('nei suggerimenti vengono prima gli esercizi del trainer, poi quelli generali senza doppioni', () => {
    const miei = [es('Panca piana con bilanciere', 'PETTO'), es('Panca stretta mia', 'TRICIPITI')];
    const r = nomi(cercaConGenerali(miei, LIBRERIA_GENERALE, 'panca', 10));
    expect(r.slice(0, 2).sort()).toEqual(['Panca piana con bilanciere', 'Panca stretta mia']);
    expect(r.filter((n) => n === 'Panca piana con bilanciere')).toHaveLength(1);
    expect(r).toContain('Panca inclinata con manubri');
  });
});
