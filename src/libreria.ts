// Libreria esercizi: gruppi muscolari e ricerca "con poche lettere".
import type { EsercizioPreset, GruppoMuscolare } from './api';
import { ESERCIZI_GENERALI } from './esercizi-generali';
import { lingua, tr } from './lingua';

// I gruppi tra cui scegliere. "Braccia" non c'è più: ora è divisa in Bicipiti e Tricipiti.
export const GRUPPI: { valore: GruppoMuscolare; nome: string }[] = [
  { valore: 'PETTO', nome: tr('Petto', 'Chest') },
  { valore: 'DORSO', nome: tr('Dorso', 'Back') },
  { valore: 'SPALLE', nome: tr('Spalle', 'Shoulders') },
  { valore: 'BICIPITI', nome: tr('Bicipiti', 'Biceps') },
  { valore: 'TRICIPITI', nome: tr('Tricipiti', 'Triceps') },
  { valore: 'GAMBE', nome: tr('Gambe', 'Legs') },
  { valore: 'ADDOME', nome: tr('Addome', 'Abs') },
  { valore: 'CARDIO', nome: 'Cardio' },
  { valore: 'ALTRO', nome: tr('Altro', 'Other') },
];

// Il vecchio gruppo unico, per gli esercizi salvati prima della divisione (da spostare a mano).
const BRACCIA = { valore: 'BRACCIA' as GruppoMuscolare, nome: tr('Braccia (da dividere)', 'Arms (to split)') };

export const nomeGruppo = (g: GruppoMuscolare | null | undefined) =>
  [...GRUPPI, BRACCIA].find((x) => x.valore === g)?.nome ?? tr('Senza gruppo', 'No group');

// Minuscolo e senza accenti: "Pànca" e "panca" sono la stessa cosa.
export function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// Cerca gli esercizi che contengono TUTTE le parole scritte, anche a metà:
// "pan pi" trova "Panca piana", "lat" trova "Lat machine".
// Prima quelli dove le parole sono l'inizio di una parola del nome, poi gli altri.
export function cercaEsercizi(preset: EsercizioPreset[], testo: string, massimo = 6): EsercizioPreset[] {
  const parole = normalizza(testo).split(/\s+/).filter(Boolean);
  if (parole.length === 0) return [];
  const conPunteggio: { p: EsercizioPreset; punti: number }[] = [];
  for (const p of preset) {
    const nome = normalizza(p.nome);
    if (!parole.every((w) => nome.includes(w))) {
      // Anche col gruppo muscolare: "tricipiti" trova tutti gli esercizi per i tricipiti (dopo quelli col nome giusto).
      const conGruppo = `${nome} ${normalizza(nomeGruppo(p.gruppo))}`;
      if (p.gruppo && parole.every((w) => conGruppo.includes(w))) conPunteggio.push({ p, punti: -1 });
      continue;
    }
    const paroleNome = nome.split(/[\s\-/]+/);
    let punti = 0;
    for (const w of parole) if (paroleNome.some((n) => n.startsWith(w))) punti += 2;
    if (nome.startsWith(parole[0])) punti += 3;
    conPunteggio.push({ p, punti });
  }
  return conPunteggio
    .sort((a, b) => b.punti - a.punti || a.p.nome.localeCompare(b.p.nome, 'it'))
    .slice(0, massimo)
    .map((x) => x.p);
}

// La libreria divisa per gruppo, nell'ordine di GRUPPI; quelli senza gruppo in fondo.
export function perGruppo(preset: EsercizioPreset[]) {
  const sezioni = [...GRUPPI.slice(0, 5), BRACCIA, ...GRUPPI.slice(5)].map((g) => ({
    valore: g.valore as GruppoMuscolare | null,
    nome: g.nome,
    esercizi: preset.filter((p) => p.gruppo === g.valore),
  }));
  sezioni.push({ valore: null, nome: tr('Senza gruppo', 'No group'), esercizi: preset.filter((p) => !p.gruppo) });
  return sezioni
    .map((s) => ({ ...s, esercizi: [...s.esercizi].sort((a, b) => a.nome.localeCompare(b.nome, 'it')) }))
    .filter((s) => s.esercizi.length > 0);
}

// La libreria generale di Liftio come "esercizi salvati" (id negativi: non esistono sul server),
// col nome nella lingua dell'app. Così si usa con gli stessi campi e pannelli della libreria del trainer.
export const LIBRERIA_GENERALE: EsercizioPreset[] = ESERCIZI_GENERALI.map((e, i) => ({
  id: -(i + 1),
  nome: lingua === 'en' ? e.en : e.it,
  gruppo: e.gruppo,
}));

// Suggerimenti mentre si scrive: prima gli esercizi salvati da chi scrive (la libreria del trainer),
// poi quelli generali con un nome diverso.
export function cercaConGenerali(personali: EsercizioPreset[], generali: EsercizioPreset[], testo: string, massimo = 6): EsercizioPreset[] {
  const miei = cercaEsercizi(personali, testo, massimo);
  const giaPresenti = new Set(personali.map((p) => normalizza(p.nome)));
  const altri = cercaEsercizi(generali.filter((g) => !giaPresenti.has(normalizza(g.nome))), testo, massimo);
  return [...miei, ...altri].slice(0, massimo);
}
