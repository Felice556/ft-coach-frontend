import { useEffect, useState } from 'react';

// Tema dell'app: "automatico" segue l'impostazione del telefono (chiaro di giorno, scuro di sera
// se il telefono è impostato così); "chiaro" e "scuro" la ignorano.
export type SceltaTema = 'automatico' | 'chiaro' | 'scuro';

const CHIAVE = 'tema';
const EVENTO_TEMA = 'palestra:tema';
// Colore della barra del browser/telefono, come lo sfondo dell'app.
const COLORE_BARRA = { chiaro: '#f5f5f3', scuro: '#1f2023' };

const mediaScuro = () => window.matchMedia('(prefers-color-scheme: dark)');

export function leggiSceltaTema(): SceltaTema {
  try {
    const salvato = localStorage.getItem(CHIAVE);
    if (salvato === 'chiaro' || salvato === 'scuro' || salvato === 'automatico') return salvato;
  } catch {
    // localStorage non disponibile (es. navigazione privata): si usa l'automatico
  }
  return 'automatico';
}

function temaEffettivo(scelta: SceltaTema): 'chiaro' | 'scuro' {
  if (scelta === 'automatico') return mediaScuro().matches ? 'scuro' : 'chiaro';
  return scelta;
}

// Mette il tema sulla pagina: attributo data-tema su <html> (lo legge index.css) e colore della barra.
export function applicaTema(scelta: SceltaTema) {
  const tema = temaEffettivo(scelta);
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORE_BARRA[tema]);
  window.dispatchEvent(new Event(EVENTO_TEMA));
}

export function salvaSceltaTema(scelta: SceltaTema) {
  try {
    localStorage.setItem(CHIAVE, scelta);
  } catch {
    // se non si può salvare, il tema vale comunque fino alla chiusura della pagina
  }
  applicaTema(scelta);
}

// Da chiamare una volta all'avvio: se il tema è automatico e il telefono passa
// da chiaro a scuro (es. la sera), l'app cambia insieme a lui.
export function seguiTemaDelTelefono() {
  mediaScuro().addEventListener('change', () => {
    if (leggiSceltaTema() === 'automatico') applicaTema('automatico');
  });
}

// Colori attuali letti dal CSS: servono ai componenti che non usano le classi, come il grafico.
function leggiColori() {
  const stile = getComputedStyle(document.documentElement);
  const v = (nome: string) => stile.getPropertyValue(nome).trim();
  return {
    linea: v('--t-accent-strong'),
    sfondo: v('--t-surface'),
    griglia: v('--t-line'),
    testo: v('--t-muted'),
    tooltip: v('--t-surface'),
    inchiostro: v('--t-ink'),
  };
}

export function useColoriTema() {
  const [colori, setColori] = useState(leggiColori);
  useEffect(() => {
    const aggiorna = () => setColori(leggiColori());
    window.addEventListener(EVENTO_TEMA, aggiorna);
    return () => window.removeEventListener(EVENTO_TEMA, aggiorna);
  }, []);
  return colori;
}
