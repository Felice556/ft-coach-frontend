import { describe, expect, it } from 'vitest';
import { leggiFileSchede } from '../src/fileSchede';

const esercizio = (dati: Record<string, unknown> = {}) => ({
  nome: 'Leg press a 45°', serieTarget: 2, repsTarget: 6, repsMax: 9, recuperoSecondi: 150, piuMax: false, rpSecondi: null,
  descrizione: 'Dopo le serie pesanti scala il 20%', serieExtra: [{ reps: 8, repsMax: 15, recuperoSecondi: 120, piuMax: false, rpSecondi: null }], ...dati,
});
const file = (schede: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ app: 'schedario', formato: 'liftio-schede', versione: 1, cliente: 'Mario Rossi', schede, ...extra });

describe('Importa schede da Schedario', () => {
  it('legge il file di Schedario con serie extra, rest-pause e scalare', () => {
    const r = leggiFileSchede(file([
      { nome: 'Giorno A - Gambe', esercizi: [esercizio(), esercizio({ nome: 'Leg extension', serieExtra: [{ reps: 10, repsMax: 12, recuperoSecondi: 60, piuMax: true, rpSecondi: null }] })] },
      { nome: 'Giorno B - Dorso', esercizi: [esercizio({ nome: 'Lat machine', serieExtra: [{ reps: 8, repsMax: 12, recuperoSecondi: 90, piuMax: false, rpSecondi: 15 }] })] },
    ]));
    expect(r.cliente).toBe('Mario Rossi');
    expect(r.schede.map((s) => s.nome)).toEqual(['Giorno A - Gambe', 'Giorno B - Dorso']);
    expect(r.schede[0].esercizi[0]).toMatchObject({ nome: 'Leg press a 45°', serieTarget: 2, repsTarget: 6, repsMax: 9, recuperoSecondi: 150, collegamento: null });
    expect(r.schede[0].esercizi[1].serieExtra[0].piuMax).toBe(true);
    expect(r.schede[1].esercizi[0].serieExtra[0].rpSecondi).toBe(15);
  });
  it('accetta anche un semplice elenco di schede', () => {
    expect(leggiFileSchede(JSON.stringify([{ nome: 'A', esercizi: [esercizio()] }])).schede).toHaveLength(1);
  });
  it('rifiuta file rotti o fuori dai limiti del server, senza creare niente', () => {
    expect(() => leggiFileSchede('non è json')).toThrow();
    expect(() => leggiFileSchede(JSON.stringify({ app: 'dietario', clienti: [] }))).toThrow();
    expect(() => leggiFileSchede(file([]))).toThrow();
    expect(() => leggiFileSchede(file([{ nome: '', esercizi: [esercizio()] }]))).toThrow();
    expect(() => leggiFileSchede(file([{ nome: 'A', esercizi: [] }]))).toThrow();
    expect(() => leggiFileSchede(file([{ nome: 'A', esercizi: [esercizio({ serieTarget: 25 })] }]))).toThrow();
    expect(() => leggiFileSchede(file([{ nome: 'A', esercizi: [esercizio({ nome: '' })] }]))).toThrow();
    expect(() => leggiFileSchede(file([{ nome: 'A', esercizi: [esercizio({ recuperoSecondi: -5 })] }]))).toThrow();
  });
  it('taglia nomi e note alla lunghezza che il server accetta', () => {
    const r = leggiFileSchede(file([{ nome: 'x'.repeat(150), esercizi: [esercizio({ nome: 'y'.repeat(150), descrizione: 'z'.repeat(1500) })] }]));
    expect(r.schede[0].nome).toHaveLength(100);
    expect(r.schede[0].esercizi[0].nome).toHaveLength(100);
    expect(r.schede[0].esercizi[0].descrizione).toHaveLength(1000);
  });
});
