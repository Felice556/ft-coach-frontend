import { useState } from 'react';
import { eliminaMioAccount, Ruolo } from './api';

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
  const pronto = password.length > 0 && conferma.trim().toUpperCase() === 'ELIMINA';

  async function elimina(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio || !pronto) return;
    setErrore('');
    setInInvio(true);
    try {
      await eliminaMioAccount(password, conferma);
      onEliminato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore durante l'eliminazione dell'account");
      setInInvio(false);
    }
  }

  return (
    <form onSubmit={elimina} className="card w-full max-w-md space-y-5 p-6 sm:p-8" aria-busy={inInvio}>
      <div>
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" /></svg>
        </span>
        <h2 id="delete-account-title" className="text-2xl font-black uppercase tracking-tight">Elimina account</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          L’eliminazione è <strong className="text-ink">definitiva</strong>: non si può annullare e i dati non si possono recuperare.
        </p>
      </div>
      <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm leading-6 text-soft">
        {ruolo === 'CLIENTE' ? (
          <>Verranno cancellati il tuo account, le tue schede, tutte le serie registrate, gli allenamenti conclusi, le note e le misure (peso e massa grassa). Il tuo trainer non li vedrà più.</>
        ) : (
          <>Verranno cancellati il tuo account, la tua libreria di esercizi e note e i tuoi inviti. Se hai ancora clienti collegati non potrai eliminarlo: prima vanno chiusi o trasferiti i loro account.</>
        )}
      </div>
      <div>
        <label htmlFor="delete-password" className="label">La tua password</label>
        <input id="delete-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="delete-confirm" className="label">Per confermare scrivi ELIMINA</label>
        <input id="delete-confirm" className="input" type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={conferma} onChange={(e) => setConferma(e.target.value)} required />
      </div>
      {errore && <p role="alert" className="alert-error">{errore}</p>}
      <button type="submit" className="btn-danger w-full py-3 font-bold uppercase tracking-wide" disabled={inInvio || !pronto}>
        {inInvio ? 'Eliminazione in corso…' : 'Elimina definitivamente'}
      </button>
      <button type="button" className="btn-secondary w-full" onClick={onAnnulla} disabled={inInvio}>Annulla</button>
    </form>
  );
}
