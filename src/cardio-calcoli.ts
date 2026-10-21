// Calcoli della sezione Cardio e passi: settimana in corso, sessioni fatte per ogni attività
// del piano, passi degli ultimi 7 giorni. Funzioni "pure" (niente React): si testano facilmente.
// I giorni sono stringhe "AAAA-MM-GG": così non si spostano con il fuso orario.
import type { CardioFatto, ObiettivoCardio, PassiGiorno } from './api';
import { giornoDi } from './misure-formati';

// "2026-10-21" + n giorni (anche negativi).
export function aggiungiGiorni(giorno: string, n: number): string {
  const d = new Date(`${giorno}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Il lunedì della settimana di quel giorno (la settimana va da lunedì a domenica).
export function lunediDi(giorno: string): string {
  const giornoSettimana = new Date(`${giorno}T12:00:00Z`).getUTCDay(); // 0 = domenica
  return aggiungiGiorni(giorno, -((giornoSettimana + 6) % 7));
}

const stessaAttivita = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Sessioni fatte questa settimana per un'attività del piano. Contano quelle collegate all'attività
// e quelle scritte a mano con lo stesso nome (es. scelta "Altro" ma stessa attività).
export function fatteQuestaSettimana(sessioni: CardioFatto[], obiettivo: ObiettivoCardio, oggi: string): number {
  const inizio = lunediDi(oggi);
  const fine = aggiungiGiorni(inizio, 6);
  return sessioni.filter((s) => {
    const g = giornoDi(s.data);
    if (g < inizio || g > fine) return false;
    return s.obiettivoId === obiettivo.id || (s.obiettivoId == null && stessaAttivita(s.attivita, obiettivo.attivita));
  }).length;
}

// Minuti totali di cardio nella settimana in corso.
export function minutiQuestaSettimana(sessioni: CardioFatto[], oggi: string): number {
  const inizio = lunediDi(oggi);
  const fine = aggiungiGiorni(inizio, 6);
  return sessioni.filter((s) => giornoDi(s.data) >= inizio && giornoDi(s.data) <= fine).reduce((t, s) => t + s.minuti, 0);
}

// Gli ultimi 7 giorni fino a oggi compreso, ognuno con i suoi passi (null = non inseriti).
export function ultimi7Giorni(passi: PassiGiorno[], oggi: string): { giorno: string; passi: number | null }[] {
  const perGiorno = new Map(passi.map((p) => [giornoDi(p.data), p.passi]));
  return Array.from({ length: 7 }, (_, i) => {
    const giorno = aggiungiGiorni(oggi, i - 6);
    return { giorno, passi: perGiorno.get(giorno) ?? null };
  });
}

// Media dei giorni in cui i passi ci sono (null se non ce n'è nessuno).
export function mediaPassi(giorni: { passi: number | null }[]): number | null {
  const valori = giorni.map((g) => g.passi).filter((p): p is number => p !== null);
  return valori.length ? Math.round(valori.reduce((a, b) => a + b, 0) / valori.length) : null;
}

// "8.123", "8,123", "8 123" o "8123" → 8123. Null se non è un numero di passi sensato.
export function leggiPassi(testo: string): number | null {
  const pulito = testo.trim().replace(/[\s.,'’]/g, '');
  if (!/^\d{1,6}$/.test(pulito)) return null;
  const n = Number(pulito);
  return n <= 100000 ? n : null;
}

// "4,5" o "4.5" km → 4.5 (al massimo 2 decimali). Vuoto → null. Undefined se non valido.
export function leggiKm(testo: string): number | null | undefined {
  const pulito = testo.trim().replace(',', '.');
  if (!pulito) return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(pulito)) return undefined;
  const n = Number(pulito);
  return n <= 300 ? n : undefined;
}
