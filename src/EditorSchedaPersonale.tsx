import { useId, useState } from 'react';
import { aggiornaScheda, creaScheda, Esercizio, Scheda } from './api';
import { leggiReps, testoReps } from './serie';
import { tr } from './lingua';
import CampoReps from './CampoReps';

// Editor semplice per chi si allena da solo: nome della scheda e, per ogni esercizio,
// serie, ripetizioni ("10", "8-12", "Max", "8-12 + max" o "8-12 + rp 15"), recupero, una nota facoltativa
// e, se servono, serie in più con valori propri (come può fare il trainer).
// Modificando una scheda già usata, gli esercizi mantengono il loro storico (stesso id);
// quelli tolti vengono archiviati dal server, non cancellati.

const RECUPERI = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240];
const MAX_SERIE_IN_PIU = 10;

// Una serie aggiunta dopo quelle normali, con ripetizioni, recupero e nota propri (es. drop set).
interface SerieInPiu {
  chiave: number;
  reps: string;
  recupero: number;
  nota: string;
}

interface Riga {
  chiave: number;
  originale?: Esercizio; // esercizio già salvato: serve a non perdere serie extra, video, collegamenti
  nome: string;
  serie: string;
  reps: string;
  recupero: number;
  nota: string;
  extra: SerieInPiu[];
}

let contatore = 0;
const nuovaRiga = (): Riga => ({ chiave: ++contatore, nome: '', serie: '3', reps: '10', recupero: 90, nota: '', extra: [] });
const daEsercizio = (e: Esercizio): Riga => ({
  chiave: ++contatore,
  originale: e,
  nome: e.nome,
  serie: String(e.serieTarget),
  reps: testoReps(e.repsTarget, e.repsMax, e.piuMax, e.rpSecondi),
  recupero: e.recuperoSecondi,
  nota: e.descrizione ?? '',
  extra: (e.serieExtra ?? []).map((x) => ({ chiave: ++contatore, reps: testoReps(x.reps, x.repsMax, x.piuMax, x.rpSecondi), recupero: x.recuperoSecondi, nota: x.nota ?? '' })),
});

