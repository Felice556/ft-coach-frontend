import { Esercizio } from './api';
import { tr } from './lingua';

// Una singola serie da fare, già "risolta": ripetizioni, recupero e nota giusti.
export interface SerieDaFare {
  numero: number; // 1, 2, 3…
  reps: number | null; // null = "Max" (a cedimento); negli intervalli è il minimo
  repsMax: number | null; // solo per gli intervalli ("6-9" → reps 6, repsMax 9)
  piuMax: boolean; // "+ max" (drop set): fatte le reps, si scala il peso e si continua a cedimento
  recuperoSecondi: number;
  nota: string | null;
  aggiunta: boolean; // true = serie aggiunta dal trainer dopo quelle normali
}

// Come mostrare le ripetizioni: "10", "6-9", "Max", oppure con il drop set "6-9 + max".
export function testoReps(reps: number | null | undefined, repsMax?: number | null, piuMax?: boolean): string {
  if (reps == null) return 'Max';
  const base = repsMax != null && repsMax > reps ? `${reps}-${repsMax}` : String(reps);
  return piuMax ? `${base} + max` : base;
}

// Spiegazione breve del drop set, per chi si allena.
export const SPIEGAZIONE_PIU_MAX = () =>
  tr('drop set: finite le ripetizioni, scala il peso e continua fino a cedimento', 'drop set: after these reps, lower the weight and keep going to failure');

// Testo del recupero: "recupero 90s" oppure "nessun recupero" se è 0.
export function testoRecupero(secondi: number): string {
  return secondi > 0 ? tr(`recupero ${secondi}s`, `rest ${secondi}s`) : tr('nessun recupero', 'no rest');
}

// Da testo scritto dal trainer a valore da salvare:
//   "12"         → { reps: 12, repsMax: null }
//   "6-9", "6/9" → { reps: 6,  repsMax: 9 }   (accettiamo anche –, / e spazi)
//   "max"        → { reps: null, repsMax: null }
//   "6-9 + max", "10+max" → come sopra, con piuMax: true (drop set)
//   altro        → undefined (non valido; anche "max + max")
export function leggiReps(testo: string): { reps: number | null; repsMax: number | null; piuMax: boolean } | undefined {
  let pulito = testo.trim();
  const dropSet = /\s*\+\s*max$/i.test(pulito);
  if (dropSet) pulito = pulito.replace(/\s*\+\s*max$/i, '').trim();
  if (/^max$/i.test(pulito)) return dropSet ? undefined : { reps: null, repsMax: null, piuMax: false };

  const intervallo = pulito.match(/^(\d+)\s*[-–/]\s*(\d+)$/);
  if (intervallo) {
    const min = Number(intervallo[1]);
    const max = Number(intervallo[2]);
    if (min > 0 && max > min) return { reps: min, repsMax: max, piuMax: dropSet };
    return undefined; // es. "9-6" o "0-5": non ha senso
  }

  const n = Number(pulito);
  return Number.isInteger(n) && n > 0 ? { reps: n, repsMax: null, piuMax: dropSet } : undefined;
}

// Trasforma un esercizio nell'elenco ordinato delle sue serie:
// prima le serie normali (tutte uguali), poi quelle aggiunte con i loro valori.
// Es. 2 × 10 + una da 15 → [10, 10, 15]
// Sia la vista cliente sia quella trainer usano questa funzione, così contano allo stesso modo.
export function pianoSerie(es: Esercizio): SerieDaFare[] {
  const normali: SerieDaFare[] = Array.from({ length: es.serieTarget }, (_, i) => ({
    numero: i + 1,
    reps: es.repsTarget,
    repsMax: es.repsMax ?? null,
    piuMax: !!es.piuMax,
    recuperoSecondi: es.recuperoSecondi,
    nota: null,
    aggiunta: false,
  }));
  const aggiunte: SerieDaFare[] = (es.serieExtra || []).map((s, i) => ({
    numero: es.serieTarget + i + 1,
    reps: s.reps,
    repsMax: s.repsMax ?? null,
    piuMax: !!s.piuMax,
    recuperoSecondi: s.recuperoSecondi,
    nota: s.nota || null,
    aggiunta: true,
  }));
  return [...normali, ...aggiunte];
}

// Testo breve: "3 × 10", "2 × 6-9 + 1 × Max", "3 × Max".
export function riassuntoSerie(es: Esercizio): string {
  const parti = [`${es.serieTarget} × ${testoReps(es.repsTarget, es.repsMax, es.piuMax)}`];
  for (const s of es.serieExtra || []) parti.push(`1 × ${testoReps(s.reps, s.repsMax, s.piuMax)}`);
  return parti.join(' + ');
}
