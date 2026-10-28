import { useId, useState } from 'react';
import { chiediLinkPassword } from './api';
import { tr } from './lingua';

// "Password dimenticata?" nella schermata di accesso: si scrive l'email e arriva un link.
// Il messaggio finale è lo stesso che l'email sia registrata o no (nessuno scopre chi è iscritto).
export default function RecuperoPassword({ emailIniziale, onIndietro }: { emailIniziale: string; onIndietro: () => void }) {
  const id = useId();
  const [email, setEmail] = useState(emailIniziale);
  const [inInvio, setInInvio] = useState(false);
  const [inviata, setInviata] = useState(false);
  const [errore, setErrore] = useState('');

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setInInvio(true);
    setErrore('');
    try {
      await chiediLinkPassword(email.trim());
      setInviata(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setInInvio(false);
    }
  }

  if (inviata) {
    return (
      <div className="space-y-5">
        <div role="status" className="alert-success">
          <p className="font-bold">{tr('Controlla la tua email', 'Check your email')}</p>
          <p className="mt-1">
            {tr(
              `Se ${email.trim()} è registrata su Liftio, ti abbiamo mandato un link per scegliere una nuova password. Vale 30 minuti: se non lo trovi, guarda anche nello spam.`,
              `If ${email.trim()} is registered on Liftio, we've sent you a link to choose a new password. It's valid for 30 minutes: if you can't find it, check your spam folder too.`,
            )}
          </p>
        </div>
        <button type="button" className="btn-primary w-full py-3 uppercase tracking-wide" onClick={onIndietro}>
          {tr('Torna all’accesso', 'Back to sign in')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={invia} className="space-y-5" aria-busy={inInvio}>
      <div>
        <p className="text-lg font-bold text-ink">{tr('Password dimenticata?', 'Forgot your password?')}</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          {tr('Scrivi l’email del tuo account: ti mandiamo un link per sceglierne una nuova.', 'Enter your account email: we’ll send you a link to choose a new one.')}
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="label">{tr('Indirizzo email', 'Email address')}</label>
        <input
          id={`${id}-email`}
          className="input"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder={tr('nome@esempio.it', 'name@example.com')}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrore(''); }}
          required
        />
      </div>
      {errore && <p role="alert" className="alert-error">{errore}</p>}
      <button type="submit" className="btn-primary w-full py-3 uppercase tracking-wide" disabled={inInvio || !email.trim()}>
        {inInvio ? tr('Un momento…', 'One moment…') : tr('Mandami il link', 'Send me the link')}
      </button>
      <p className="text-center text-sm text-muted">
        <button type="button" className="btn-link" onClick={onIndietro} disabled={inInvio}>{tr('Torna all’accesso', 'Back to sign in')}</button>
      </p>
    </form>
  );
}
