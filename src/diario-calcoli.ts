// Piccole funzioni del diario alimentare (niente React: si testano facilmente).
import type { TipoPasto } from './api';
import { aggiungiGiorni } from './cardio-calcoli';
import { tr } from './lingua';

export const TIPI_PASTO: TipoPasto[] = ['COLAZIONE', 'SPUNTINO_MATTINA', 'PRANZO', 'SPUNTINO_POMERIGGIO', 'CENA'];

export const nomePasto = (t: TipoPasto) =>
  ({
    COLAZIONE: tr('Colazione', 'Breakfast'),
    SPUNTINO_MATTINA: tr('Spuntino', 'Snack'),
    PRANZO: tr('Pranzo', 'Lunch'),
    SPUNTINO_POMERIGGIO: tr('Spuntino', 'Snack'),
    CENA: tr('Cena', 'Dinner'),
  })[t];

// I 7 giorni che finiscono con `fine` (compreso), dal più vecchio.
export const settimanaFinoA = (fine: string) => Array.from({ length: 7 }, (_, i) => aggiungiGiorni(fine, i - 6));

// Olio (passo 0,5 cucchiai, massimo 20) e acqua (passo 0,25 litri, massimo 10): mai sotto zero.
export function cambiaQuantita(valore: number | null, delta: number, massimo: number): number | null {
  const nuovo = Math.round(((valore ?? 0) + delta) * 100) / 100;
  if (nuovo <= 0) return null;
  return Math.min(massimo, nuovo);
}
