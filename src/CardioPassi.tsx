import { useEffect, useId, useState } from 'react';
import {
  CardioFatto,
  creaObiettivoCardio,
  DatiCardio,
  eliminaCardio,
  eliminaObiettivoCardio,
  getCardio,
  modificaObiettivoCardio,
  NuovoObiettivoCardio,
  ObiettivoCardio,
  salvaObiettivoPassi,
  salvaPassi,
  segnaCardio,
} from './api';
import { fatteQuestaSettimana, leggiKm, leggiPassi, mediaPassi, minutiQuestaSettimana, ultimi7Giorni } from './cardio-calcoli';
import { dataLunga, giornoDi, oggi } from './misure-formati';
import { locale, tr } from './lingua';

// Sezione "Cardio e passi", separata dalle schede di allenamento.
// - Il CLIENTE vede il piano cardio deciso dal trainer, segna il cardio fatto e i passi di ogni giorno.
// - Il TRAINER, scelto un cliente, decide il piano cardio e l'obiettivo di passi e vede cosa ha fatto.

type Ruolo = 'CLIENTE' | 'TRAINER';

const ATTIVITA_COMUNI = () => [
  tr('Camminata', 'Walking'),
  tr('Camminata in salita', 'Incline walking'),
  tr('Corsa', 'Running'),
  tr('Bici', 'Cycling'),
  tr('Cyclette', 'Exercise bike'),
  tr('Ellittica', 'Elliptical'),
  tr('Vogatore', 'Rowing machine'),
  tr('Stair climber', 'Stair climber'),
  tr('Nuoto', 'Swimming'),
  tr('Corda', 'Jump rope'),
  'HIIT',
];

const migliaia = (n: number) => n.toLocaleString(locale);
const km = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
const iniziale = (giorno: string) => new Date(`${giorno}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' });
const testoVolte = (n: number) => (n === 1 ? tr('1 volta a settimana', 'once a week') : tr(`${n} volte a settimana`, `${n} times a week`));

// Puntini dell'avanzamento settimanale: pieni quelli fatti, vuoti quelli che mancano.
function Puntini({ fatte, totale }: { fatte: number; totale: number }) {
  return (
    <span className="flex flex-wrap gap-1" aria-hidden="true">
      {Array.from({ length: Math.max(totale, fatte) }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < fatte ? (fatte >= totale ? 'bg-success' : 'bg-accent') : 'border border-line bg-surface-2'}`} />
      ))}
    </span>
  );
}

// ---------- Passi ----------

