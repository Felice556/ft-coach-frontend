import { Esercizio } from './api';
import { tr } from './lingua';

// Una singola serie da fare, già "risolta": ripetizioni, recupero e nota giusti.
export interface SerieDaFare {
  numero: number; // 1, 2, 3…
  reps: number | null; // null = "Max" (a cedimento); negli intervalli è il minimo
  repsMax: number | null; // solo per gli intervalli ("6-9" → reps 6, repsMax 9)
  piuMax: boolean; // "+ max" (drop set): fatte le reps, si scala il peso e si continua a cedimento
  rpSecondi: number | null; // "+ rp" (rest-pause): pausa in secondi, poi si riprende con lo stesso peso
  recuperoSecondi: number;
  nota: string | null;
  aggiunta: boolean; // true = serie aggiunta dal trainer dopo quelle normali
}

// Come mostrare le ripetizioni: "10", "6-9", "Max", con il drop set "6-9 + max",
// con il rest-pause "6-9 + rp 15s" (15 = secondi di pausa).
export function testoReps(reps: number | null | undefined, repsMax?: number | null, piuMax?: boolean, rpSecondi?: number | null): string {
  const base = reps == null ? 'Max' : repsMax != null && repsMax > reps ? `${reps}-${repsMax}` : String(reps);
  if (rpSecondi != null) return `${base} + rp ${rpSecondi}s`;
  return piuMax && reps != null ? `${base} + max` : base;
}

// Pausa del rest-pause: quella scritta, altrimenti 15 secondi.
export const RP_PREDEFINITO = 15;
export const RP_MIN = 5;
export const RP_MAX = 120;

// Spiegazioni brevi delle tecniche, per chi si allena.
export const SPIEGAZIONE_PIU_MAX = () =>
  tr('drop set: finite le ripetizioni, scala il peso e continua fino a cedimento', 'drop set: after these reps, lower the weight and keep going to failure');
export const SPIEGAZIONE_RP = (secondi: number) =>
  tr(
    `rest-pause: arrivato a cedimento fermati ${secondi} secondi e riprendi con lo stesso peso, di nuovo fino a cedimento`,
    `rest-pause: at failure rest ${secondi} seconds, then carry on with the same weight, again to failure`,
  );

// Testo del recupero: "recupero 90s" oppure "nessun recupero" se è 0.
export function testoRecupero(secondi: number): string {
  return secondi > 0 ? tr(`recupero ${secondi}s`, `rest ${secondi}s`) : tr('nessun recupero', 'no rest');
}

// Da testo scritto dal trainer a valore da salvare:
//   "12"         → { reps: 12, repsMax: null }
//   "6-9", "6/9" → { reps: 6,  repsMax: 9 }   (accettiamo anche –, / e spazi)
//   "max"        → { reps: null, repsMax: null }
//   "6-9 + max", "10+max" → come sopra, con piuMax: true (drop set)
//   "6-9 + rp 20", "max + rp" → rest-pause con 20 secondi di pausa (senza numero: 15)
//   altro        → undefined (non valido; anche "max + max" o una pausa fuori 5-120 s)
export type RepsLette = { reps: number | null; repsMax: number | null; piuMax: boolean; rpSecondi: number | null };
export function leggiReps(testo: string): RepsLette | undefined {
  let pulito = testo.trim();
  const dropSet = /\s*\+\s*max$/i.test(pulito);
  if (dropSet) pulito = pulito.replace(/\s*\+\s*max$/i, '').trim();
  let rpSecondi: number | null = null;
  const rp = pulito.match(/\s*\+\s*rp\s*(\d+)?\s*s?$/i);
  if (rp) {
    rpSecondi = rp[1] ? Number(rp[1]) : RP_PREDEFINITO;
    if (rpSecondi < RP_MIN || rpSecondi > RP_MAX) return undefined;
    pulito = pulito.slice(0, rp.index).trim();
  }
  if (dropSet && rpSecondi != null) return undefined; // una tecnica finale sola
  if (/^max$/i.test(pulito)) return dropSet ? undefined : { reps: null, repsMax: null, piuMax: false, rpSecondi };

  const intervallo = pulito.match(/^(\d+)\s*[-–/]\s*(\d+)$/);
  if (intervallo) {
    const min = Number(intervallo[1]);
    const max = Number(intervallo[2]);
    if (min > 0 && max > min) return { reps: min, repsMax: max, piuMax: dropSet, rpSecondi };
    return undefined; // es. "9-6" o "0-5": non ha senso
  }

  const n = Number(pulito);
  return Number.isInteger(n) && n > 0 ? { reps: n, repsMax: null, piuMax: dropSet, rpSecondi } : undefined;
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
    rpSecondi: es.rpSecondi ?? null,
    recuperoSecondi: es.recuperoSecondi,
    nota: null,
    aggiunta: false,
  }));
  const aggiunte: SerieDaFare[] = (es.serieExtra || []).map((s, i) => ({
    numero: es.serieTarget + i + 1,
    reps: s.reps,
    repsMax: s.repsMax ?? null,
    piuMax: !!s.piuMax,
    rpSecondi: s.rpSecondi ?? null,
    recuperoSecondi: s.recuperoSecondi,
    nota: s.nota || null,
    aggiunta: true,
  }));
  return [...normali, ...aggiunte];
}

// Testo breve: "3 × 10", "2 × 6-9 + 1 × Max", "3 × Max".
export function riassuntoSerie(es: Esercizio): string {
  const parti = [`${es.serieTarget} × ${testoReps(es.repsTarget, es.repsMax, es.piuMax, es.rpSecondi)}`];
  for (const s of es.serieExtra || []) parti.push(`1 × ${testoReps(s.reps, s.repsMax, s.piuMax, s.rpSecondi)}`);
  return parti.join(' + ');
}
