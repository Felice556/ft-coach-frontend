// Lingua dell'app: italiano o inglese (britannico).
// Di base segue la lingua del telefono: italiano se il telefono è in italiano, inglese per tutto il resto.
// Chi vuole cambiarla lo fa da Impostazioni o dalla schermata di accesso; la scelta resta salvata.
export type Lingua = 'it' | 'en';

const CHIAVE = 'lingua';

export function linguaIniziale(): Lingua {
  try {
    const salvata = localStorage.getItem(CHIAVE);
    if (salvata === 'it' || salvata === 'en') return salvata;
  } catch {
    // localStorage non disponibile (es. navigazione privata): si segue il telefono
  }
  const telefono = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'it';
  return telefono.toLowerCase().startsWith('it') ? 'it' : 'en';
}

// Letta una volta all'apertura: cambiando lingua la pagina si ricarica, così ogni testo è coerente.
export const lingua: Lingua = linguaIniziale();
if (typeof document !== 'undefined') document.documentElement.lang = lingua;

// Ogni testo dell'app è scritto nelle due lingue, una accanto all'altra: tr('Salva', 'Save').
export const tr = (it: string, en: string) => (lingua === 'en' ? en : it);

// Formato di date e numeri: 21/10/2026 e 77,5 in italiano; 21/10/2026 e 77.5 in inglese britannico.
export const locale = lingua === 'en' ? 'en-GB' : 'it-IT';

export function cambiaLingua(nuova: Lingua) {
  if (nuova === lingua) return;
  try {
    localStorage.setItem(CHIAVE, nuova);
  } catch {
    // senza localStorage la scelta vale solo fino alla chiusura
  }
  window.location.reload();
}
