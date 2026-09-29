import { useEffect, useMemo, useState } from 'react';
import { getStoricoScheda, RegistroAllenamento, StoricoScheda } from './api';
import ProgressoChart from './ProgressoChart';
import { riassuntoSerie } from './serie';

// Pannello del trainer: tutti i dati che il cliente ha registrato su una scheda.
// Due viste: "Per esercizio" (grafico + storico, come lo vede il cliente) e
// "Per allenamento" (giorno per giorno: cosa ha fatto, serie per serie).

type Vista = 'esercizi' | 'allenamenti';

interface Props {
  schedaId: number;
  vistaIniziale?: Vista;
  giornoIniziale?: string; // data (ISO) di un allenamento da aprire subito
  onChiudi: () => void;
}

const chiaveGiorno = (iso: string) => new Date(iso).toDateString();
const dataLunga = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dataCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' });
const kg = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 2 });

// Serie di un giorno come "60 kg × 8 · 62,5 kg × 6"
function Serie({ serie }: { serie: RegistroAllenamento[] }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {serie.map((s, i) => (
          <span key={s.id} className="rounded-md bg-surface-2 px-2 py-1 text-sm tabular-nums">
            <span className="text-muted">{i + 1}.</span> <span className="font-bold">{kg(s.pesoUsato)} kg</span>
            <span className="text-muted"> × {s.repsFatte}</span>
          </span>
        ))}
      </div>
      {serie
        .filter((s) => s.nota)
        .map((s) => (
          <p key={s.id} className="text-sm text-soft italic">“{s.nota}”</p>
        ))}
    </div>
  );
}

