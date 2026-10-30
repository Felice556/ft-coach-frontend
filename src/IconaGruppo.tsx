import type { GruppoMuscolare } from './api';

// Icone dei gruppi muscolari: disegni semplici in SVG fatti apposta per Liftio (nessun diritto
// da pagare), leggerissimi e del colore del testo, quindi giusti sia col tema chiaro sia con lo scuro.
// La sagoma del corpo è chiara; la parte allenata è piena.

const tratto = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
// Il corpo è una sagoma chiara; il muscolo allenato è pieno.
const sagoma = { fill: 'currentColor', opacity: 0.3 } as const;
const pieno = { fill: 'currentColor' } as const;

// Busto visto di fronte (o di schiena), con testa e braccia lungo i fianchi.
const Busto = () => (
  <>
    <circle {...sagoma} cx="12" cy="3.6" r="2.3" />
    <path
      {...sagoma}
      d="M12 6.6c-2.5 0-4.6.2-6 1-1.4.8-1.9 2.4-2.1 4.4l-.5 7c-.1 1.2 1.4 1.4 1.6.2l.8-6 .8 1.6.4 6.7h10l.4-6.7.8-1.6.8 6c.2 1.2 1.7 1 1.6-.2l-.5-7c-.2-2-.7-3.6-2.1-4.4-1.4-.8-3.5-1-6-1z"
    />
  </>
);

// Braccio piegato "a mostrare il muscolo": sopra c'è il bicipite, sotto il tricipite.
const Braccio = () => (
  <path
    {...sagoma}
    d="M3.5 13.2h7.9l1-4.6c-.8-.4-1-1.2-.8-2l.6-2.2c.3-1 1.2-1.5 2.2-1.4l1.9.2c1.1.1 1.8 1.1 1.6 2.2l-.6 3.2.6 6c.2 2.8-1.5 4.8-4.3 4.8H3.5c-1.1 0-2-.9-2-2v-2.2c0-1.1.9-2 2-2z"
  />
);

const DISEGNI: Record<GruppoMuscolare, JSX.Element> = {
  PETTO: (
    <>
      <Busto />
      <path {...pieno} d="M7.4 8.6c1.6-.6 3.6-.6 4.2 0v3c-1.6 1-3.6.6-4.4-.4zM16.6 8.6c-1.6-.6-3.6-.6-4.2 0v3c1.6 1 3.6.6 4.4-.4z" />
    </>
  ),
  // Di schiena: i dorsali "a V".
  DORSO: (
    <>
      <Busto />
      <path {...pieno} d="M7 8.4l4.4 1.2v6.9c-1.8-.9-3.4-2.7-4.4-4.9zM17 8.4l-4.4 1.2v6.9c1.8-.9 3.4-2.7 4.4-4.9z" />
    </>
  ),
  SPALLE: (
    <>
      <Busto />
      <circle {...pieno} cx="5.9" cy="9.1" r="2" />
      <circle {...pieno} cx="18.1" cy="9.1" r="2" />
    </>
  ),
  BICIPITI: (
    <>
      <Braccio />
      <path {...pieno} d="M3.6 13.4c1-3.8 6-4.8 8-.8l-.2.8z" />
    </>
  ),
  TRICIPITI: (
    <>
      <Braccio />
      <path {...pieno} d="M3.6 16.5c3-1.1 7.2-1.1 9.8.1l.3 2.4c-.6.4-1.3.4-2 .4-2 1.6-6 1.6-8.1 0-.6 0-1.1-.3-1.3-.8z" />
    </>
  ),
  // Il vecchio gruppo unico: braccio con bicipite e tricipite.
  BRACCIA: (
    <>
      <Braccio />
      <path {...pieno} d="M3.6 13.4c1-3.8 6-4.8 8-.8l-.2.8zM3.6 16.5c3-1.1 7.2-1.1 9.8.1l.3 2.4c-.6.4-1.3.4-2 .4-2 1.6-6 1.6-8.1 0-.6 0-1.1-.3-1.3-.8z" />
    </>
  ),
  // Dalla vita in giù: le cosce (quadricipiti) piene.
  GAMBE: (
    <>
      <path {...sagoma} d="M6.6 2.6h10.8l.6 7-1 3.4-.2 7.4h1.8v1.2h-5.2l-.2-8.2-.8-5h-.8l-.8 5-.2 8.2H5.4v-1.2h1.8L7 13 6 9.6z" />
      <path {...pieno} d="M6.4 5.6c-.4 2.4 0 5.2 1 7h3.4l1-5-.2-2zM17.6 5.6c.4 2.4 0 5.2-1 7h-3.4l-1-5 .2-2z" />
    </>
  ),
  ADDOME: (
    <>
      <Busto />
      <rect {...pieno} x="10.1" y="12.4" width="1.7" height="1.8" rx=".5" />
      <rect {...pieno} x="12.2" y="12.4" width="1.7" height="1.8" rx=".5" />
      <rect {...pieno} x="10.1" y="14.6" width="1.7" height="1.8" rx=".5" />
      <rect {...pieno} x="12.2" y="14.6" width="1.7" height="1.8" rx=".5" />
      <rect {...pieno} x="10.1" y="16.8" width="1.7" height="1.8" rx=".5" />
      <rect {...pieno} x="12.2" y="16.8" width="1.7" height="1.8" rx=".5" />
    </>
  ),
  // Cuore con il battito.
  CARDIO: (
    <>
      <path {...sagoma} d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
      <path {...tratto} d="M3 12.5h4.3l1.6-3 2.6 6 1.8-3.6h7.7" />
    </>
  ),
  // Manubrio.
  ALTRO: (
    <>
      <path {...tratto} d="M8 12h8" />
      <rect {...pieno} x="4.2" y="7.5" width="3.2" height="9" rx="1" />
      <rect {...pieno} x="16.6" y="7.5" width="3.2" height="9" rx="1" />
      <path {...tratto} d="M2.8 10v4M21.2 10v4" />
    </>
  ),
};

export default function IconaGruppo({ gruppo, className = 'h-5 w-5' }: { gruppo: GruppoMuscolare | null | undefined; className?: string }) {
  if (!gruppo) return <span aria-hidden className={`inline-block shrink-0 ${className}`} />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      {DISEGNI[gruppo]}
    </svg>
  );
}
