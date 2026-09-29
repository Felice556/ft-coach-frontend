// Piccole funzioni per date e numeri delle misure del corpo (usate da MisureCorporee.tsx e dai test).

// Le date arrivano come "2026-09-29T00:00:00.000Z": usiamo solo "2026-09-29",
// così il giorno non si sposta con il fuso orario.
export const giornoDi = (iso: string) => iso.slice(0, 10);
export const dataCorta = (giorno: string) => `${giorno.slice(8, 10)}/${giorno.slice(5, 7)}`;
export const dataLunga = (giorno: string) => `${giorno.slice(8, 10)}/${giorno.slice(5, 7)}/${giorno.slice(0, 4)}`;
export const numero = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 1 });

export function oggi() {
  const d = new Date();
  const due = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

// "72,5" o "72.5" → 72.5 (sul telefono italiano la tastiera mette la virgola)
export function leggiNumero(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(pulito)) return null;
  return Number(pulito);
}
