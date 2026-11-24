import { tr } from './lingua';

// Cluster a totale: peso da N RM, a cedimento, poi pause brevi finché la somma arriva al totale.
// Il cliente tocca quante ripetizioni ha fatto in ogni mini-serie; a ogni tocco parte la pausa.
// Si registra una sola serie (reps = totale, nota = "12+5+4+3+3+3") quando il totale è raggiunto.
export function PannelloClusterTotale({
  esId,
  rm,
  totale,
  pausa,
  mini,
  volteScorsa,
  occupato,
  onMini,
  onAnnulla,
}: {
  esId: number;
  rm: number; // il peso è da rm ripetizioni massime: la prima mini-serie di solito è lì
  totale: number;
  pausa: number;
  mini: number[]; // mini-serie già fatte in questa serie
  volteScorsa: { mini: number[]; peso: number } | null; // stessa serie, ultimo allenamento
  occupato: boolean; // salvataggio in corso
  onMini: (n: number) => void;
  onAnnulla: () => void;
}) {
  const fatte = mini.reduce((a, b) => a + b, 0);
  const mancano = Math.max(0, totale - fatte);
  const prima = mini.length === 0;
  // Bottoni: mai oltre quelle che mancano. Prima mini-serie: intorno alle RM; poi da 1 a 10.
  const massimo = Math.min(mancano, prima ? rm + 4 : 10);
  const numeri = Array.from({ length: massimo }, (_, i) => i + 1);
  // Se mancano più reps dei bottoni ma poche, un bottone apposta per chiudere.
  const chiudiApparte = mancano > massimo && mancano <= 15 && !prima;
  const fantasma = volteScorsa?.mini[mini.length];

  return (
    <div className="space-y-3 rounded-2xl border border-accent-strong/50 bg-accent-soft p-4" data-cluster-totale={esId}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">
          {tr('Fatte', 'Done')} <span className="text-2xl font-black tabular-nums text-accent-strong">{fatte}</span>{' '}
          <span className="tabular-nums text-muted">{tr(`di ${totale}`, `of ${totale}`)}</span>
        </p>
        <p className="text-sm font-bold tabular-nums text-soft">{mancano > 0 ? tr(`ne mancano ${mancano}`, `${mancano} to go`) : tr('fatto!', 'done!')}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.min(100, (fatte / totale) * 100)}%` }} />
      </div>

      {(mini.length > 0 || volteScorsa) && (
        <div className="space-y-1.5 text-sm">
          {mini.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5" aria-label={tr(`Mini-serie di oggi: ${mini.join(', ')}`, `Today's mini-sets: ${mini.join(', ')}`)}>
              <span className="text-xs font-semibold text-muted">{tr('Oggi', 'Today')}</span>
              {mini.map((n, i) => (
                <span key={i} className="rounded-lg bg-accent px-2 py-0.5 font-black tabular-nums text-accent-ink">
                  {n}
                </span>
              ))}
            </p>
          )}
          {volteScorsa && (
            <p className="flex flex-wrap items-center gap-1.5 text-muted">
              <span className="text-xs font-semibold">{tr('La volta scorsa', 'Last time')}</span>
              {volteScorsa.mini.map((n, i) => (
                <span key={i} className={`rounded-lg border px-2 py-0.5 font-bold tabular-nums ${i === mini.length ? 'border-accent-strong text-accent-strong' : 'border-line'}`}>
                  {n}
                </span>
              ))}
              <span className="text-xs">
                · {volteScorsa.peso} kg · {tr(`${volteScorsa.mini.length} mini-serie`, `${volteScorsa.mini.length} mini-sets`)}
              </span>
            </p>
          )}
        </div>
      )}

      <p className="text-sm font-semibold text-ink">
        {prima
          ? tr(`Prima mini-serie a cedimento: quante ne hai fatte? (di solito circa ${rm})`, `First mini-set to failure: how many did you do? (usually about ${rm})`)
          : tr(`Mini-serie ${mini.length + 1}: quante ne hai fatte?`, `Mini-set ${mini.length + 1}: how many reps?`)}
        {fantasma != null && !prima && <span className="font-normal text-muted"> {tr(`(la volta scorsa ${fantasma})`, `(last time ${fantasma})`)}</span>}
      </p>
      <div data-numeri className="grid grid-cols-6 gap-2 min-[400px]:grid-cols-8">
        {numeri.map((n) => {
          const chiude = n === mancano;
          const consigliato = prima && n === Math.min(rm, mancano);
          return (
            <button
              key={n}
              type="button"
              disabled={occupato}
              onClick={() => onMini(n)}
              aria-label={chiude ? tr(`${n}: chiudi il cluster`, `${n}: finish the cluster`) : String(n)}
              className={`min-h-12 rounded-xl text-lg font-black tabular-nums transition-colors disabled:opacity-50 ${
                chiude
                  ? 'bg-success text-white shadow-sm'
                  : consigliato
                    ? 'bg-accent text-accent-ink ring-2 ring-accent-strong ring-offset-2 ring-offset-[var(--color-accent-soft)]'
                    : 'border border-line bg-surface text-ink hover:border-accent-strong'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {chiudiApparte && (
        <button type="button" disabled={occupato} className="min-h-12 w-full rounded-xl bg-success text-base font-black text-white disabled:opacity-50" onClick={() => onMini(mancano)}>
          {tr(`Ne mancano ${mancano}: chiudi!`, `${mancano} to go: finish!`)}
        </button>
      )}
      {mancano <= massimo && mancano > 0 && !chiudiApparte && (
        <p className="text-xs text-success">{tr(`Il bottone verde (${mancano}) chiude il cluster e registra la serie.`, `The green button (${mancano}) finishes the cluster and logs the set.`)}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-snug text-muted">{tr(`A ogni tocco parte la pausa da ${pausa}s, stesso peso.`, `Each tap starts a ${pausa}s break, same weight.`)}</p>
        {mini.length > 0 && (
          <button type="button" className="btn-ghost min-h-11 shrink-0 text-sm" disabled={occupato} onClick={onAnnulla}>
            {tr(`Annulla l'ultima (${mini[mini.length - 1]})`, `Undo last (${mini[mini.length - 1]})`)}
          </button>
        )}
      </div>
    </div>
  );
}
