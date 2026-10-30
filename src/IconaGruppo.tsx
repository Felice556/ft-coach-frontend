import type { GruppoMuscolare } from './api';

// Icone dei gruppi muscolari: disegni semplici in SVG fatti apposta per Liftio (nessun diritto
// da pagare), leggerissimi e del colore del testo, quindi giusti sia col tema chiaro sia con lo scuro.
// Il contorno del corpo è tenue; la parte allenata è piena.

const tratto = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const tenue = { ...tratto, opacity: 0.45 };
const pieno = { fill: 'currentColor' } as const;
// Braccia e gambe: linea spessa e tenue.
const arto = { ...tenue, strokeWidth: 3.2 };

// Busto visto di fronte (o di schiena): spalle, fianchi, collo.
const Busto = () => <path {...tenue} d="M9.5 3.5h5M7 6c1.6-1.4 8.4-1.4 10 0l2.5 3.5-2 1.5v9.5h-11V11l-2-1.5z" />;

const DISEGNI: Record<GruppoMuscolare, JSX.Element> = {
  PETTO: (
    <>
      <Busto />
      <path {...pieno} d="M7.6 8.2c1.2-.9 3.2-1 4-.4v3.6c-1.4.9-3.3.7-4.2-.3zM16.4 8.2c-1.2-.9-3.2-1-4-.4v3.6c1.4.9 3.3.7 4.2-.3z" />
    </>
  ),
  DORSO: (
    <>
      <Busto />
      <path {...pieno} d="M7.4 8.3l4.1-.9v8.2l-2.7-1.8zM16.6 8.3l-4.1-.9v8.2l2.7-1.8z" />
    </>
  ),
  SPALLE: (
    <>
      <Busto />
      <circle {...pieno} cx="7.3" cy="7.6" r="2.1" />
      <circle {...pieno} cx="16.7" cy="7.6" r="2.1" />
    </>
  ),
  // Braccio piegato "a mostrare il muscolo": il bicipite è la palla sopra il braccio.
  BICIPITI: (
    <>
      <path {...arto} d="M3.5 16.5h10.2l1.3-10" />
      <circle {...tenue} cx="15.3" cy="4.6" r="1.9" />
      <path {...pieno} d="M4.6 15.2c.6-3.9 7.3-5.6 9.4-1.2.2.5.1 1-.4 1.2z" />
    </>
  ),
  // Braccio disteso: il tricipite è la parte dietro, sopra il gomito.
  TRICIPITI: (
    <>
      <path {...arto} d="M12.5 2.8v17" />
      <circle {...tenue} cx="12.5" cy="21" r="1.6" />
      <path {...pieno} d="M11.2 3.5c-3.6 1.4-3.9 8.2-.2 10.3l1.3-.6z" />
      <path {...tratto} d="M8.7 12.6l1.6 1" />
    </>
  ),
  BRACCIA: (
    <>
      <path {...arto} d="M3.5 16.5h10.2l1.3-10" />
      <circle {...tenue} cx="15.3" cy="4.6" r="1.9" />
      <path {...pieno} d="M4.6 15.2c.6-3.9 7.3-5.6 9.4-1.2.2.5.1 1-.4 1.2z" />
    </>
  ),
  // Gamba: coscia piena, stinco e piede in tenue.
  GAMBE: (
    <>
      <path {...arto} d="M12 12.5v7.2h4.3" />
      <path {...pieno} d="M8.3 3.2h7.4c.7 3.2-.1 6.9-1.9 9.6h-3.6c-1.8-2.7-2.6-6.4-1.9-9.6z" />
    </>
  ),
  // Addome: i "quadratini".
  ADDOME: (
    <>
      <path {...tenue} d="M7.5 4c2.8-1 6.2-1 9 0l.5 16c-3.3 1-6.7 1-10 0z" />
      <rect {...pieno} x="9" y="6.3" width="2.6" height="2.8" rx=".8" />
      <rect {...pieno} x="12.4" y="6.3" width="2.6" height="2.8" rx=".8" />
      <rect {...pieno} x="9" y="10.4" width="2.6" height="2.8" rx=".8" />
      <rect {...pieno} x="12.4" y="10.4" width="2.6" height="2.8" rx=".8" />
      <rect {...pieno} x="9" y="14.5" width="2.6" height="2.8" rx=".8" />
      <rect {...pieno} x="12.4" y="14.5" width="2.6" height="2.8" rx=".8" />
    </>
  ),
  // Cuore con il battito.
  CARDIO: (
    <>
      <path {...tenue} d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
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
