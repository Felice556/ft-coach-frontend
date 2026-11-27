import { useId, useState } from 'react';
import { annullaRichiestaNote, chiediGuardaNote, Cliente, Me } from './api';
import { locale, tr } from './lingua';

// "oggi alle 14:32", "ieri alle 9:05", "lun 24 nov alle 18:10"
export function quandoBreve(iso: string) {
  const d = new Date(iso);
  const ora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const oggi = new Date();
  const ieri = new Date();
  ieri.setDate(oggi.getDate() - 1);
  if (d.toDateString() === oggi.toDateString()) return tr(`oggi alle ${ora}`, `today at ${ora}`);
  if (d.toDateString() === ieri.toDateString()) return tr(`ieri alle ${ora}`, `yesterday at ${ora}`);
  return tr(`${d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} alle ${ora}`, `${d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} at ${ora}`);
}

const ICONA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M8 10h8M8 14h8M8 18h4" />
  </svg>
);

// CLIENTE: "Guarda le mie note". Un tocco e il trainer lo vede sul suo nome, con un messaggio facoltativo.
export function ChiediGuardaNote({ me, onAggiornato }: { me: Me; onAggiornato: (me: Me) => void }) {
  const id = useId();
  const [messaggioAperto, setMessaggioAperto] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const trainer = me.trainer?.nome ?? tr('il tuo trainer', 'your trainer');

  async function esegui(azione: () => Promise<Me>) {
    if (inInvio) return;
    setInInvio(true);
    setErrore('');
    try {
      onAggiornato(await azione());
      setMessaggio('');
      setMessaggioAperto(false);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setInInvio(false);
    }
  }

  if (me.richiestaNoteIl) {
    return (
      <div className="card flex flex-col gap-3 border-accent-strong/50 bg-accent-soft sm:flex-row sm:items-center sm:justify-between" data-richiesta-note="inviata">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">{ICONA}</span>
          <div className="min-w-0">
            <p className="font-bold">{tr(`✓ Hai chiesto a ${trainer} di guardare le tue note`, `✓ You asked ${trainer} to look at your notes`)}</p>
            <p className="text-sm text-soft">{tr(`Inviata ${quandoBreve(me.richiestaNoteIl)}. Appena le guarda, lo vedi qui.`, `Sent ${quandoBreve(me.richiestaNoteIl)}. As soon as they look, you’ll see it here.`)}</p>
            {me.richiestaNoteTesto && <p className="mt-1 text-sm italic break-words text-soft">“{me.richiestaNoteTesto}”</p>}
          </div>
        </div>
        <button type="button" className="btn-ghost min-h-11 shrink-0 text-sm" disabled={inInvio} onClick={() => esegui(annullaRichiestaNote)}>
          {tr('Annulla richiesta', 'Cancel request')}
        </button>
        {errore && <p className="alert-error">{errore}</p>}
      </div>
    );
  }

  return (
    <div className="card space-y-3" data-richiesta-note="da-inviare">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent-strong">{ICONA}</span>
        <div className="min-w-0">
          <p className="font-bold">{tr('Hai scritto delle note per il trainer?', 'Did you write notes for your trainer?')}</p>
          <p className="text-sm text-muted">
            {me.noteVisteIl
              ? tr(`${trainer} ha guardato le tue note ${quandoBreve(me.noteVisteIl)}. Se ne hai scritte di nuove, chiediglielo di nuovo.`, `${trainer} looked at your notes ${quandoBreve(me.noteVisteIl)}. If you wrote new ones, ask again.`)
              : tr(`Con un tocco ${trainer} vede che hai bisogno che le guardi.`, `With one tap ${trainer} sees you need them to look.`)}
          </p>
        </div>
      </div>
      {messaggioAperto && (
        <div>
          <label htmlFor={`${id}-msg`} className="label">{tr('Messaggio (facoltativo)', 'Message (optional)')}</label>
          <textarea
            id={`${id}-msg`}
            className="input min-h-[72px] resize-y"
            maxLength={300}
            placeholder={tr('Es. "Guarda la nota sulla panca, mi fa male la spalla"', 'E.g. "Check my bench press note, my shoulder hurts"')}
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
          />
          <p className="mt-1 text-right text-xs text-muted tabular-nums">{messaggio.length}/300</p>
        </div>
      )}
      {errore && <p className="alert-error">{errore}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn-primary min-h-12 w-full sm:w-auto" disabled={inInvio} onClick={() => esegui(() => chiediGuardaNote(messaggio))}>
          {inInvio ? tr('Invio…', 'Sending…') : tr(`Chiedi a ${trainer} di guardare le note`, `Ask ${trainer} to look at your notes`)}
        </button>
        {!messaggioAperto && (
          <button type="button" className="btn-ghost min-h-12 w-full text-sm sm:w-auto" onClick={() => setMessaggioAperto(true)}>
            {tr('+ Aggiungi un messaggio', '+ Add a message')}
          </button>
        )}
      </div>
    </div>
  );
}

// TRAINER: avviso in cima all'app con i clienti che chiedono di guardare le note.
export function AvvisiNote({
  clienti,
  onApri,
  onFatto,
}: {
  clienti: Cliente[];
  onApri: (id: number) => void;
  onFatto: (id: number) => Promise<void>;
}) {
  const [inInvio, setInInvio] = useState<number | null>(null);
  const [tutti, setTutti] = useState(false);
  const richieste = clienti
    .filter((c) => c.richiestaNoteIl)
    .sort((a, b) => +new Date(b.richiestaNoteIl!) - +new Date(a.richiestaNoteIl!));
  if (richieste.length === 0) return null;
  const visibili = tutti ? richieste : richieste.slice(0, 3);

  async function fatto(id: number) {
    setInInvio(id);
    try {
      await onFatto(id);
    } finally {
      setInInvio(null);
    }
  }

  return (
    <section className="rounded-2xl border border-accent-strong/50 bg-accent-soft p-4 sm:p-5" aria-label={tr('Richieste di guardare le note', 'Requests to look at notes')} role="status" data-avvisi-note>
      <p className="mb-3 flex items-center gap-2 font-bold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">{ICONA}</span>
        {richieste.length === 1
          ? tr('1 cliente ti chiede di guardare le note', '1 client asks you to look at their notes')
          : tr(`${richieste.length} clienti ti chiedono di guardare le note`, `${richieste.length} clients ask you to look at their notes`)}
      </p>
      <ul className="space-y-2">
        {visibili.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 rounded-xl bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold">
                {c.nome} <span className="text-xs font-normal text-muted">· {quandoBreve(c.richiestaNoteIl!)}</span>
              </p>
              {c.richiestaNoteTesto && <p className="text-sm italic break-words text-soft">“{c.richiestaNoteTesto}”</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-secondary min-h-11 flex-1 px-4 text-sm sm:flex-none" onClick={() => onApri(c.id)}>
                {tr('Apri', 'Open')}
              </button>
              <button type="button" className="btn-primary min-h-11 flex-1 px-4 text-sm sm:flex-none" disabled={inInvio === c.id} onClick={() => fatto(c.id)}>
                {tr('Fatto, le ho viste', 'Done, seen them')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {richieste.length > 3 && (
        <button type="button" className="btn-link mt-2 text-sm" onClick={() => setTutti(!tutti)}>
          {tutti ? tr('Mostra meno', 'Show less') : tr(`Mostra tutti (${richieste.length})`, `Show all (${richieste.length})`)}
        </button>
      )}
    </section>
  );
}

