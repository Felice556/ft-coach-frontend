import { useEffect, useId, useState } from 'react';
import { cambiaEmail, getMe, rimandaConfermaEmail } from './api';
import { tr } from './lingua';

// Fascia in cima all'app per chi non ha ancora confermato l'email: non blocca niente,
// ma ricorda di confermare (serve per recuperare la password) e permette di correggere
// un indirizzo scritto male o di farsi rimandare l'email.
export default function AvvisoEmail() {
  const id = useId();
  const [email, setEmail] = useState<string | null>(null);
  const [aperto, setAperto] = useState(false);
  const [nuova, setNuova] = useState('');
  const [password, setPassword] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState('');

  useEffect(() => {
    getMe()
      .then((me) => { if (me.emailConfermata === false && me.email) setEmail(me.email); })
      .catch(() => { /* senza /me non mostriamo niente */ });
  }, []);

  if (!email) return null;

  async function rimanda() {
    if (inInvio) return;
    setInInvio(true);
    setErrore('');
    setMessaggio('');
    try {
      await rimandaConfermaEmail();
      setMessaggio(tr(`Email mandata di nuovo a ${email}. Guarda anche nello spam.`, `Email sent again to ${email}. Check your spam folder too.`));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setInInvio(false);
    }
  }

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setInInvio(true);
    setErrore('');
    setMessaggio('');
    try {
      const r = await cambiaEmail(nuova.trim(), password);
      setEmail(r.email);
      setAperto(false);
      setNuova('');
      setPassword('');
      setMessaggio(tr(`Email cambiata: ora accedi con ${r.email}. Ti abbiamo mandato il link di conferma.`, `Email changed: you now sign in with ${r.email}. We've sent you the confirmation link.`));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setInInvio(false);
    }
  }

  return (
    <div role="region" aria-label={tr('Conferma la tua email', 'Confirm your email')} className="mb-6 rounded-xl border border-accent-strong/30 bg-accent-soft px-4 py-3 text-sm leading-6 text-soft">
      <p>
        <strong className="text-ink">{tr('Conferma la tua email.', 'Confirm your email.')}</strong>{' '}
        {tr(`Ti abbiamo scritto a ${email}: tocca il link nell’email, così potrai sempre recuperare la password.`, `We wrote to ${email}: tap the link in the email, so you can always recover your password.`)}
      </p>
      {!aperto && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <button type="button" className="btn-link text-sm" onClick={rimanda} disabled={inInvio}>{tr('Rimanda l’email', 'Resend the email')}</button>
          <button type="button" className="btn-link text-sm" onClick={() => { setAperto(true); setErrore(''); setMessaggio(''); }} disabled={inInvio}>
            {tr('L’email è sbagliata? Cambiala', 'Wrong email? Change it')}
          </button>
        </p>
      )}
      {aperto && (
        <form onSubmit={salva} className="mt-3 space-y-3" noValidate>
          <div>
            <label htmlFor={`${id}-email`} className="label">{tr('Email giusta', 'Correct email')}</label>
            <input id={`${id}-email`} className="input" type="email" autoComplete="email" autoCapitalize="none" value={nuova} onChange={(e) => { setNuova(e.target.value); setErrore(''); }} />
          </div>
          <div>
            <label htmlFor={`${id}-password`} className="label">{tr('La tua password, per confermare', 'Your password, to confirm')}</label>
            <input id={`${id}-password`} className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setErrore(''); }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary min-h-10 px-4 text-sm" disabled={inInvio || !nuova.trim() || !password}>
              {inInvio ? tr('Un momento…', 'One moment…') : tr('Cambia email', 'Change email')}
            </button>
            <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={() => { setAperto(false); setErrore(''); }}>{tr('Annulla', 'Cancel')}</button>
          </div>
        </form>
      )}
      {messaggio && <p role="status" className="mt-2 font-semibold text-ink">{messaggio}</p>}
      {errore && <p role="alert" className="alert-error mt-2">{errore}</p>}
    </div>
  );
}
