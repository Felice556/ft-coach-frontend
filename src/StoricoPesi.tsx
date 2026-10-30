import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getStoricoPesi, SerieStorico } from './api';
import ProgressoChart from './ProgressoChart';
import { raggruppaPerEsercizio } from './raggruppaStorico';
import { normalizza } from './libreria';
import { locale, tr } from './lingua';

// Storico pesi generale: ogni esercizio con tutte le sue serie, su tutte le schede (anche vecchie).
// Si aggiunge allo storico della singola scheda, che resta com'è.
// Cliente: senza clienteId · Trainer: con il clienteId del cliente che sta guardando.

const kg = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
const dataCorta = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' });
const chiaveGiorno = (iso: string) => new Date(iso).toDateString();

export default function StoricoPesi({ clienteId, nomeCliente, onChiudi }: { clienteId?: number; nomeCliente?: string; onChiudi: () => void }) {
  const [serie, setSerie] = useState<SerieStorico[] | null>(null);
  const [errore, setErrore] = useState('');
  const [cerca, setCerca] = useState('');
  const [aperto, setAperto] = useState<string | null>(null);
  const [tuttiIGiorni, setTuttiIGiorni] = useState(false);

  useEffect(() => {
    getStoricoPesi(clienteId)
      .then(setSerie)
      .catch((err) => setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento dello storico', 'Error loading the history')));
  }, [clienteId]);

  // Chiusura con Esc e pagina sotto bloccata, come il pannello "Progressi".
  const chiudi = useRef(onChiudi);
  chiudi.current = onChiudi;
  useEffect(() => {
    const suEsc = (e: KeyboardEvent) => e.key === 'Escape' && chiudi.current();
    window.addEventListener('keydown', suEsc);
    const prima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', suEsc);
      document.body.style.overflow = prima;
    };
  }, []);

  const esercizi = useMemo(() => (serie ? raggruppaPerEsercizio(serie) : []), [serie]);
  const filtrati = esercizi.filter((e) => !cerca.trim() || e.chiave.includes(normalizza(cerca).replace(/\s+/g, ' ')));

  // Portal su <body>: così il pannello copre anche la barra in basso, qualunque sia la pagina che lo apre.
  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg" role="dialog" aria-modal="true" aria-labelledby="storico-pesi-titolo">
      <div className="sticky top-0 z-10 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow">{tr('Tutte le schede', 'All programmes')}{nomeCliente ? ` · ${nomeCliente}` : ''}</p>
            <h2 id="storico-pesi-titolo" className="truncate text-lg font-extrabold uppercase tracking-tight">{tr('Storico pesi', 'Weight history')}</h2>
          </div>
          <button type="button" className="btn-secondary shrink-0 px-4" onClick={onChiudi}>
            {tr('Chiudi', 'Close')}
          </button>
        </div>
        {esercizi.length > 5 && (
          <div className="mx-auto max-w-4xl px-4 pb-3 sm:px-6">
            <label htmlFor="storico-pesi-cerca" className="sr-only">{tr('Cerca un esercizio', 'Search an exercise')}</label>
            <input id="storico-pesi-cerca" className="input" type="search" placeholder={tr('Cerca un esercizio (es. panca)', 'Search an exercise (e.g. bench)')} value={cerca} onChange={(e) => setCerca(e.target.value)} />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-4xl space-y-3 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
        {errore && <p className="alert-error">{errore}</p>}
        {!serie && !errore && <p className="py-10 text-center text-muted">{tr('Carico lo storico…', 'Loading the history…')}</p>}
        {serie && esercizi.length === 0 && (
          <p className="empty-state">{tr('Nessuna serie registrata finora: lo storico si riempie man mano che ti alleni.', 'No sets logged yet: the history fills up as you train.')}</p>
        )}
        {serie && esercizi.length > 0 && (
          <p className="text-sm text-muted">
            {tr(
              'Ogni esercizio con tutte le serie di tutte le schede, anche quelle vecchie: gli esercizi con lo stesso nome sono messi insieme.',
              'Each exercise with all sets from every programme, old ones included: exercises with the same name are grouped together.',
            )}
          </p>
        )}
        {cerca.trim() && filtrati.length === 0 && <p className="text-sm text-muted">{tr('Nessun esercizio trovato.', 'No exercise found.')}</p>}

        {filtrati.map((e) => {
          const apri = aperto === e.chiave;
          // giorni dal più recente, con le serie di quel giorno
          const perGiorno = new Map<string, SerieStorico[]>();
          for (const s of e.serie) perGiorno.set(chiaveGiorno(s.data), [...(perGiorno.get(chiaveGiorno(s.data)) ?? []), s]);
          const elenco = [...perGiorno.values()].reverse();
          const mostrati = tuttiIGiorni ? elenco : elenco.slice(0, 6);
          return (
            <article key={e.chiave} className="card">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-expanded={apri}
                onClick={() => {
                  setAperto(apri ? null : e.chiave);
                  setTuttiIGiorni(false);
                }}
              >
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold tracking-tight break-words">{e.nome}</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    {tr('Record', 'Best')}: <span className="font-bold text-ink">{kg(e.record.pesoUsato)} kg × {e.record.repsFatte}</span> · {e.giorni}{' '}
                    {e.giorni === 1 ? tr('allenamento', 'workout') : tr('allenamenti', 'workouts')} · {tr('ultima volta', 'last time')} {dataCorta(e.ultimaData)}
                  </p>
                  {e.schede.length > 1 && (
                    <p className="mt-0.5 text-xs text-soft">{tr(`In ${e.schede.length} schede`, `In ${e.schede.length} programmes`)}: {e.schede.join(' · ')}</p>
                  )}
                </div>
                <span className="mt-1 shrink-0 text-muted" aria-hidden>{apri ? '▴' : '▾'}</span>
              </button>
              {apri && (
                <div className="mt-4 space-y-4">
                  <ProgressoChart storico={e.serie} />
                  <ul className="divide-y divide-line">
                    {mostrati.map((giorno) => (
                      <li key={giorno[0].id} className="space-y-1.5 py-3">
                        <p className="text-xs font-bold tracking-wide text-muted uppercase">
                          {dataCorta(giorno[0].data)} · <span className="normal-case">{giorno[0].nomeScheda}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {giorno.map((s, i) => (
                            <span key={s.id} className="rounded-md bg-surface-2 px-2 py-1 text-sm tabular-nums">
                              <span className="text-muted">{i + 1}.</span> <span className="font-bold">{kg(s.pesoUsato)} kg</span>
                              <span className="text-muted"> × {s.repsFatte}</span>
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {elenco.length > 6 && (
                    <button type="button" className="btn-link text-sm" onClick={() => setTuttiIGiorni((v) => !v)}>
                      {tuttiIGiorni ? tr('Mostra meno', 'Show less') : tr(`Mostra tutti i ${elenco.length} allenamenti`, `Show all ${elenco.length} workouts`)}
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
