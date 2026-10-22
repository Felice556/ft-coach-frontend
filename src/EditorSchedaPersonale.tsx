import { useId, useState } from 'react';
import { aggiornaScheda, creaScheda, Esercizio, Scheda } from './api';
import { leggiReps, testoReps } from './serie';
import { tr } from './lingua';

// Editor semplice per chi si allena da solo: nome della scheda e, per ogni esercizio,
// serie, ripetizioni ("10", "8-12" o "Max"), recupero e una nota facoltativa.
// Modificando una scheda già usata, gli esercizi mantengono il loro storico (stesso id);
// quelli tolti vengono archiviati dal server, non cancellati.

const RECUPERI = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240];

interface Riga {
  chiave: number;
  originale?: Esercizio; // esercizio già salvato: serve a non perdere serie extra, video, collegamenti
  nome: string;
  serie: string;
  reps: string;
  recupero: number;
  nota: string;
}

let contatore = 0;
const nuovaRiga = (): Riga => ({ chiave: ++contatore, nome: '', serie: '3', reps: '10', recupero: 90, nota: '' });
const daEsercizio = (e: Esercizio): Riga => ({
  chiave: ++contatore,
  originale: e,
  nome: e.nome,
  serie: String(e.serieTarget),
  reps: testoReps(e.repsTarget, e.repsMax),
  recupero: e.recuperoSecondi,
  nota: e.descrizione ?? '',
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
      if (!reps) return setErrore(tr(`${etichetta}: ripetizioni non valide (scrivi 10, 8-12 o Max)`, `${etichetta}: invalid reps (enter 10, 8-12 or Max)`));
      const o = r.originale;
      esercizi.push({
        ...(o ? { id: o.id } : {}),
        nome: r.nome.trim(),
        serieTarget: serie,
        repsTarget: reps.reps,
        repsMax: reps.repsMax,
        recuperoSecondi: r.recupero,
        descrizione: r.nota.trim() || undefined,
        // Quello che questo editor non mostra resta com'era
        videoUrl: o?.videoUrl || undefined,
        serieExtra: (o?.serieExtra ?? []).map((x) => ({ reps: x.reps, repsMax: x.repsMax ?? null, recuperoSecondi: x.recuperoSecondi, nota: x.nota || undefined })),
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
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor={`${id}-serie-${r.chiave}`} className="label">{tr('Serie', 'Sets')}</label>
                <input id={`${id}-serie-${r.chiave}`} className="input tabular-nums" inputMode="numeric" maxLength={2} value={r.serie} onChange={(e) => cambia(r.chiave, { serie: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`${id}-reps-${r.chiave}`} className="label">{tr('Ripetizioni', 'Reps')}</label>
                <input id={`${id}-reps-${r.chiave}`} className="input tabular-nums" maxLength={9} placeholder="10 · 8-12 · Max" value={r.reps} onChange={(e) => cambia(r.chiave, { reps: e.target.value })} />
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
            {righe.length > 1 && (
              <div className="flex justify-end">
                <button type="button" className="btn-ghost min-h-9 px-2 text-xs text-danger" onClick={() => setRighe((x) => x.filter((y) => y.chiave !== r.chiave))}>
                  {tr('Togli', 'Remove')}
                </button>
              </div>
            )}
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
