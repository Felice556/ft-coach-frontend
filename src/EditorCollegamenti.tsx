// Pezzi dell'editor per superset e jumpset, usati sia dal trainer sia da chi si allena da solo.
import type { TipoCollegamento } from './api';
import type { InfoGruppo } from './collegamenti';
import { tr } from './lingua';

// Etichetta del gruppo sulla card: "Superset", "Jumpset"… (la sigla A1/A2 è nel pallino accanto).
export function ChipGruppo({ g }: { g: InfoGruppo }) {
  return <span className="chip min-w-0 truncate bg-accent-soft text-accent-strong">{g.nome}</span>;
}

// Al posto del campo recupero, in un superset: tra i due esercizi non si riposa.
export function RecuperoAssente() {
  return (
    <p className="input flex items-center text-sm text-muted" aria-label={tr('Nessun recupero', 'No rest')}>
      {tr('Nessuno', 'None')}
    </p>
  );
}

// Cosa succede con il recupero di questo esercizio dentro il gruppo, in parole semplici.
export function spiegaRecupero(tipo: TipoCollegamento | '', g: InfoGruppo): string {
  const successivo = `${g.lettera}${g.posizione + 1}`;
  if (tipo === 'SUPERSET' && g.posizione < g.dimensione)
    return tr(`Dopo ogni serie si passa subito a ${successivo}, senza recupero.`, `After each set, move straight to ${successivo}, with no rest.`);
  if (tipo === 'JUMPSET' && g.posizione < g.dimensione)
    return tr(`Questo recupero si fa prima di passare a ${successivo}.`, `This rest is taken before moving to ${successivo}.`);
  return tr(
    `Fine giro: questo recupero si fa prima di ricominciare da ${g.lettera}1 (esercizio ${g.inizio + 1}).`,
    `End of round: this rest is taken before starting again from ${g.lettera}1 (exercise ${g.inizio + 1}).`,
  );
}

// Tra un esercizio e il successivo: collegali in superset o jumpset, oppure scollegali.
export function Collegamento({
  tipo,
  onCambia,
  numeroSuccessivo,
}: {
  tipo: TipoCollegamento | '';
  onCambia: (tipo: TipoCollegamento | '') => void;
  numeroSuccessivo: number;
}) {
  if (!tipo) {
    return (
      <div className="flex justify-center py-1.5">
        <button
          type="button"
          className="btn-ghost min-h-9 px-3 text-xs text-muted"
          onClick={() => onCambia('SUPERSET')}
        >
          {tr(`+ Collega con l’esercizio ${numeroSuccessivo}`, `+ Link with exercise ${numeroSuccessivo}`)}
        </button>
      </div>
    );
  }
  const opzione = (valore: TipoCollegamento, testo: string) => (
    <button
      type="button"
      aria-pressed={tipo === valore}
      className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${
        tipo === valore ? 'bg-accent text-accent-ink' : 'text-soft hover:text-ink'
      }`}
      onClick={() => onCambia(valore)}
    >
      {testo}
    </button>
  );
  return (
    <div className="relative flex justify-center py-1.5">
      {/* La linea verticale "lega" visivamente le due card */}
      <span aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-accent-strong/60" />
      <div
        role="group"
        aria-label={tr(`Collegamento con l’esercizio ${numeroSuccessivo}`, `Link with exercise ${numeroSuccessivo}`)}
        className="relative flex items-center gap-1 rounded-full border border-accent-strong/60 bg-surface p-1"
      >
        {opzione('SUPERSET', 'Superset')}
        {opzione('JUMPSET', 'Jumpset')}
        <button
          type="button"
          aria-label={tr('Scollega', 'Unlink')}
          className="min-h-9 rounded-full px-3 text-xs text-muted transition hover:text-danger"
          onClick={() => onCambia('')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
