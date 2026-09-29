import { useState } from 'react';
import { cambiaMiaPassword } from './api';

interface Props {
  // true = dopo un reset del trainer: niente "Annulla", la nuova password va scelta per forza.
  obbligatorio: boolean;
  onFatto: () => void;
  onAnnulla?: () => void;
}

// Schermata per cambiare la propria password (trainer e clienti).
export default function CambioPassword({ obbligatorio, onFatto, onAnnulla }: Props) {
  const [attuale, setAttuale] = useState('');
  const [nuova, setNuova] = useState('');
  const [conferma, setConferma] = useState('');
  const [mostra, setMostra] = useState(false);
  const [errore, setErrore] = useState('');
  const [inInvio, setInInvio] = useState(false);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setErrore('');
    if (nuova.length < 8) {
      setErrore('La nuova password deve avere almeno 8 caratteri');
      return;
    }
    if (nuova !== conferma) {
      setErrore('Le due password nuove non coincidono');
      return;
    }
    setInInvio(true);
    try {
      const { token } = await cambiaMiaPassword(attuale, nuova);
      // Token nuovo: questo dispositivo resta collegato, gli altri vengono disconnessi.
      localStorage.setItem('token', token);
      localStorage.removeItem('passwordTemporanea');
      onFatto();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel cambio password');
    } finally {
      setInInvio(false);
    }
  }

  const tipo = mostra ? 'text' : 'password';

  return (
    <form onSubmit={salva} className="card w-full max-w-md space-y-5 p-6 sm:p-8" aria-busy={inInvio}>
      <div>
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-ink" aria-hidden="true">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" /></svg>
        </span>
        <h2 id="change-password-title" className="text-2xl font-black uppercase tracking-tight">{obbligatorio ? 'Nuova password' : 'Cambia password'}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {obbligatorio
            ? 'Il trainer ti ha dato una password temporanea. Scegli una nuova password per accedere alle tue schede.'
            : 'Aggiorna la password del tuo account. Gli altri dispositivi collegati dovranno accedere di nuovo.'}
        </p>
      </div>
      <div>
        <label htmlFor="password-current" className="label">{obbligatorio ? 'Password temporanea' : 'Password attuale'}</label>
        <input id="password-current" className="input" type={tipo} autoComplete="current-password" value={attuale} onChange={(e) => setAttuale(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password-new" className="label">Nuova password</label>
        <input id="password-new" className="input" type={tipo} autoComplete="new-password" minLength={8} maxLength={72} aria-describedby="password-hint" value={nuova} onChange={(e) => setNuova(e.target.value)} required />
        <p id="password-hint" className="mt-2 text-xs text-muted">Usa almeno 8 caratteri.</p>
      </div>
      <div>
        <label htmlFor="password-confirm" className="label">Conferma nuova password</label>
        <input id="password-confirm" className="input" type={tipo} autoComplete="new-password" minLength={8} maxLength={72} value={conferma} onChange={(e) => setConferma(e.target.value)} required />
      </div>
      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-soft">
        <input className="h-4 w-4 accent-accent" type="checkbox" checked={mostra} onChange={(e) => setMostra(e.target.checked)} />
        Mostra le password
      </label>
      {errore && <p role="alert" className="alert-error">{errore}</p>}
      <button type="submit" className="btn-primary w-full py-3 uppercase tracking-wide" disabled={inInvio}>{inInvio ? 'Salvataggio in corso…' : 'Salva nuova password'}</button>
      {!obbligatorio && onAnnulla && <button type="button" className="btn-secondary w-full" onClick={onAnnulla} disabled={inInvio}>Annulla</button>}
    </form>
  );
}

