import { ReactNode, useEffect, useState } from 'react';
import { tr } from './lingua';

// Navigazione a sezioni, uguale per cliente e trainer:
// - sul telefono una barra fissa in basso (si raggiunge con il pollice, come nelle app);
// - sul computer le stesse voci diventano schede in alto.
// La sezione aperta sta nell'indirizzo (es. liftio.it/#diario): così il tasto "indietro"
// del telefono torna alla sezione di prima e l'ultima sezione si ritrova riaprendo l'app.

export interface VoceSezione<T extends string> {
  id: T;
  nome: string;
  icona: ReactNode;
  pallino?: boolean; // novità da guardare (es. un commento nuovo del trainer)
}

// L'indirizzo dopo il "#", tenuto in sincronia con il tasto indietro del browser/telefono.
export function useIndirizzo(): [string, (nuovo: string, sostituisci?: boolean) => void] {
  const leggi = () => decodeURIComponent(window.location.hash.replace(/^#/, ''));
  const [indirizzo, setIndirizzo] = useState(leggi);
  useEffect(() => {
    const aggiorna = () => setIndirizzo(leggi());
    window.addEventListener('popstate', aggiorna);
    window.addEventListener('hashchange', aggiorna);
    return () => {
      window.removeEventListener('popstate', aggiorna);
      window.removeEventListener('hashchange', aggiorna);
    };
  }, []);
  function vai(nuovo: string, sostituisci = false) {
    if (nuovo === leggi()) return;
    const url = `${window.location.pathname}${window.location.search}#${nuovo}`;
    if (sostituisci) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setIndirizzo(nuovo);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }
  return [indirizzo, vai];
}

// Ultima sezione usata su questo telefono (per riaprire l'app dove la si era lasciata).
export function ricordaSezione(chiave: string, valore?: string): string | null {
  try {
    if (valore !== undefined) localStorage.setItem(chiave, valore);
    return localStorage.getItem(chiave);
  } catch {
    return null;
  }
}

export function BarraSezioni<T extends string>({ voci, attiva, onCambia, etichetta }: { voci: VoceSezione<T>[]; attiva: T; onCambia: (id: T) => void; etichetta: string }) {
  const voce = (v: VoceSezione<T>, mobile: boolean) => {
    const sel = v.id === attiva;
    return (
      <button
        key={v.id}
        type="button"
        aria-current={sel ? 'page' : undefined}
        onClick={() => onCambia(v.id)}
        className={
          mobile
            ? `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${sel ? 'text-accent-strong' : 'text-muted hover:text-ink'}`
            : `relative inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                sel ? 'border-accent-strong bg-accent text-accent-ink' : 'border-line bg-surface text-ink hover:border-accent-strong'
              }`
        }
      >
        <span className="relative" aria-hidden="true">
          {v.icona}
          {v.pallino && <span className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-danger" />}
        </span>
        <span>{v.nome}</span>
        {v.pallino && <span className="sr-only"> · {tr('novità', 'new')}</span>}
      </button>
    );
  };
  return (
    <>
      {/* Computer: schede in alto */}
      <nav className="mb-6 hidden flex-wrap gap-2 sm:flex" aria-label={etichetta}>
        {voci.map((v) => voce(v, false))}
      </nav>
      {/* Telefono: barra fissa in basso */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label={etichetta}
      >
        {voci.map((v) => voce(v, true))}
      </nav>
    </>
  );
}

// Icone semplici (linee), 22 px.
const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
export const ICONE = {
  allenamento: (
    <Svg>
      <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
    </Svg>
  ),
  cardio: (
    <Svg>
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </Svg>
  ),
  diario: (
    <Svg>
      <path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM6 3v18M10 8h5M10 12h5" />
    </Svg>
  ),
  corpo: (
    <Svg>
      <path d="m4 14 5-5 4 4 7-9M4 4v16h16" />
    </Svg>
  ),
  attivita: (
    <Svg>
      <path d="M4 13h3l2-5 4 10 2-5h5" />
    </Svg>
  ),
  clienti: (
    <Svg>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
    </Svg>
  ),
  inviti: (
    <Svg>
      <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
    </Svg>
  ),
  trainer: (
    <Svg>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
};