// Corto, per stare nel menu anche sul telefono: 0 → "No", 45 → "45 s", 90 → "1:30", 120 → "2 min".
const testoRecupero = (s: number) => (s === 0 ? tr('No', 'None') : s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s / 60} min`);

export default function EditorSchedaPersonale({ scheda, onSalvata, onChiudi }: { scheda?: Scheda; onSalvata: () => void; onChiudi: () => void }) {
  const id = useId();
  const [nome, setNome] = useState(scheda?.nome ?? '');
  const [righe, setRighe] = useState<Riga[]>(scheda ? scheda.esercizi.map(daEsercizio) : [nuovaRiga()]);
  const [errore, setErrore] = useState('');
  const [inInvio, setInInvio] = useState(false);

  const cambia = (chiave: number, campi: Partial<Riga>) => setRighe((r) => r.map((x) => (x.chiave === chiave ? { ...x, ...campi } : x)));
  const cambiaExtra = (riga: Riga, chiave: number, campi: Partial<SerieInPiu>) =>
    cambia(riga.chiave, { extra: riga.extra.map((x) => (x.chiave === chiave ? { ...x, ...campi } : x)) });

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setErrore('');
    if (!nome.trim()) return setErrore(tr('Dai un nome alla scheda (es. "Giorno A" o "Gambe")', 'Give the programme a name (e.g. "Day A" or "Legs")'));
    const piene = righe.filter((r) => r.nome.trim());
    if (piene.length === 0) return setErrore(tr('Aggiungi almeno un esercizio', 'Add at least one exercise'));
    const esercizi = [];
    for (const [i, r] of piene.entries()) {
      const serie = Number(r.serie);
      const reps = leggiReps(r.reps);
      const etichetta = r.nome.trim() || tr(`Esercizio ${i + 1}`, `Exercise ${i + 1}`);
      if (!Number.isInteger(serie) || serie < 1 || serie > 20) return setErrore(tr(`${etichetta}: le serie vanno da 1 a 20`, `${etichetta}: sets go from 1 to 20`));
      if (!reps) return setErrore(tr(`${etichetta}: ripetizioni non valide (scrivi 10, 8-12, Max, 8-12 + max o 8-12 + rp 15; pausa rp tra 5 e 120 s)`, `${etichetta}: invalid reps (enter 10, 8-12, Max, 8-12 + max or 8-12 + rp 15; rp break between 5 and 120 s)`));
      const serieExtra = [];
      for (const [j, x] of r.extra.entries()) {
        const rx = leggiReps(x.reps);
        if (!rx) {
          return setErrore(
            tr(`${etichetta}, serie ${serie + j + 1}: ripetizioni non valide (scrivi 10, 8-12, Max, 8-12 + max o 8-12 + rp 15; pausa rp tra 5 e 120 s)`, `${etichetta}, set ${serie + j + 1}: invalid reps (enter 10, 8-12, Max, 8-12 + max or 8-12 + rp 15; rp break between 5 and 120 s)`),
          );
        }
        serieExtra.push({ reps: rx.reps, repsMax: rx.repsMax, piuMax: rx.piuMax, rpSecondi: rx.rpSecondi, recuperoSecondi: x.recupero, nota: x.nota.trim() || undefined });
      }
      const o = r.originale;
      esercizi.push({
        ...(o ? { id: o.id } : {}),
        nome: r.nome.trim(),
        serieTarget: serie,
        repsTarget: reps.reps,
        repsMax: reps.repsMax,
        piuMax: reps.piuMax,
        rpSecondi: reps.rpSecondi,
        recuperoSecondi: r.recupero,
        descrizione: r.nota.trim() || undefined,
        serieExtra,
        // Quello che questo editor non mostra resta com'era
        videoUrl: o?.videoUrl || undefined,
        collegamento: o?.collegamento ?? null,
      });
    }
    setInInvio(true);
    try {
      if (scheda) await aggiornaScheda(scheda.id, nome.trim(), undefined, esercizi as Parameters<typeof aggiornaScheda>[3]);
      else await creaScheda(nome.trim(), undefined, esercizi as Parameters<typeof creaScheda>[2]);
      onSalvata();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio, riprova', 'Error saving, try again'));
      setInInvio(false);
    }
  }

  return (
    <form onSubmit={salva} className="card space-y-5" noValidate aria-labelledby={`${id}-titolo`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">{scheda ? tr('Modifica scheda', 'Edit programme') : tr('Nuova scheda', 'New programme')}</p>
          <h2 id={`${id}-titolo`} className="text-2xl font-black uppercase tracking-tight">{nome.trim() || tr('La tua scheda', 'Your programme')}</h2>
        </div>
        <button type="button" className="btn-ghost shrink-0 px-3" onClick={onChiudi}>{tr('Chiudi', 'Close')}</button>
      </div>

      <div>
        <label htmlFor={`${id}-nome`} className="label">{tr('Nome della scheda', 'Programme name')}</label>
        <input id={`${id}-nome`} className="input" maxLength={100} placeholder={tr('Es. Giorno A, Gambe, Total body', 'E.g. Day A, Legs, Full body')} value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <ol className="space-y-3">
        {righe.map((r, i) => (
          <li key={r.chiave} className="space-y-3 rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-ink" aria-hidden="true">{i + 1}</span>
              <label htmlFor={`${id}-es-${r.chiave}`} className="sr-only">{tr(`Esercizio ${i + 1}`, `Exercise ${i + 1}`)}</label>
              <input
                id={`${id}-es-${r.chiave}`}
                className="input min-w-0 flex-1"
                maxLength={100}
                placeholder={tr('Esercizio (es. Squat)', 'Exercise (e.g. Squat)')}
                value={r.nome}
                onChange={(e) => cambia(r.chiave, { nome: e.target.value })}
              />
            </div>
            {/* Ripetizioni più larghe: ci deve stare anche "6-9 + max" con il suo bottone */}
            <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.6fr)_minmax(0,1.1fr)] gap-2">
              <div>
                <label htmlFor={`${id}-serie-${r.chiave}`} className="label">{tr('Serie', 'Sets')}</label>
                <input id={`${id}-serie-${r.chiave}`} className="input tabular-nums" inputMode="numeric" maxLength={2} value={r.serie} onChange={(e) => cambia(r.chiave, { serie: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`${id}-reps-${r.chiave}`} className="label">{tr('Ripetizioni', 'Reps')}</label>
                <CampoReps id={`${id}-reps-${r.chiave}`} valore={r.reps} onChange={(v) => cambia(r.chiave, { reps: v })} />
              </div>
              <div>
                <label htmlFor={`${id}-rec-${r.chiave}`} className="label">{tr('Recupero', 'Rest')}</label>
                <select id={`${id}-rec-${r.chiave}`} className="input px-2" value={r.recupero} onChange={(e) => cambia(r.chiave, { recupero: Number(e.target.value) })}>
                  {[...new Set([...RECUPERI, r.recupero])].sort((a, b) => a - b).map((s) => (
                    <option key={s} value={s}>{testoRecupero(s)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor={`${id}-nota-${r.chiave}`} className="label">{tr('Nota (facoltativa)', 'Note (optional)')}</label>
              <input id={`${id}-nota-${r.chiave}`} className="input" maxLength={1000} placeholder={tr('Es. scendi lento, 3 secondi', 'E.g. lower slowly, 3 seconds')} value={r.nota} onChange={(e) => cambia(r.chiave, { nota: e.target.value })} />
            </div>

            {/* Serie in più, dopo quelle normali, con valori propri (es. un drop set "8-12 + max") */}
            {r.extra.map((x, j) => {
              const numero = (Number(r.serie) || 0) + j + 1;
              return (
                <div key={x.chiave} className="space-y-2 rounded-lg border border-dashed border-accent-strong/60 bg-surface p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">+ {tr('Serie', 'Set')} {numero}</p>
                    <button type="button" className="btn-ghost min-h-8 px-2 text-xs text-danger" onClick={() => cambia(r.chiave, { extra: r.extra.filter((y) => y.chiave !== x.chiave) })}>
                      {tr('Togli', 'Remove')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`${id}-xreps-${x.chiave}`} className="label">{tr('Ripetizioni', 'Reps')}</label>
                      <CampoReps id={`${id}-xreps-${x.chiave}`} valore={x.reps} onChange={(v) => cambiaExtra(r, x.chiave, { reps: v })} />
                    </div>
                    <div>
                      <label htmlFor={`${id}-xrec-${x.chiave}`} className="label">{tr('Recupero', 'Rest')}</label>
                      <select id={`${id}-xrec-${x.chiave}`} className="input px-2" value={x.recupero} onChange={(e) => cambiaExtra(r, x.chiave, { recupero: Number(e.target.value) })}>
                        {[...new Set([...RECUPERI, x.recupero])].sort((a, b) => a - b).map((s) => (
                          <option key={s} value={s}>{testoRecupero(s)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${id}-xnota-${x.chiave}`} className="label">{tr('Nota (facoltativa)', 'Note (optional)')}</label>
                    <input id={`${id}-xnota-${x.chiave}`} className="input" maxLength={200} placeholder={tr('Es. drop set, fermo 2 secondi', 'E.g. drop set, 2-second pause')} value={x.nota} onChange={(e) => cambiaExtra(r, x.chiave, { nota: e.target.value })} />
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {r.extra.length < MAX_SERIE_IN_PIU ? (
                <button
                  type="button"
                  className="btn-ghost min-h-9 px-2 text-xs"
                  onClick={() => cambia(r.chiave, { extra: [...r.extra, { chiave: ++contatore, reps: r.reps, recupero: r.recupero, nota: '' }] })}
                >
                  {tr('+ Serie', '+ Set')}
                </button>
              ) : (
                <span />
              )}
              {righe.length > 1 && (
                <button type="button" className="btn-ghost min-h-9 px-2 text-xs text-danger" onClick={() => setRighe((x) => x.filter((y) => y.chiave !== r.chiave))}>
                  {tr('Togli esercizio', 'Remove exercise')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {righe.length < 30 && (
        <button type="button" className="btn-secondary w-full" onClick={() => setRighe((r) => [...r, nuovaRiga()])}>{tr('+ Aggiungi esercizio', '+ Add exercise')}</button>
      )}
      {scheda && (
        <p className="text-xs text-muted">{tr('Gli esercizi che togli spariscono dalla scheda, ma le serie che hai già registrato restano salvate.', 'Exercises you remove leave the programme, but the sets you already logged stay saved.')}</p>
      )}

      {errore && <p className="alert-error">{errore}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onChiudi}>{tr('Annulla', 'Cancel')}</button>
        <button type="submit" className="btn-primary" disabled={inInvio}>
          {inInvio ? tr('Salvo…', 'Saving…') : scheda ? tr('Salva modifiche', 'Save changes') : tr('Crea scheda', 'Create programme')}
        </button>
      </div>
    </form>
  );
}
