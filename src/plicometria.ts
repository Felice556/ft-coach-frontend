// Plicometria: % di massa grassa dalle pliche, con le formule di Jackson & Pollock
// (densità corporea) e di Siri (da densità a % di grasso).

export type Sesso = 'M' | 'F';
export type NumeroSiti = 3 | 7;
export type Sito = 'pettorale' | 'addome' | 'coscia' | 'tricipite' | 'sovrailiaca' | 'sottoscapolare' | 'ascellare';

export const NOMI_SITI: Record<Sito, string> = {
  pettorale: 'Pettorale',
  addome: 'Addome',
  coscia: 'Coscia',
  tricipite: 'Tricipite',
  sovrailiaca: 'Sovrailiaca',
  sottoscapolare: 'Sottoscapolare',
  ascellare: 'Ascellare',
};

// Quali pliche servono: con 7 siti sono le stesse per tutti,
// con 3 siti cambiano tra uomo (pettorale, addome, coscia) e donna (tricipite, sovrailiaca, coscia).
export function sitiRichiesti(siti: NumeroSiti, sesso: Sesso): Sito[] {
  if (siti === 7) return ['pettorale', 'addome', 'coscia', 'tricipite', 'sovrailiaca', 'sottoscapolare', 'ascellare'];
  return sesso === 'M' ? ['pettorale', 'addome', 'coscia'] : ['tricipite', 'sovrailiaca', 'coscia'];
}

// Densità corporea (g/cm³) dalla somma delle pliche in mm e dall'età.
export function densitaCorporea(siti: NumeroSiti, sesso: Sesso, somma: number, eta: number): number {
  const s = somma;
  if (siti === 7) {
    return sesso === 'M'
      ? 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * eta
      : 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * eta;
  }
  return sesso === 'M'
    ? 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * eta
    : 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * eta;
}

// Formula di Siri: % di grasso = 495 / densità − 450.
export const percentualeSiri = (densita: number) => 495 / densita - 450;

export interface RisultatoPliche {
  somma: number; // mm
  densita: number;
  grasso: number; // %, arrotondata a un decimale
  kgGrasso: number | null; // solo se c'è il peso
  kgMagra: number | null;
}

export function calcolaPliche(
  siti: NumeroSiti,
  sesso: Sesso,
  eta: number,
  pliche: Partial<Record<Sito, number>>,
  peso: number | null
): RisultatoPliche {
  const somma = sitiRichiesti(siti, sesso).reduce((acc, s) => acc + (pliche[s] ?? 0), 0);
  const densita = densitaCorporea(siti, sesso, somma, eta);
  const grasso = Math.round(percentualeSiri(densita) * 10) / 10;
  const kgGrasso = peso ? Math.round(((peso * grasso) / 100) * 10) / 10 : null;
  const kgMagra = peso && kgGrasso !== null ? Math.round((peso - kgGrasso) * 10) / 10 : null;
  return { somma: Math.round(somma * 10) / 10, densita, grasso, kgGrasso, kgMagra };
}
