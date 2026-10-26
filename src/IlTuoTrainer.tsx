import { useEffect, useId, useState } from 'react';
import { collegaTrainer, getMe, lasciaTrainer, Me } from './api';
import { tr } from './lingua';

// Impostazioni del cliente: allenarsi da solo o con un trainer.
// - Da solo: inserisce il codice invito di un trainer per farsi seguire.
// - Con un trainer: può cambiarlo (codice di un altro trainer) o smettere (serve la password).
// Non si cancella mai niente: le schede create da solo vanno "in pausa" e tornano se lascia il trainer.
export default function IlTuoTrainer({ onCambiato }: { onCambiato: () => void }) {
  const id = useId();
  const [me, setMe] = useState<Me | null>(null);
  const [codiceAperto, setCodiceAperto] = useState(false);
  const [codice, setCodice] = useState('');
  const [lasciaAperto, setLasciaAperto] = useState(false);
  const [password, setPassword] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((err) => setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento', 'Loading error')));
  }, []);

  async function collega(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio || !codice.trim()) return;
    setInInvio(true);
    setErrore('');
    try {
      await collegaTrainer(codice);
      onCambiato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
      setInInvio(false);
    }
  }

  async function lascia(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio || !password) return;
    setInInvio(true);
    setErrore('');
    try {
      await lasciaTrainer(password);
      onCambiato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
      setInInvio(false);
    }
  }

  if (!me) return errore ? <p className="alert-error">{errore}</p> : null;
  const trainer = me.trainer ?? null;
  const personali = me.schedePersonali ?? 0;

  const moduloCodice = (
    <form onSubmit={collega} className="mt-3 space-y-2" noValidate>
      <label htmlFor={`${id}-codice`} className="label">{tr('Codice invito del trainer', 'Trainer’s invite code')}</label>
      <div className="flex gap-2">
        <input
          id={`${id}-codice`}
          className="input min-w-0 flex-1 font-mono uppercase tracking-wider"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          placeholder={tr('Es. K7M3-Q9TX', 'E.g. K7M3-Q9TX')}
          value={codice}
          onChange={(e) => { setCodice(e.target.value); setErrore(''); }}
        />
        <button type="submit" className="btn-primary shrink-0 px-4" disabled={inInvio || !codice.trim()}>
          {inInvio ? '…' : tr('Collegati', 'Link up')}
        </button>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
        {personali > 0 && (
          <li>{tr('Le schede che ti sei creato restano salvate, in pausa: tornano se un giorno smetti con il trainer.', 'The programmes you created stay saved, on pause: they come back if you stop with the trainer one day.')}</li>
        )}
        <li>{tr('Il trainer vedrà allenamenti, misure, cardio, passi e diario da oggi in poi, non quelli di prima.', 'The trainer will see workouts, measurements, cardio, steps and diary from today on, not earlier ones.')}</li>
      </ul>
    </form>
  );

  return (
    <div>
      <p className="label">{tr('Il tuo trainer', 'Your trainer')}</p>
      <div className="rounded-xl border border-line bg-field p-4">
        {trainer ? (
          <>
            <p className="text-sm text-soft">
              {tr('Ti segue', 'Coached by')} <strong className="text-ink">{trainer.nome}</strong>
            </p>
            {!lasciaAperto && !codiceAperto && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary min-h-10 px-3 text-sm" onClick={() => setCodiceAperto(true)}>{tr('Cambia trainer', 'Change trainer')}</button>
                <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={() => setLasciaAperto(true)}>{tr('Allenati da solo', 'Train on your own')}</button>
              </div>
            )}
            {codiceAperto && moduloCodice}
            {lasciaAperto && (
              <form onSubmit={lascia} className="mt-3 space-y-2" noValidate>
                <p className="text-xs leading-relaxed text-muted">
                  {tr(
                    `${trainer.nome} non vedrà più i tuoi dati e le sue schede non saranno più nella tua app (restano salvate, con tutti i tuoi allenamenti). Tornano attive le schede che ti eri creato da solo. Per tornare con lui ti servirà un suo nuovo codice.`,
                    `${trainer.nome} will no longer see your data and their programmes will leave your app (they stay saved, with all your workouts). The programmes you created yourself become active again. To go back to them you’ll need a new code from them.`,
                  )}
                </p>
                <label htmlFor={`${id}-password`} className="label">{tr('La tua password, per confermare', 'Your password, to confirm')}</label>
                <input id={`${id}-password`} type="password" className="input" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setErrore(''); }} />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="btn-danger min-h-10 px-3 text-sm" disabled={inInvio || !password}>
                    {inInvio ? tr('Un momento…', 'One moment…') : tr(`Smetti con ${trainer.nome}`, `Stop with ${trainer.nome}`)}
                  </button>
                  <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={() => { setLasciaAperto(false); setPassword(''); setErrore(''); }}>{tr('Annulla', 'Cancel')}</button>
                </div>
              </form>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-soft">
              <strong className="text-ink">{tr('Ti alleni da solo', 'You train on your own')}</strong>
              {' · '}
              {tr(`schede create: ${personali}`, `programmes created: ${personali}`)}
            </p>
            {!codiceAperto ? (
              <button type="button" className="btn-secondary mt-3 min-h-10 px-3 text-sm" onClick={() => setCodiceAperto(true)}>{tr('Ho un trainer: inserisci il codice', 'I have a trainer: enter the code')}</button>
            ) : (
              moduloCodice
            )}
          </>
        )}
        {errore && <p className="alert-error mt-3">{errore}</p>}
      </div>
    </div>
  );
}