function SchedaPassi({ ruolo, clienteId, autonomo, dati, onCambiati }: { ruolo: Ruolo; clienteId?: number; autonomo?: boolean; dati: DatiCardio; onCambiati: (d: DatiCardio) => void }) {
  const id = useId();
  const oggiStr = oggi();
  const giorni = ultimi7Giorni(dati.passi, oggiStr);
  const diOggi = giorni[6].passi;
  const media = mediaPassi(giorni);
  const obiettivo = dati.obiettivoPassi;
  const massimo = Math.max(obiettivo ?? 0, ...giorni.map((g) => g.passi ?? 0), 1);

  // Cliente: passi di un giorno. Trainer: obiettivo.
  const [testo, setTesto] = useState('');
  const [giorno, setGiorno] = useState(oggiStr);
  const [testoObiettivo, setTestoObiettivo] = useState(obiettivo ? String(obiettivo) : '');
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const [salvato, setSalvato] = useState(false);

  function fatto() {
    setSalvato(true);
    setTimeout(() => setSalvato(false), 2500);
  }

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setErrore('');
    const passi = leggiPassi(testo);
    if (passi === null) {
      setErrore(tr('Scrivi i passi con un numero da 0 a 100.000', 'Enter your steps as a number from 0 to 100,000'));
      return;
    }
    if (!giorno || giorno > oggiStr) {
      setErrore(tr('Scegli una data non nel futuro', 'Choose a date that isn’t in the future'));
      return;
    }
    setInInvio(true);
    try {
      const riga = await salvaPassi(giorno, passi);
      const altri = dati.passi.filter((p) => giornoDi(p.data) !== giornoDi(riga.data));
      onCambiati({ ...dati, passi: [...altri, riga].sort((a, b) => a.data.localeCompare(b.data)) });
      setTesto('');
      setGiorno(oggiStr);
      fatto();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio, riprova', 'Error saving, try again'));
    } finally {
      setInInvio(false);
    }
  }

  async function salvaObiettivo(nuovo: number | null) {
    if (inInvio || (clienteId === undefined && !autonomo)) return;
    setErrore('');
    setInInvio(true);
    try {
      const r = await salvaObiettivoPassi(clienteId, nuovo);
      onCambiati({ ...dati, obiettivoPassi: r.obiettivoPassi });
      setTestoObiettivo(r.obiettivoPassi ? String(r.obiettivoPassi) : '');
      fatto();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio, riprova', 'Error saving, try again'));
    } finally {
      setInInvio(false);
    }
  }

  const giaInserito = ruolo === 'CLIENTE' ? dati.passi.find((p) => giornoDi(p.data) === giorno) : undefined;

  return (
    <article className="card space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight">{tr('Passi', 'Steps')}</h3>
          <p className="mt-1 text-3xl font-black tabular-nums">
            {diOggi !== null ? migliaia(diOggi) : '—'}
            {obiettivo && <span className="text-base font-semibold text-muted"> / {migliaia(obiettivo)}</span>}
          </p>
          <p className="text-xs text-muted">{tr('oggi', 'today')}</p>
        </div>
        <div className="text-right text-xs text-muted">
          <p>{tr('media 7 giorni', '7-day average')}</p>
          <p className="mt-0.5 text-base font-bold text-ink tabular-nums">{media !== null ? migliaia(media) : '—'}</p>
        </div>
      </header>

      {obiettivo && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={tr('Passi di oggi rispetto all’obiettivo', 'Today’s steps against the target')} aria-valuenow={diOggi ?? 0} aria-valuemin={0} aria-valuemax={obiettivo}>
          <div className={`h-full rounded-full ${diOggi !== null && diOggi >= obiettivo ? 'bg-success' : 'bg-accent'}`} style={{ width: `${Math.min(100, ((diOggi ?? 0) / obiettivo) * 100)}%` }} />
        </div>
      )}

      {/* Ultimi 7 giorni: una barra per giorno; verde se l'obiettivo è raggiunto */}
      <div>
        <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
          {giorni.map((g) => (
            <div key={g.giorno} className="flex h-full flex-1 flex-col justify-end">
              <div
                className={`w-full rounded-t-md ${g.passi === null ? 'bg-surface-2' : obiettivo && g.passi >= obiettivo ? 'bg-success' : 'bg-accent'}`}
                style={{ height: g.passi === null ? '4px' : `${Math.max(4, (g.passi / massimo) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1.5 text-center text-[11px] font-semibold text-muted uppercase" aria-hidden="true">
          {giorni.map((g) => (
            <span key={g.giorno} className={`flex-1 ${g.giorno === oggiStr ? 'text-ink' : ''}`}>{iniziale(g.giorno)}</span>
          ))}
        </div>
        <ul className="sr-only">
          {giorni.map((g) => (
            <li key={g.giorno}>{dataLunga(g.giorno)}: {g.passi !== null ? migliaia(g.passi) : tr('non inseriti', 'not entered')}</li>
          ))}
        </ul>
      </div>

      {ruolo === 'CLIENTE' && (
        <form onSubmit={salva} className="space-y-3" noValidate>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3">
            <div>
              <label htmlFor={`${id}-passi`} className="label">{tr('Passi fatti', 'Steps taken')}</label>
              <input id={`${id}-passi`} className="input tabular-nums" inputMode="numeric" autoComplete="off" maxLength={7} placeholder={tr('es. 8500', 'e.g. 8500')} value={testo} onChange={(e) => { setTesto(e.target.value); setErrore(''); }} />
            </div>
            <div>
              <label htmlFor={`${id}-giorno`} className="label">{tr('Giorno', 'Day')}</label>
              <input id={`${id}-giorno`} type="date" className="input min-w-0 px-3" value={giorno} max={oggiStr} onChange={(e) => setGiorno(e.target.value)} />
            </div>
          </div>
          {giaInserito && (
            <p className="text-xs text-muted">
              {tr(`Il ${dataLunga(giorno)} hai già ${migliaia(giaInserito.passi)} passi: salvando li correggi.`, `You already have ${migliaia(giaInserito.passi)} steps on ${dataLunga(giorno)}: saving will correct them.`)}
            </p>
          )}
          {errore && <p className="alert-error">{errore}</p>}
          <button type="submit" className="btn-primary min-h-12 w-full" disabled={inInvio}>
            {inInvio ? tr('Salvo…', 'Saving…') : salvato ? tr('Salvato ✓', 'Saved ✓') : giaInserito ? tr('Correggi', 'Correct') : tr('Salva passi', 'Save steps')}
          </button>
          <p className="text-xs text-muted">{tr('Li trovi nell’app Salute o del contapassi del telefono.', 'You’ll find them in your phone’s health or step-counter app.')}</p>
        </form>
      )}
      {/* L'obiettivo lo decide il trainer; chi si allena da solo se lo sceglie */}
      {(ruolo === 'TRAINER' || autonomo) && (
        <form
          className={`space-y-3 ${autonomo ? 'border-t border-line pt-4' : ''}`}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const n = leggiPassi(testoObiettivo);
            if (n === null || n < 1000 || n > 50000) {
              setErrore(tr('Obiettivo tra 1.000 e 50.000 passi', 'Target between 1,000 and 50,000 steps'));
              return;
            }
            salvaObiettivo(n);
          }}
        >
          <div>
            <label htmlFor={`${id}-obiettivo`} className="label">{tr('Obiettivo passi al giorno', 'Daily steps target')}</label>
            <div className="flex gap-2">
              <input id={`${id}-obiettivo`} className="input min-w-0 flex-1 tabular-nums" inputMode="numeric" autoComplete="off" maxLength={7} placeholder={tr('es. 8000', 'e.g. 8000')} value={testoObiettivo} onChange={(e) => { setTestoObiettivo(e.target.value); setErrore(''); }} />
              <button type="submit" className="btn-primary shrink-0 px-4" disabled={inInvio}>
                {inInvio ? '…' : salvato ? '✓' : tr('Salva', 'Save')}
              </button>
            </div>
          </div>
          {obiettivo && (
            <button type="button" className="btn-link text-sm" disabled={inInvio} onClick={() => salvaObiettivo(null)}>
              {tr('Togli l’obiettivo', 'Remove the target')}
            </button>
          )}
          {ruolo === 'TRAINER' && errore && <p className="alert-error">{errore}</p>}
          {ruolo === 'TRAINER' && <p className="text-xs text-muted">{tr('I passi li inserisce il cliente dalla sua app.', 'The client enters their steps from their app.')}</p>}
        </form>
      )}
    </article>
  );
}

// ---------- Piano cardio: modulo per aggiungere o modificare un'attività (trainer) ----------

function ModuloObiettivo({ iniziale: valori, onSalva, onAnnulla }: { iniziale?: ObiettivoCardio; onSalva: (d: NuovoObiettivoCardio) => Promise<void>; onAnnulla: () => void }) {
  const id = useId();
  const [attivita, setAttivita] = useState(valori?.attivita ?? '');
  const [minuti, setMinuti] = useState(valori ? String(valori.minuti) : '30');
  const [volte, setVolte] = useState(valori ? String(valori.volteSettimana) : '3');
  const [nota, setNota] = useState(valori?.nota ?? '');
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    const m = Number(minuti);
    const v = Number(volte);
    if (!attivita.trim()) return setErrore(tr('Scrivi l’attività', 'Enter the activity'));
    if (!Number.isInteger(m) || m < 1 || m > 600) return setErrore(tr('Minuti tra 1 e 600', 'Minutes between 1 and 600'));
    if (!Number.isInteger(v) || v < 1 || v > 14) return setErrore(tr('Da 1 a 14 volte a settimana', 'From 1 to 14 times a week'));
    setErrore('');
    setInInvio(true);
    try {
      await onSalva({ attivita: attivita.trim(), minuti: m, volteSettimana: v, nota: nota.trim() || undefined });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio, riprova', 'Error saving, try again'));
      setInInvio(false);
    }
  }

  return (
    <form onSubmit={invia} className="space-y-3 rounded-xl border border-accent-strong/40 bg-accent-soft p-3" noValidate>
      <div>
        <label htmlFor={`${id}-attivita`} className="label">{tr('Attività', 'Activity')}</label>
        <input id={`${id}-attivita`} className="input" list={`${id}-suggerimenti`} maxLength={60} placeholder={tr('es. Camminata in salita', 'e.g. Incline walking')} value={attivita} onChange={(e) => setAttivita(e.target.value)} />
        <datalist id={`${id}-suggerimenti`}>
          {ATTIVITA_COMUNI().map((a) => <option key={a} value={a} />)}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-minuti`} className="label">{tr('Minuti', 'Minutes')}</label>
          <input id={`${id}-minuti`} className="input tabular-nums" inputMode="numeric" maxLength={3} value={minuti} onChange={(e) => setMinuti(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-volte`} className="label">{tr('Volte a settimana', 'Times a week')}</label>
          <input id={`${id}-volte`} className="input tabular-nums" inputMode="numeric" maxLength={2} value={volte} onChange={(e) => setVolte(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-nota`} className="label">{tr('Nota (facoltativa)', 'Note (optional)')}</label>
        <input id={`${id}-nota`} className="input" maxLength={200} placeholder={tr('es. pendenza 8%, zona 2, a digiuno', 'e.g. 8% incline, zone 2, fasted')} value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>
      {errore && <p className="alert-error">{errore}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={onAnnulla} disabled={inInvio}>{tr('Annulla', 'Cancel')}</button>
        <button type="submit" className="btn-primary" disabled={inInvio}>{inInvio ? tr('Salvo…', 'Saving…') : tr('Salva', 'Save')}</button>
      </div>
    </form>
  );
}

// ---------- Cliente: segnare il cardio fatto ----------

function ModuloCardioFatto({ obiettivi, onSegnato }: { obiettivi: ObiettivoCardio[]; onSegnato: (s: CardioFatto) => void }) {
  const id = useId();
  const oggiStr = oggi();
  // "" = attività scritta a mano; altrimenti l'id dell'attività del piano.
  const [scelta, setScelta] = useState<string>(obiettivi[0] ? String(obiettivi[0].id) : '');
  const [attivita, setAttivita] = useState('');
  const [minuti, setMinuti] = useState(obiettivi[0] ? String(obiettivi[0].minuti) : '');
  const [distanza, setDistanza] = useState('');
  const [giorno, setGiorno] = useState(oggiStr);
  const [nota, setNota] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const [salvato, setSalvato] = useState(false);

  function cambiaScelta(valore: string) {
    setScelta(valore);
    const o = obiettivi.find((x) => String(x.id) === valore);
    if (o) setMinuti(String(o.minuti));
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    const o = obiettivi.find((x) => String(x.id) === scelta);
    const nome = o ? o.attivita : attivita.trim();
    const m = Number(minuti);
    const d = leggiKm(distanza);
    if (!nome) return setErrore(tr('Scrivi l’attività', 'Enter the activity'));
    if (!Number.isInteger(m) || m < 1 || m > 600) return setErrore(tr('Minuti tra 1 e 600', 'Minutes between 1 and 600'));
    if (d === undefined) return setErrore(tr('Distanza tra 0 e 300 km (es. 4,5)', 'Distance between 0 and 300 km (e.g. 4.5)'));
    if (!giorno || giorno > oggiStr) return setErrore(tr('Scegli una data non nel futuro', 'Choose a date that isn’t in the future'));
    setErrore('');
    setInInvio(true);
    try {
      const s = await segnaCardio({ attivita: nome, minuti: m, data: giorno, distanzaKm: d, nota: nota.trim() || undefined, obiettivoId: o?.id ?? null });
      onSegnato(s);
      setDistanza('');
      setNota('');
      setGiorno(oggiStr);
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio, riprova', 'Error saving, try again'));
    } finally {
      setInInvio(false);
    }
  }

  return (
    <form onSubmit={invia} className="space-y-3 border-t border-line pt-4" noValidate>
      <p className="font-bold">{tr('Segna il cardio fatto', 'Log cardio done')}</p>
      <div>
        <label htmlFor={`${id}-scelta`} className="label">{tr('Attività', 'Activity')}</label>
        {obiettivi.length > 0 && (
          <select id={`${id}-scelta`} className="input" value={scelta} onChange={(e) => cambiaScelta(e.target.value)}>
            {obiettivi.map((o) => (
              <option key={o.id} value={o.id}>{o.attivita}</option>
            ))}
            <option value="">{tr('Altra attività…', 'Another activity…')}</option>
          </select>
        )}
        {scelta === '' && (
          <>
            <input
              id={obiettivi.length === 0 ? `${id}-scelta` : undefined}
              aria-label={obiettivi.length > 0 ? tr('Nome dell’attività', 'Activity name') : undefined}
              className={`input ${obiettivi.length > 0 ? 'mt-2' : ''}`}
              list={`${id}-suggerimenti`}
              maxLength={60}
              placeholder={tr('es. Bici', 'e.g. Cycling')}
              value={attivita}
              onChange={(e) => setAttivita(e.target.value)}
            />
            <datalist id={`${id}-suggerimenti`}>
              {ATTIVITA_COMUNI().map((a) => <option key={a} value={a} />)}
            </datalist>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-minuti`} className="label">{tr('Minuti', 'Minutes')}</label>
          <input id={`${id}-minuti`} className="input tabular-nums" inputMode="numeric" maxLength={3} value={minuti} onChange={(e) => setMinuti(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-km`} className="label">{tr('Km (facoltativo)', 'Km (optional)')}</label>
          <input id={`${id}-km`} className="input tabular-nums" inputMode="decimal" maxLength={6} value={distanza} onChange={(e) => setDistanza(e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-giorno`} className="label">{tr('Giorno', 'Day')}</label>
        <input id={`${id}-giorno`} type="date" className="input min-w-0 px-3" value={giorno} max={oggiStr} onChange={(e) => setGiorno(e.target.value)} />
      </div>
      <div>
        <label htmlFor={`${id}-nota`} className="label">{tr('Nota per il trainer (facoltativa)', 'Note for your trainer (optional)')}</label>
        <input id={`${id}-nota`} className="input" maxLength={200} placeholder={tr('es. fatta a digiuno', 'e.g. done fasted')} value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>
      {errore && <p className="alert-error">{errore}</p>}
      <button type="submit" className="btn-primary min-h-12 w-full" disabled={inInvio}>
        {inInvio ? tr('Salvo…', 'Saving…') : salvato ? tr('Salvato ✓', 'Saved ✓') : tr('Salva cardio', 'Save cardio')}
      </button>
    </form>
  );
}

// Una sessione di cardio fatta, nell'elenco "Ultime sessioni".
function RigaSessione({ s, eliminabile, onElimina }: { s: CardioFatto; eliminabile: boolean; onElimina: () => Promise<void> }) {
  const [conferma, setConferma] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  useEffect(() => {
    if (!conferma) return;
    const t = setTimeout(() => setConferma(false), 4000);
    return () => clearTimeout(t);
  }, [conferma]);
  return (
    <li className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{s.attivita}</span>
          <span className="text-muted"> · {s.minuti} min{s.distanzaKm != null ? ` · ${km(s.distanzaKm)} km` : ''}</span>
        </p>
        <p className="text-xs text-muted">{dataLunga(giornoDi(s.data))}</p>
        {s.nota && <p className="mt-0.5 text-sm text-soft italic break-words">“{s.nota}”</p>}
      </div>
      {eliminabile && (
        <button
          type="button"
          disabled={inCorso}
          className={conferma ? 'btn-danger min-h-10 px-3 text-xs' : 'btn-ghost min-h-10 px-3 text-xs'}
          aria-label={conferma ? tr('Conferma eliminazione', 'Confirm deletion') : tr(`Elimina ${s.attivita} del ${dataLunga(giornoDi(s.data))}`, `Delete ${s.attivita} on ${dataLunga(giornoDi(s.data))}`)}
          onClick={async () => {
            if (!conferma) return setConferma(true);
            setInCorso(true);
            try {
              await onElimina();
            } finally {
              setInCorso(false);
              setConferma(false);
            }
          }}
        >
          {conferma ? tr('Sicuro?', 'Sure?') : tr('Elimina', 'Delete')}
        </button>
      )}
    </li>
  );
}

// ---------- Cardio: piano + sessioni ----------

function SchedaCardio({ ruolo, clienteId, autonomo, dati, onCambiati }: { ruolo: Ruolo; clienteId?: number; autonomo?: boolean; dati: DatiCardio; onCambiati: (d: DatiCardio) => void }) {
  // Il piano lo decide il trainer, oppure chi si allena da solo.
  const pianoMio = ruolo === 'TRAINER' || !!autonomo;
  const oggiStr = oggi();
  const [aggiungi, setAggiungi] = useState(false);
  const [inModifica, setInModifica] = useState<number | null>(null);
  const [daTogliere, setDaTogliere] = useState<number | null>(null);
  const [tutte, setTutte] = useState(false);
  const [errore, setErrore] = useState('');
  const minuti = minutiQuestaSettimana(dati.sessioni, oggiStr);
  const sessioniVisibili = tutte ? dati.sessioni : dati.sessioni.slice(0, 6);

  useEffect(() => {
    if (daTogliere === null) return;
    const t = setTimeout(() => setDaTogliere(null), 4000);
    return () => clearTimeout(t);
  }, [daTogliere]);

  async function togli(o: ObiettivoCardio) {
    if (daTogliere !== o.id) return setDaTogliere(o.id);
    setErrore('');
    try {
      await eliminaObiettivoCardio(o.id);
      onCambiati({
        ...dati,
        obiettivi: dati.obiettivi.filter((x) => x.id !== o.id),
        sessioni: dati.sessioni.map((s) => (s.obiettivoId === o.id ? { ...s, obiettivoId: null } : s)),
      });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setDaTogliere(null);
    }
  }

  return (
    <article className="card space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight">{tr('Cardio', 'Cardio')}</h3>
          <p className="mt-0.5 text-sm text-muted">{tr(`Questa settimana: ${minuti} min`, `This week: ${minuti} min`)}</p>
        </div>
        {pianoMio && !aggiungi && dati.obiettivi.length < 10 && (
          <button type="button" className="btn-secondary shrink-0 px-3 text-sm" onClick={() => { setAggiungi(true); setInModifica(null); }}>
            {tr('+ Attività', '+ Activity')}
          </button>
        )}
      </header>

      {/* Il piano: cosa fare ogni settimana, con l'avanzamento della settimana in corso */}
      {dati.obiettivi.length === 0 && !aggiungi && (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          {ruolo === 'TRAINER'
            ? tr('Nessuna attività nel piano. Tocca “+ Attività” per assegnare il cardio da fare.', 'No activities in the plan. Tap “+ Activity” to assign the cardio to do.')
            : autonomo
            ? tr('Nessuna attività nel piano. Tocca “+ Attività” per decidere il tuo cardio della settimana.', 'No activities in the plan. Tap “+ Activity” to set your weekly cardio.')
            : tr('Il tuo trainer non ti ha ancora assegnato del cardio: puoi comunque segnare quello che fai.', 'Your trainer hasn’t assigned you any cardio yet: you can still log what you do.')}
        </p>
      )}
      {dati.obiettivi.length > 0 && (
        <ul className="space-y-2">
          {dati.obiettivi.map((o) => {
            const fatte = fatteQuestaSettimana(dati.sessioni, o, oggiStr);
            if (inModifica === o.id) {
              return (
                <li key={o.id}>
                  <ModuloObiettivo
                    iniziale={o}
                    onAnnulla={() => setInModifica(null)}
                    onSalva={async (d) => {
                      const nuovo = await modificaObiettivoCardio(o.id, d);
                      onCambiati({ ...dati, obiettivi: dati.obiettivi.map((x) => (x.id === o.id ? nuovo : x)) });
                      setInModifica(null);
                    }}
                  />
                </li>
              );
            }
            return (
              <li key={o.id} className="rounded-xl border border-line bg-surface-2 px-3 py-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">{o.attivita}</p>
                    <p className="text-sm text-muted">{o.minuti} min · {testoVolte(o.volteSettimana)}</p>
                    {o.nota && <p className="mt-0.5 text-sm text-soft break-words">{o.nota}</p>}
                  </div>
                  {pianoMio && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" className="btn-ghost min-h-9 px-2 text-xs" onClick={() => { setInModifica(o.id); setAggiungi(false); }}>
                        {tr('Modifica', 'Edit')}
                      </button>
                      <button type="button" className={daTogliere === o.id ? 'btn-danger min-h-9 px-2 text-xs' : 'btn-ghost min-h-9 px-2 text-xs'} onClick={() => togli(o)}>
                        {daTogliere === o.id ? tr('Sicuro?', 'Sure?') : tr('Togli', 'Remove')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2" aria-label={tr(`${fatte} su ${o.volteSettimana} questa settimana`, `${fatte} of ${o.volteSettimana} this week`)}>
                  <Puntini fatte={fatte} totale={o.volteSettimana} />
                  <span className={`text-xs font-semibold tabular-nums ${fatte >= o.volteSettimana ? 'text-success' : 'text-muted'}`}>
                    {tr(`${fatte}/${o.volteSettimana} questa settimana`, `${fatte}/${o.volteSettimana} this week`)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {aggiungi && (clienteId !== undefined || autonomo) && (
        <ModuloObiettivo
          onAnnulla={() => setAggiungi(false)}
          onSalva={async (d) => {
            const nuovo = await creaObiettivoCardio(clienteId, d);
            onCambiati({ ...dati, obiettivi: [...dati.obiettivi, nuovo] });
            setAggiungi(false);
          }}
        />
      )}
      {errore && <p className="alert-error">{errore}</p>}

      {ruolo === 'CLIENTE' && (
        // key: ripartiamo da zero quando cambia il piano (così la prima attività è scelta già pronta)
        <ModuloCardioFatto
          key={dati.obiettivi.map((o) => o.id).join(',')}
          obiettivi={dati.obiettivi}
          onSegnato={(s) =>
            onCambiati({ ...dati, sessioni: [s, ...dati.sessioni].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id) })
          }
        />
      )}

      <div className="border-t border-line pt-4">
        <p className="label">{tr('Ultime sessioni', 'Latest sessions')}</p>
        {dati.sessioni.length === 0 ? (
          <p className="text-sm text-muted">
            {ruolo === 'TRAINER' ? tr('Il cliente non ha ancora segnato del cardio.', 'The client hasn’t logged any cardio yet.') : tr('Nessuna sessione ancora.', 'No sessions yet.')}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {sessioniVisibili.map((s) => (
                <RigaSessione
                  key={s.id}
                  s={s}
                  eliminabile={ruolo === 'CLIENTE'}
                  onElimina={async () => {
                    try {
                      await eliminaCardio(s.id);
                      onCambiati({ ...dati, sessioni: dati.sessioni.filter((x) => x.id !== s.id) });
                    } catch (err) {
                      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
                    }
                  }}
                />
              ))}
            </ul>
            {dati.sessioni.length > 6 && (
              <button type="button" className="btn-link mt-2 text-sm" onClick={() => setTutte(!tutte)}>
                {tutte ? tr('Mostra meno', 'Show less') : tr(`Mostra tutte (${dati.sessioni.length})`, `Show all (${dati.sessioni.length})`)}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

// autonomo: cliente che si allena da solo (decide anche il suo piano e l'obiettivo di passi).
export default function CardioPassi({ ruolo, clienteId, nomeCliente, autonomo }: { ruolo: Ruolo; clienteId?: number; nomeCliente?: string; autonomo?: boolean }) {
  const [dati, setDati] = useState<DatiCardio | null>(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    let annullato = false;
    setDati(null);
    setErrore('');
    getCardio(ruolo === 'TRAINER' ? clienteId : undefined)
      .then((d) => !annullato && setDati(d))
      .catch((err) => !annullato && setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento del cardio', 'Error loading cardio')));
    return () => {
      annullato = true;
    };
  }, [ruolo, clienteId]);

  return (
    <section id="cardio" className="scroll-mt-24 space-y-4" aria-labelledby="cardio-titolo">
      <div>
        <p className="eyebrow mb-1">{ruolo === 'TRAINER' ? `${tr('Cardio', 'Cardio')} · ${nomeCliente ?? ''}` : tr('Cardio e passi', 'Cardio and steps')}</p>
        <h2 id="cardio-titolo" className={ruolo === 'TRAINER' ? 'section-title' : 'text-2xl font-black uppercase tracking-tight sm:text-3xl'}>
          {ruolo === 'TRAINER' ? tr('Cardio e passi', 'Cardio and steps') : tr('Il tuo cardio', 'Your cardio')}
        </h2>
      </div>
      {errore && <p className="alert-error">{errore}</p>}
      {!dati && !errore && <p className="py-6 text-center text-sm text-muted">{tr('Carico il cardio…', 'Loading cardio…')}</p>}
      {dati && (
        <div className="grid gap-4 md:grid-cols-2">
          <SchedaCardio ruolo={ruolo} clienteId={clienteId} autonomo={autonomo} dati={dati} onCambiati={setDati} />
          <SchedaPassi key={dati.obiettivoPassi ?? 0} ruolo={ruolo} clienteId={clienteId} autonomo={autonomo} dati={dati} onCambiati={setDati} />
        </div>
      )}
    </section>
  );
}
