import { tr } from './lingua';

// Campo ripetizioni, uguale per trainer e per chi si allena da solo.
// Si scrive "10" o "6-9"; il bottone dentro il campo:
// - con il campo vuoto (o "Max") mette/toglie "Max" (a cedimento);
// - con un numero scritto aggiunge/toglie "+ max" (drop set: "6-9 + max").
// Con il drop set acceso il campo mostra solo "6-9" e il bottone "+max" resta evidenziato:
// così il testo ci sta anche nelle colonne strette del telefono.
const DROP_SET = /\s*\+\s*max$/i;

export default function CampoReps({ valore, onChange, id, etichetta }: { valore: string; onChange: (v: string) => void; id?: string; etichetta?: string }) {
  const testo = valore.trim();
  const eMax = /^max$/i.test(testo);
  const conPiuMax = DROP_SET.test(testo) && !eMax;
  const base = conPiuMax ? testo.replace(DROP_SET, '') : valore; // quello che si vede nel campo
  const haNumero = testo !== '' && !eMax;
  return (
    // Il bottone sta DENTRO il campo (a destra), così funziona anche nelle colonne strette del telefono.
    <div className="relative">
      <input
        id={id}
        aria-label={etichetta}
        className="input pr-14"
        type="text"
        // Niente tastierino numerico: sul telefono non ha il trattino per scrivere "6-9".
        placeholder={tr('10 o 6-9', '10 or 6-9')}
        value={eMax ? 'Max' : base}
        onChange={(e) => {
          const nuovo = e.target.value;
          // Se il drop set era acceso resta acceso (a meno che il campo venga svuotato o diventi "Max").
          onChange(conPiuMax && nuovo.trim() && !/^max$/i.test(nuovo.trim()) && !DROP_SET.test(nuovo) ? `${nuovo.trim()} + max` : nuovo);
        }}
      />
      <button
        type="button"
        aria-pressed={haNumero ? conPiuMax : eMax}
        title={haNumero ? tr('Drop set: + max dopo le ripetizioni', 'Drop set: + max after the reps') : tr('Ripetizioni massime (a cedimento)', 'Max reps (to failure)')}
        className={`absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg px-2 text-[11px] font-bold transition ${
          (haNumero ? conPiuMax : eMax) ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted hover:text-ink'
        }`}
        onClick={() => {
          if (!haNumero) onChange(eMax ? '' : 'Max');
          else onChange(conPiuMax ? testo.replace(DROP_SET, '') : `${testo} + max`);
        }}
      >
        {haNumero ? '+max' : 'Max'}
      </button>
    </div>
  );
}
