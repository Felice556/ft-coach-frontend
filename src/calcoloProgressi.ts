// Calcoli dei progressi di un esercizio, a partire dalle serie registrate.
// Funzioni "pure" (niente React): così si possono testare facilmente.
import type { RegistroAllenamento } from './api';
import { locale, tr } from './lingua';

export interface MiglioreDelGiorno {
  chiave: string; // giorno, per raggruppare (es. "Mon Oct 19 2026")
  data: string; // ISO della serie migliore
  etichetta: string; // "19/10"
  peso: number;
  reps: number;
}

const etichettaGiorno = (iso: string) =>
  new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

// "Migliore" = più peso; a parità di peso, più ripetizioni.
const meglio = (a: { peso: number; reps: number }, b: { peso: number; reps: number }) =>
  a.peso > b.peso || (a.peso === b.peso && a.reps > b.reps);

// La serie migliore di ogni giorno, dal giorno più vecchio al più recente.
export function migliorePerGiorno(storico: RegistroAllenamento[]): MiglioreDelGiorno[] {
  const perGiorno = new Map<string, MiglioreDelGiorno>();
  for (const r of storico) {
    const chiave = new Date(r.data).toDateString();
    const candidata = { chiave, data: r.data, etichetta: etichettaGiorno(r.data), peso: r.pesoUsato, reps: r.repsFatte };
    const attuale = perGiorno.get(chiave);
    if (!attuale || meglio(candidata, attuale)) perGiorno.set(chiave, candidata);
  }
  return [...perGiorno.values()].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
}

// Il record personale: la serie migliore di sempre (a parità, la prima volta che è stata fatta).
export function record(giorni: MiglioreDelGiorno[]): MiglioreDelGiorno | null {
  let migliore: MiglioreDelGiorno | null = null;
  for (const g of giorni) if (!migliore || meglio(g, migliore)) migliore = g;
  return migliore;
}

export interface Variazione {
  kg: number; // differenza di peso tra l'ultimo giorno e il primo
  reps: number; // differenza di ripetizioni (conta solo se il peso è uguale)
  dal: string; // etichetta del primo giorno, es. "28/09"
  tendenza: 'su' | 'giu' | 'uguale';
}

// Com'è cambiata la serie migliore dal primo giorno all'ultimo. Serve almeno a 2 giorni.
export function variazione(giorni: MiglioreDelGiorno[]): Variazione | null {
  if (giorni.length < 2) return null;
  const primo = giorni[0];
  const ultimo = giorni[giorni.length - 1];
  const kg = Math.round((ultimo.peso - primo.peso) * 100) / 100;
  const reps = ultimo.reps - primo.reps;
  const tendenza = kg > 0 || (kg === 0 && reps > 0) ? 'su' : kg < 0 || (kg === 0 && reps < 0) ? 'giu' : 'uguale';
  return { kg, reps, dal: primo.etichetta, tendenza };
}

const numero = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

// Testo breve e chiaro della variazione: "+5 kg dal 28/09", "+2 ripetizioni dal 28/09", "Stabile dal 28/09".
export function testoVariazione(v: Variazione): string {
  const dal = tr(`dal ${v.dal}`, `since ${v.dal}`);
  if (v.kg !== 0) return `${v.kg > 0 ? '+' : '−'}${numero(Math.abs(v.kg))} kg ${dal}`;
  if (v.reps !== 0) {
    const n = Math.abs(v.reps);
    return `${v.reps > 0 ? '+' : '−'}${n} ${n === 1 ? tr('ripetizione', 'rep') : tr('ripetizioni', 'reps')} ${dal}`;
  }
  return tr(`Stabile dal ${v.dal}`, `Steady since ${v.dal}`);
}

// "62,5 kg × 8"
export const testoSerie = (s: { peso: number; reps: number }) => `${numero(s.peso)} kg × ${s.reps}`;

// Le serie raggruppate per giorno, dal giorno più recente; dentro il giorno, in ordine di esecuzione.
export function seriePerGiorno(storico: RegistroAllenamento[]) {
  const gruppi = new Map<string, { chiave: string; data: string; etichetta: string; serie: RegistroAllenamento[] }>();
  for (const r of [...storico].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())) {
    const chiave = new Date(r.data).toDateString();
    if (!gruppi.has(chiave)) gruppi.set(chiave, { chiave, data: r.data, etichetta: etichettaGiorno(r.data), serie: [] });
    gruppi.get(chiave)!.serie.push(r);
  }
  return [...gruppi.values()].reverse();
}

// "Ultima volta": la serie migliore (più peso, a parità più ripetizioni) dell'ultimo giorno
// di allenamento PRIMA di oggi. Non l'ultima serie registrata: se l'ultima era una serie extra
// più leggera (es. a cedimento), mostrarla farebbe sembrare che il cliente sia andato peggio.
export function ultimaVoltaMigliore(storico: RegistroAllenamento[], oggi = new Date()): RegistroAllenamento | null {
  const chiaveOggi = oggi.toDateString();
  const passate = storico.filter((r) => new Date(r.data).toDateString() !== chiaveOggi);
  if (passate.length === 0) return null;
  const ultimoGiorno = passate.reduce((a, r) => (new Date(r.data) > new Date(a.data) ? r : a)).data;
  const chiave = new Date(ultimoGiorno).toDateString();
  let migliore: RegistroAllenamento | null = null;
  for (const r of passate) {
    if (new Date(r.data).toDateString() !== chiave) continue;
    if (!migliore || meglio({ peso: r.pesoUsato, reps: r.repsFatte }, { peso: migliore.pesoUsato, reps: migliore.repsFatte })) migliore = r;
  }
  return migliore;
}

// Serie "record": quelle che hanno battuto la migliore di sempre fino a quel momento
// (più peso, a parità di peso più ripetizioni). Il primo giorno non conta: non c'è niente da battere.
export function serieRecord(storico: RegistroAllenamento[]): Set<number> {
  const risultato = new Set<number>();
  let migliore: { peso: number; reps: number } | null = null;
  let primoGiorno: string | null = null;
  for (const r of [...storico].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())) {
    const giorno = new Date(r.data).toDateString();
    if (primoGiorno === null) primoGiorno = giorno;
    const s = { peso: r.pesoUsato, reps: r.repsFatte };
    if (!migliore || meglio(s, migliore)) {
      if (migliore && giorno !== primoGiorno) risultato.add(r.id);
      migliore = s;
    }
  }
  return risultato;
}

// Record di ogni giorno: quante serie record (vedi sopra) ci sono in ogni giorno.
// Chiave = giorno (toDateString), valore = numero di record.
export function recordPerGiorno(storico: RegistroAllenamento[]): Map<string, number> {
  const record = serieRecord(storico);
  const risultato = new Map<string, number>();
  for (const r of storico) {
    if (!record.has(r.id)) continue;
    const giorno = new Date(r.data).toDateString();
    risultato.set(giorno, (risultato.get(giorno) ?? 0) + 1);
  }
  return risultato;
}

// Volume di un gruppo di serie: somma di peso × ripetizioni (es. 62,5 × 8 + 62,5 × 7 = 937,5 kg).
export const volume = (serie: { pesoUsato: number; repsFatte: number }[]) => serie.reduce((t, s) => t + s.pesoUsato * s.repsFatte, 0);
