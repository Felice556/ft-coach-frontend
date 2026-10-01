// Superset e jumpset: esercizi della scheda collegati "al successivo".
// Più esercizi collegati di fila formano un gruppo (A1, A2, A3…).
import type { TipoCollegamento } from './api';

type ConCollegamento = { collegamento?: TipoCollegamento | null | '' };

export interface InfoGruppo {
  lettera: string; // "A", "B"… in ordine di scheda
  posizione: number; // 1, 2, 3… dentro il gruppo
  dimensione: number; // quanti esercizi nel gruppo
  inizio: number; // indice del primo esercizio del gruppo
  fine: number; // indice dell'ultimo
  nome: string; // "Superset", "Jumpset", "Triset"…
}

// Nome del gruppo in base ai collegamenti al suo interno.
function nomeGruppo(tipi: TipoCollegamento[]): string {
  const tuttiSuperset = tipi.every((t) => t === 'SUPERSET');
  const tuttiJumpset = tipi.every((t) => t === 'JUMPSET');
  if (tuttiJumpset) return 'Jumpset';
  if (!tuttiSuperset) return 'Circuito';
  if (tipi.length === 1) return 'Superset';
  if (tipi.length === 2) return 'Triset';
  return 'Giant set';
}

// Per ogni esercizio: in che gruppo sta (o null se è singolo).
// L'ultimo esercizio non può essere collegato a niente: il suo collegamento si ignora.
export function gruppiCollegati(esercizi: ConCollegamento[]): (InfoGruppo | null)[] {
  const risultato: (InfoGruppo | null)[] = esercizi.map(() => null);
  let lettera = 0;
  let i = 0;
  while (i < esercizi.length) {
    let fine = i;
    while (fine < esercizi.length - 1 && esercizi[fine].collegamento) fine++;
    if (fine > i) {
      const tipi = esercizi.slice(i, fine).map((e) => e.collegamento as TipoCollegamento);
      const info = { lettera: String.fromCharCode(65 + (lettera % 26)), dimensione: fine - i + 1, inizio: i, fine, nome: nomeGruppo(tipi) };
      for (let k = i; k <= fine; k++) risultato[k] = { ...info, posizione: k - i + 1 };
      lettera++;
    }
    i = fine + 1;
  }
  return risultato;
}

type EsercizioPerPasso = ConCollegamento & { recuperoSecondi: number };

// Dopo una serie dell'esercizio `indice`: qual è il prossimo esercizio e quanto recupero fare.
// - `restano(i)`: true se all'esercizio i mancano ancora serie oggi (dopo quella appena fatta).
// - `recuperoSerie`: il recupero previsto per la serie appena fatta.
// Regole:
//   superset → si passa subito al successivo (recupero 0); il recupero si fa a fine giro,
//              ed è quello dell'ultimo esercizio del gruppo;
//   jumpset  → recupero dell'esercizio appena fatto, poi il successivo;
//   un esercizio che ha finito le serie si salta; se resta un solo esercizio si continua con quello.
// `prossimo` è null quando non c'è più niente da fare (nel gruppo, o nell'esercizio singolo).
export function prossimoPasso(
  esercizi: EsercizioPerPasso[],
  indice: number,
  restano: (i: number) => boolean,
  recuperoSerie: number
): { prossimo: number | null; recupero: number } {
  const gruppo = gruppiCollegati(esercizi)[indice];
  if (!gruppo) return { prossimo: restano(indice) ? indice : null, recupero: recuperoSerie };

  const { inizio, fine, dimensione } = gruppo;
  let prossimo: number | null = null;
  for (let k = 1; k <= dimensione; k++) {
    const j = inizio + ((indice - inizio + k) % dimensione);
    if (restano(j)) {
      prossimo = j;
      break;
    }
  }
  if (prossimo === null) return { prossimo: null, recupero: 0 };

  // Recupero "di fine giro" quando si torna indietro (o si resta sullo stesso esercizio).
  const recuperoGiro = () => {
    if (esercizi[indice].collegamento === 'SUPERSET' && indice !== fine) return esercizi[fine].recuperoSecondi;
    return recuperoSerie;
  };

  if (prossimo <= indice) return { prossimo, recupero: recuperoGiro() };

  // Avanti nel gruppo: se tutti i collegamenti attraversati sono superset, niente recupero.
  for (let k = indice; k < prossimo; k++) {
    if (esercizi[k].collegamento === 'JUMPSET') {
      return { prossimo, recupero: k === indice ? recuperoSerie : esercizi[k].recuperoSecondi };
    }
  }
  return { prossimo, recupero: 0 };
}

// Etichetta corta da mostrare sull'esercizio: "A1", "A2"… (null se singolo).
export const sigla = (g: InfoGruppo | null) => (g ? `${g.lettera}${g.posizione}` : null);
