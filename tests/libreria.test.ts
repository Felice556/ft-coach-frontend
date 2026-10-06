import { describe, expect, it } from 'vitest';
import type { EsercizioPreset } from '../src/api';
import { cercaEsercizi, normalizza, perGruppo } from '../src/libreria';

let id = 0;
const es = (nome: string, gruppo: EsercizioPreset['gruppo'] = null): EsercizioPreset => ({ id: ++id, nome, gruppo });
const libreria = [
  es('Panca piana', 'PETTO'),
  es('Panca inclinata manubri', 'PETTO'),
  es('Lat machine', 'DORSO'),
  es('Pulley basso', 'DORSO'),
  es('Squat', 'GAMBE'),
  es('Stacco rumeno', 'GAMBE'),
  es('Curl manubri', 'BRACCIA'),
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

  it('campo vuoto o niente trovato: nessun suggerimento', () => {
    expect(cercaEsercizi(libreria, '   ')).toEqual([]);
    expect(cercaEsercizi(libreria, 'xyz')).toEqual([]);
  });
});

describe('Libreria divisa per gruppi muscolari', () => {
  it('sezioni nell’ordine dei gruppi, solo quelle con esercizi, "Senza gruppo" in fondo', () => {
    const sezioni = perGruppo(libreria);
    expect(sezioni.map((s) => s.nome)).toEqual(['Petto', 'Dorso', 'Braccia', 'Gambe', 'Senza gruppo']);
    expect(nomi(sezioni[0].esercizi)).toEqual(['Panca inclinata manubri', 'Panca piana']);
    expect(nomi(sezioni[4].esercizi)).toEqual(['Plank']);
  });
});
