import { useId, useRef } from 'react';
import { tr } from './lingua';
import { RP_MAX, RP_MIN, RP_PREDEFINITO } from './serie';

// Campo ripetizioni, uguale per trainer e per chi si allena da solo.
// Si scrive "10" o "6-9". Il bottone dentro il campo:
// - campo vuoto → "Max" (a cedimento);
// - con le ripetizioni scritte passa da: niente → "+max" (drop set) → "+rp" (rest-pause) → niente;
// - con "Max": "+rp" (rest-pause dopo il cedimento) → di nuovo vuoto.
// Il campo mostra solo le ripetizioni ("6-9"): la tecnica si vede dal bottone evidenziato.
// Con il rest-pause compare sotto la pausa in secondi, che decide chi scrive la scheda.
// Cluster: si scrivono le mini-serie uguali con il "+" ("5+5+5+5"): il bottone diventa "Cluster"
// e sotto compare la pausa tra le mini-serie (di base 15 s). Si salva come "5+5+5+5 + pausa 10".
const SUFFISSO = /\s*\+\s*(max|(?:rp|pausa)\s*(\d+)?\s*s?)\s*$/i;
const CLUSTER = /^\d+(\s*\+\s*\d+)+$/;
const eCluster = (testo: string) => CLUSTER.test(testo.trim());

function scomponi(valore: string) {
  const testo = valore.trim();
  const m = testo.match(SUFFISSO);
  const base = m ? testo.slice(0, m.index).trim() : valore;
  const tecnica: 'max' | 'rp' | null = m ? (/^max/i.test(m[1]) ? 'max' : 'rp') : null;
  // Pausa scritta (vuota = si userà quella predefinita, 15 s): così si può cancellare e riscrivere.
  const rp = m && tecnica === 'rp' ? (m[2] ?? '') : '';
  return { base, tecnica, rp };
}

const unisci = (base: string, tecnica: 'max' | 'rp' | null, rp: string) =>
  tecnica === 'max'
    ? `${base.trim()} + max`
    : tecnica === 'rp'
      ? `${base.trim()} + ${eCluster(base) ? 'pausa' : 'rp'} ${rp.trim()}`
      : base;

export default function CampoReps({ valore, onChange, id, etichetta }: { valore: string; onChange: (v: string) => void; id?: string; etichetta?: string }) {
  const idRp = useId();
  const { base, tecnica, rp } = scomponi(valore);
  const eMax = /^max$/i.test(base.trim());
  const vuoto = base.trim() === '';
  const cluster = eCluster(base);
  // Pausa del cluster scritta: resta anche mentre si cambia il numero di mini-serie ("5+5+" → "5+5+5")
  const pausaCluster = useRef('');
  if (cluster && tecnica === 'rp') pausaCluster.current = rp;

  function tocca() {
    if (cluster) return; // nel cluster la tecnica è già il cluster: si cambia scrivendo le reps
    if (vuoto) return onChange('Max');
    if (eMax) return onChange(tecnica === 'rp' ? '' : unisci('Max', 'rp', String(RP_PREDEFINITO)));
    if (tecnica === null) return onChange(unisci(base, 'max', ''));
    if (tecnica === 'max') return onChange(unisci(base, 'rp', String(RP_PREDEFINITO)));
    return onChange(base.trim());
  }

  // Evidenziato quando qualcosa è acceso: "Max", "+max" o "+rp".
  const acceso = tecnica !== null || eMax || cluster;
  const etichettaBottone = cluster ? 'Cluster' : vuoto ? 'Max' : tecnica === 'rp' ? '+rp' : tecnica === 'max' ? '+max' : eMax ? 'Max' : '+max';
  const titolo = cluster
    ? tr('Cluster: mini-serie uguali con una breve pausa tra una e l’altra. Sotto scegli la pausa.', 'Cluster: equal mini-sets with a short break in between. Choose the break below.')
    : vuoto
    ? tr('Ripetizioni massime (a cedimento)', 'Max reps (to failure)')
    : tr('Tecnica finale: + max (drop set) oppure + rp (rest-pause). Tocca per cambiare.', 'Finishing technique: + max (drop set) or + rp (rest-pause). Tap to change.');

  return (
    <div className="space-y-1.5">
      {/* Il bottone sta DENTRO il campo (a destra), così funziona anche nelle colonne strette del telefono. */}
      <div className="relative">
        <input
          id={id}
          aria-label={etichetta}
          className="input pr-14"
          type="text"
          // Niente tastierino numerico: sul telefono non ha il trattino per scrivere "6-9".
          placeholder={tr('10, 6-9 o 5+5+5', '10, 6-9 or 5+5+5')}
          value={eMax ? 'Max' : base}
          onChange={(e) => {
            const nuovo = e.target.value;
            // Chi scrive a mano "+ max" o "+ rp 20" lo può fare; altrimenti la tecnica scelta resta.
            if (SUFFISSO.test(nuovo) || !nuovo.trim() || /^max$/i.test(nuovo.trim())) onChange(nuovo);
            // "5+5+5+5": cluster, con la sua pausa (vuota = 15 s)
            else if (eCluster(nuovo)) onChange(unisci(nuovo, 'rp', tecnica === 'rp' ? rp : pausaCluster.current));
            // a metà ("5+5+") o tolto il cluster ("5"): così com'è, senza diventare un rest-pause per sbaglio
            else if (/\+\s*$/.test(nuovo) || cluster) onChange(nuovo);
            else onChange(unisci(nuovo, tecnica, rp));
          }}
        />
        <button
          type="button"
          aria-pressed={acceso}
          title={titolo}
          className={`absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg px-2 text-[11px] font-bold transition ${
            acceso ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted hover:text-ink'
          }`}
          onClick={tocca}
        >
          {etichettaBottone}
        </button>
      </div>
      {tecnica === 'rp' && (
        <div
          className="flex items-center gap-1.5 whitespace-nowrap"
          title={
            cluster
              ? tr(`Pausa tra le mini-serie: da ${RP_MIN} a ${RP_MAX} secondi`, `Break between mini-sets: ${RP_MIN} to ${RP_MAX} seconds`)
              : tr(`Pausa del rest-pause: da ${RP_MIN} a ${RP_MAX} secondi`, `Rest-pause break: ${RP_MIN} to ${RP_MAX} seconds`)
          }
        >
          <label htmlFor={idRp} className="text-xs font-semibold text-muted">{cluster ? tr('Pausa', 'Break') : tr('Pausa rp', 'RP break')}</label>
          <input
            id={idRp}
            className="input h-9 w-14 px-1 text-center tabular-nums"
            inputMode="numeric"
            maxLength={3}
            placeholder={String(RP_PREDEFINITO)}
            value={rp}
            onChange={(e) => onChange(unisci(base, 'rp', e.target.value.replace(/\D/g, '')))}
          />
          <span className="text-xs text-muted">s</span>
        </div>
      )}
    </div>
  );
}
