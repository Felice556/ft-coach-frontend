// Importa schede da un file (per esempio quelle preparate con Schedario).
// Il file contiene solo schede da CREARE: l'importazione non tocca e non archivia mai le schede esistenti.
// I limiti sono gli stessi del server (routes/schede.ts), così il controllo avviene prima di inviare.
import type { Esercizio } from './api';
import { tr } from './lingua';

export type EsercizioDaCreare = Omit<Esercizio, 'id' | 'schedaId'>;
export interface SchedaDaCreare { nome: string; esercizi: EsercizioDaCreare[] }

const intero = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;
const reps = (v: unknown) => (v == null ? null : intero(v, 1, 1000));
const testo = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function leggiEsercizio(e: any, dove: string): EsercizioDaCreare {
  const nome = testo(e?.nome, 100);
  if (!nome) throw new Error(tr(`${dove}: un esercizio non ha il nome.`, `${dove}: an exercise has no name.`));
  // EMOM: un giro ogni 10-300 secondi; i giri (serieTarget) possono arrivare a 60.
  const emomSecondi = e.emomSecondi == null ? null : intero(e.emomSecondi, 10, 300);
  if (e.emomSecondi != null && emomSecondi == null) throw new Error(tr(`${dove}, "${nome}": EMOM non valido (un giro ogni 10-300 secondi).`, `${dove}, "${nome}": invalid EMOM (one round every 10-300 seconds).`));
  const serieTarget = intero(e.serieTarget, 1, emomSecondi != null ? 60 : 20);
  // Cluster a totale: da 10 a 100 reps, con le reps di riferimento (RM) più basse del totale
  const clusterTotale = e.clusterTotale == null ? null : intero(e.clusterTotale, 10, 100);
  if (e.clusterTotale != null && (clusterTotale == null || typeof e.repsTarget !== 'number' || e.repsTarget >= clusterTotale))
    throw new Error(tr(`${dove}, "${nome}": cluster a totale non valido (totale 10-100, reps di riferimento più basse).`, `${dove}, "${nome}": invalid total-reps cluster (total 10-100, lower reference reps).`));
  const recupero = intero(e.recuperoSecondi, 0, 3600);
  if (serieTarget == null || recupero == null) throw new Error(tr(`${dove}, "${nome}": serie o recupero non validi.`, `${dove}, "${nome}": invalid sets or rest.`));
  const repsTarget = reps(e.repsTarget);
  const extra = Array.isArray(e.serieExtra) ? e.serieExtra : [];
  if (extra.length > 10) throw new Error(tr(`${dove}, "${nome}": troppe serie extra (massimo 10).`, `${dove}, "${nome}": too many extra sets (max 10).`));
  const rp = (v: unknown) => (v == null ? null : intero(v, 5, 120));
  const cl = (v: unknown) => (v == null ? null : intero(v, 2, 10));
  return {
    nome,
    descrizione: testo(e.descrizione, 1000) || undefined,
    serieTarget,
    repsTarget,
    repsMax: reps(e.repsMax),
    piuMax: e.piuMax === true,
    rpSecondi: rp(e.rpSecondi),
    cluster: cl(e.cluster),
    emomSecondi,
    clusterTotale,
    recuperoSecondi: recupero,
    collegamento: null,
    serieExtra: (emomSecondi != null || clusterTotale != null ? [] : extra).map((x: any) => {
      const r = intero(x?.recuperoSecondi, 0, 3600);
      if (r == null) throw new Error(tr(`${dove}, "${nome}": recupero di una serie extra non valido.`, `${dove}, "${nome}": invalid rest on an extra set.`));
      return { reps: reps(x.reps), repsMax: reps(x.repsMax), piuMax: x.piuMax === true, rpSecondi: rp(x.rpSecondi), cluster: cl(x.cluster), recuperoSecondi: r };
    }),
  };
}

// Accetta il file di Schedario ({ formato: 'liftio-schede', schede: [...] }) oppure direttamente un elenco di schede.
export function leggiFileSchede(contenuto: string): { cliente: string | null; schede: SchedaDaCreare[] } {
  let dati: any;
  try {
    dati = JSON.parse(contenuto);
  } catch {
    throw new Error(tr('Il file non è leggibile: serve il .json esportato da Schedario.', 'The file cannot be read: use the .json exported from Schedario.'));
  }
  const elenco = Array.isArray(dati) ? dati : dati?.formato === 'liftio-schede' ? dati.schede : null;
  if (!Array.isArray(elenco) || elenco.length === 0) throw new Error(tr('Nel file non ci sono schede da importare.', 'There are no programmes to import in this file.'));
  if (elenco.length > 60) throw new Error(tr('Troppe schede in un file solo (massimo 60).', 'Too many programmes in one file (max 60).'));
  const schede = elenco.map((s: any, i: number) => {
    const nome = testo(s?.nome, 100);
    const dove = nome || tr(`Scheda ${i + 1}`, `Programme ${i + 1}`);
    if (!nome) throw new Error(tr(`${dove}: manca il nome.`, `${dove}: the name is missing.`));
    const esercizi = (Array.isArray(s.esercizi) ? s.esercizi : []).map((e: any) => leggiEsercizio(e, dove));
    if (!esercizi.length) throw new Error(tr(`${dove}: non ha esercizi.`, `${dove}: it has no exercises.`));
    return { nome, esercizi };
  });
  return { cliente: typeof dati?.cliente === 'string' ? dati.cliente : null, schede };
}
