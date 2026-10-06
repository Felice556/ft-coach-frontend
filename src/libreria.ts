// Libreria esercizi: gruppi muscolari e ricerca "con poche lettere".
import type { EsercizioPreset, GruppoMuscolare } from './api';

export const GRUPPI: { valore: GruppoMuscolare; nome: string }[] = [
  { valore: 'PETTO', nome: 'Petto' },
  { valore: 'DORSO', nome: 'Dorso' },
  { valore: 'SPALLE', nome: 'Spalle' },
  { valore: 'BRACCIA', nome: 'Braccia' },
  { valore: 'GAMBE', nome: 'Gambe' },
  { valore: 'ADDOME', nome: 'Addome' },
  { valore: 'CARDIO', nome: 'Cardio' },
  { valore: 'ALTRO', nome: 'Altro' },
];

export const nomeGruppo = (g: GruppoMuscolare | null | undefined) =>
  GRUPPI.find((x) => x.valore === g)?.nome ?? 'Senza gruppo';

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
    if (!parole.every((w) => nome.includes(w))) continue;
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
  const sezioni = GRUPPI.map((g) => ({
    valore: g.valore as GruppoMuscolare | null,
    nome: g.nome,
    esercizi: preset.filter((p) => p.gruppo === g.valore),
  }));
  sezioni.push({ valore: null, nome: 'Senza gruppo', esercizi: preset.filter((p) => !p.gruppo) });
  return sezioni
    .map((s) => ({ ...s, esercizi: [...s.esercizi].sort((a, b) => a.nome.localeCompare(b.nome, 'it')) }))
    .filter((s) => s.esercizi.length > 0);
}