export default function StoricoCliente({ schedaId, vistaIniziale = 'esercizi', giornoIniziale, onChiudi }: Props) {
  const [dati, setDati] = useState<StoricoScheda | null>(null);
  const [errore, setErrore] = useState('');
  const [vista, setVista] = useState<Vista>(vistaIniziale);
  const [giornoAperto, setGiornoAperto] = useState<string | null>(giornoIniziale ? chiaveGiorno(giornoIniziale) : null);
  const [tuttiIGiorni, setTuttiIGiorni] = useState<Record<number, boolean>>({});

  useEffect(() => {
    getStoricoScheda(schedaId)
      .then(setDati)
      .catch((err) => setErrore(err instanceof Error ? err.message : 'Errore nel caricamento dello storico'));
  }, [schedaId]);

  // Chiusura con Esc (da computer) e pagina sotto bloccata mentre il pannello è aperto.
  useEffect(() => {
    const suEsc = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi();
    window.addEventListener('keydown', suEsc);
    const prima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', suEsc);
      document.body.style.overflow = prima;
    };
  }, [onChiudi]);

  // Vista "per allenamento": un elemento per giorno, dal più recente, con gli esercizi di quel giorno.
  const giorni = useMemo(() => {
    if (!dati) return [];
    const mappa = new Map<string, { data: string; esercizi: { nome: string; serie: RegistroAllenamento[] }[] }>();
    for (const es of dati.esercizi) {
      for (const r of es.registri) {
        const k = chiaveGiorno(r.data);
        if (!mappa.has(k)) mappa.set(k, { data: r.data, esercizi: [] });
        const giorno = mappa.get(k)!;
        let voce = giorno.esercizi.find((x) => x.nome === es.nome);
        if (!voce) {
          voce = { nome: es.nome, serie: [] };
          giorno.esercizi.push(voce);
        }
        voce.serie.push(r);
      }
    }
    return [...mappa.entries()]
      .map(([chiave, g]) => {
        const tutte = g.esercizi.flatMap((e) => e.serie);
        return {
          chiave,
          ...g,
          numeroSerie: tutte.length,
          volume: tutte.reduce((acc, s) => acc + s.pesoUsato * s.repsFatte, 0),
        };
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [dati]);

  // Se si arriva da un allenamento, apriamo quel giorno; altrimenti il più recente.
  useEffect(() => {
    if (giorni.length && giornoAperto === null) setGiornoAperto(giorni[0].chiave);
  }, [giorni, giornoAperto]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg" role="dialog" aria-modal="true" aria-labelledby="storico-titolo">
      <div className="sticky top-0 z-10 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow">Progressi{dati ? ` · ${dati.cliente.nome}` : ''}</p>
            <h2 id="storico-titolo" className="truncate text-lg font-extrabold uppercase tracking-tight">
              {dati?.nome ?? 'Caricamento…'}
            </h2>
          </div>
          <button type="button" className="btn-secondary shrink-0 px-4" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
        <div className="mx-auto flex max-w-4xl gap-2 px-4 pb-3 sm:px-6" role="tablist">
          {(
            [
              ['esercizi', 'Per esercizio'],
              ['allenamenti', 'Per allenamento'],
            ] as [Vista, string][]
          ).map(([v, testo]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={`min-h-11 flex-1 rounded-xl border px-3 text-sm font-bold transition-colors ${
                vista === v ? 'border-accent-strong bg-accent text-accent-ink' : 'border-line bg-field text-ink hover:border-accent-strong'
              }`}
            >
              {testo}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
        {errore && <p className="alert-error">{errore}</p>}
        {!dati && !errore && <p className="py-10 text-center text-muted">Carico i dati del cliente…</p>}
        {dati && giorni.length === 0 && (
          <p className="empty-state">{dati.cliente.nome} non ha ancora registrato serie su questa scheda.</p>
        )}

        {/* ---------- Per esercizio ---------- */}
        {dati && giorni.length > 0 && vista === 'esercizi' &&
          dati.esercizi.map((es) => {
            // giorni di questo esercizio, dal più recente
            const perGiorno = new Map<string, RegistroAllenamento[]>();
            for (const r of es.registri) {
              const k = chiaveGiorno(r.data);
              perGiorno.set(k, [...(perGiorno.get(k) || []), r]);
            }
            const elenco = [...perGiorno.values()].reverse();
            const mostrati = tuttiIGiorni[es.id] ? elenco : elenco.slice(0, 6);
            const migliore = es.registri.reduce<RegistroAllenamento | null>((m, r) => (!m || r.pesoUsato > m.pesoUsato ? r : m), null);
            return (
              <article key={es.id} className="card space-y-4">
                <header>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-extrabold tracking-tight">{es.nome}</h3>
                    {es.archiviatoIl && (
                      <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">tolto dalla scheda</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-soft">Programma: {riassuntoSerie(es)}</p>
                  {migliore && (
                    <p className="mt-1 text-sm text-muted">
                      Record: <span className="font-bold text-ink">{kg(migliore.pesoUsato)} kg × {migliore.repsFatte}</span> ·{' '}
                      {dataCorta(migliore.data)} · {perGiorno.size} {perGiorno.size === 1 ? 'allenamento' : 'allenamenti'}
                    </p>
                  )}
                </header>
                {es.registri.length === 0 ? (
                  <p className="text-sm text-muted">Nessuna serie registrata.</p>
                ) : (
                  <>
                    <ProgressoChart storico={es.registri} titolo={`Progressi di ${dati.cliente.nome}`} />
                    <ul className="divide-y divide-line">
                      {mostrati.map((serie) => (
                        <li key={serie[0].id} className="space-y-2 py-3">
                          <p className="text-xs font-bold tracking-wide text-muted uppercase">{dataCorta(serie[0].data)}</p>
                          <Serie serie={serie} />
                        </li>
                      ))}
                    </ul>
                    {elenco.length > 6 && (
                      <button
                        type="button"
                        className="btn-link text-sm"
                        onClick={() => setTuttiIGiorni((p) => ({ ...p, [es.id]: !p[es.id] }))}
                      >
                        {tuttiIGiorni[es.id] ? 'Mostra meno' : `Mostra tutti i ${elenco.length} allenamenti`}
                      </button>
                    )}
                  </>
                )}
              </article>
            );
          })}

        {/* ---------- Per allenamento ---------- */}
        {dati && giorni.length > 0 && vista === 'allenamenti' && (
          <ul className="space-y-3">
            {giorni.map((g) => {
              const aperto = giornoAperto === g.chiave;
              return (
                <li key={g.chiave} className={`card p-0 ${aperto ? 'border-accent-strong' : ''}`}>
                  <button
                    type="button"
                    aria-expanded={aperto}
                    onClick={() => setGiornoAperto(aperto ? '' : g.chiave)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
                  >
                    <div className="min-w-0">
                      <p className="font-bold first-letter:uppercase">{dataLunga(g.data)}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {g.esercizi.length} {g.esercizi.length === 1 ? 'esercizio' : 'esercizi'} · {g.numeroSerie} serie ·{' '}
                        {Math.round(g.volume).toLocaleString('it-IT')} kg sollevati
                      </p>
                    </div>
                    <span aria-hidden className="text-muted">{aperto ? '▴' : '▾'}</span>
                  </button>
                  {aperto && (
                    <div className="space-y-4 border-t border-line p-4 sm:p-5">
                      {g.esercizi.map((e) => (
                        <div key={e.nome} className="space-y-2">
                          <p className="font-semibold">{e.nome}</p>
                          <Serie serie={e.serie} />
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
