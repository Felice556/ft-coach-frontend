import { useState } from 'react';
import { eliminaMioAccount, Ruolo } from './api';
import { tr } from './lingua';

// La parola da scrivere per confermare, nella lingua dell'app (il server le accetta entrambe).
const PAROLA = tr('ELIMINA', 'DELETE');

interface Props {
  ruolo: Ruolo;
  onEliminato: () => void;
  onAnnulla: () => void;
}

// Eliminare il proprio account (trainer e clienti). È definitivo: servono la password
// e la parola ELIMINA scritta a mano. Il controllo vero lo fa comunque il server.
export default function EliminaAccount({ ruolo, onEliminato, onAnnulla }: Props) {
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [errore, setErrore] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const pronto = password.length > 0 && conferma.trim().toUpperCase() === PAROLA;

  async function elimina(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio || !pronto) return;
    setErrore('');
    setInInvio(true);
    try {
      await eliminaMioAccount(password, conferma);
      onEliminato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr("Errore durante l'eliminazione dell'account", 'Error while deleting the account'));
      setInInvio(false);
    }
  }

  return (
    <form onSubmit={elimina} className="card w-full max-w-md space-y-5 p-6 sm:p-8" aria-busy={inInvio}>
      <div>
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" /></svg>
        </span>
        <h2 id="delete-account-title" className="text-2xl font-black uppercase tracking-tight">{tr('Elimina account', 'Delete account')}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {tr('L’eliminazione è ', 'Deletion is ')}
          <strong className="text-ink">{tr('definitiva', 'permanent')}</strong>
          {tr(': non si può annullare e i dati non si possono recuperare.', ': it can’t be undone and the data can’t be recovered.')}
        </p>
      </div>
      <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm leading-6 text-soft">
        {ruolo === 'CLIENTE' ? (
          <>
            {tr(
              'Verranno cancellati il tuo account, le tue schede, tutte le serie registrate, gli allenamenti conclusi, le note e le misure (peso e massa grassa). Il tuo trainer non li vedrà più.',
              'This deletes your account, your programmes, every logged set, your completed workouts, notes and measurements (weight and body fat). Your trainer will no longer see them.',
            )}
          </>
        ) : (
          <>
            {tr(
              'Verranno cancellati il tuo account, la tua libreria di esercizi e note e i tuoi inviti. Se hai ancora clienti collegati non potrai eliminarlo: prima vanno chiusi o trasferiti i loro account.',
              'This deletes your account, your exercise and notes library and your invites. If you still have linked clients you can’t delete it: their accounts must be closed or transferred first.',
            )}
          </>
        )}
      </div>
      <div>
        <label htmlFor="delete-password" className="label">{tr('La tua password', 'Your password')}</label>
        <input id="delete-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="delete-confirm" className="label">{tr(`Per confermare scrivi ${PAROLA}`, `To confirm, type ${PAROLA}`)}</label>
        <input id="delete-confirm" className="input" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={conferma} onChange={(e) => setConferma(e.target.value)} required />
      </div>
      {errore && <p role="alert" className="alert-error">{errore}</p>}
      <button type="submit" className="btn-danger w-full py-3 font-bold uppercase tracking-wide" disabled={inInvio || !pronto}>
        {inInvio ? tr('Eliminazione in corso…', 'Deleting…') : tr('Elimina definitivamente', 'Delete permanently')}
      </button>
      <button type="button" className="btn-secondary w-full" onClick={onAnnulla} disabled={inInvio}>{tr('Annulla', 'Cancel')}</button>
    </form>
  );
}
