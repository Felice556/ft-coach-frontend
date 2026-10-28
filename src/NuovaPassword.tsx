import { useId, useState } from 'react';
import { reimpostaPasswordDaLink } from './api';
import { tr } from './lingua';

// liftio.it/nuova-password?token=… : la pagina del link "Password dimenticata?" arrivato per email.
// Il link vale 30 minuti e una volta sola; dopo il cambio si accede con la password nuova
// (gli altri dispositivi vengono disconnessi).
export default function NuovaPassword() {
  const id = useId();
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [mostra, setMostra] = useState(false);
  const [inInvio, setInInvio] = useState(false);
  const [fatto, setFatto] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setErrore('');
    if (password.length < 8) {
      setErrore(tr('La password deve avere almeno 8 caratteri', 'The password must be at least 8 characters'));
      return;
    }
    if (password !== conferma) {
      setErrore(tr('Le due password non coincidono', 'The two passwords don’t match'));
      return;
    }
    setInInvio(true);
    try {
      await reimpostaPasswordDaLink(token, password);
      setFatto(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setInInvio(false);
    }
  }

  return (
    <article className="card mx-auto max-w-md space-y-5">
      <header>
        <p className="eyebrow mb-1">Liftio</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{tr('Scegli una nuova password', 'Choose a new password')}</h1>
      </header>
      {!token ? (
        <div className="space-y-4">
          <p className="alert-error">{tr('Il link non è completo. Aprilo di nuovo dall’email, oppure chiedine uno nuovo.', 'The link is incomplete. Open it again from the email, or request a new one.')}</p>
          <a href="/" className="btn-primary flex w-full justify-center py-3">{tr('Vai all’accesso', 'Go to sign in')}</a>
        </div>
      ) : fatto ? (
        <div className="space-y-4">
          <p role="status" className="alert-success">
            {tr('Fatto: la password è cambiata. Ora accedi con quella nuova.', 'Done: your password has been changed. Now sign in with the new one.')}
          </p>
          <a href="/" className="btn-primary flex w-full justify-center py-3 uppercase tracking-wide">{tr('Accedi', 'Sign in')}</a>
        </div>
      ) : (
        <form onSubmit={salva} className="space-y-4" noValidate aria-busy={inInvio}>
          <div>
            <label htmlFor={`${id}-nuova`} className="label">{tr('Nuova password', 'New password')}</label>
            <div className="relative">
              <input
                id={`${id}-nuova`}
                className="input pr-24"
                type={mostra ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={tr('Almeno 8 caratteri', 'At least 8 characters')}
                maxLength={72}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrore(''); }}
              />
              <button type="button" className="absolute inset-y-0 right-1 rounded-lg px-3 text-xs font-semibold text-muted hover:text-accent-strong" aria-pressed={mostra} onClick={() => setMostra(!mostra)}>
                {mostra ? tr('Nascondi', 'Hide') : tr('Mostra', 'Show')}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-conferma`} className="label">{tr('Ripeti la nuova password', 'Repeat the new password')}</label>
            <input
              id={`${id}-conferma`}
              className="input"
              type={mostra ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={72}
              value={conferma}
              onChange={(e) => { setConferma(e.target.value); setErrore(''); }}
            />
          </div>
          {errore && <p role="alert" className="alert-error">{errore}</p>}
          <button type="submit" className="btn-primary w-full py-3 uppercase tracking-wide" disabled={inInvio || !password || !conferma}>
            {inInvio ? tr('Un momento…', 'One moment…') : tr('Salva la nuova password', 'Save the new password')}
          </button>
          <p className="text-xs leading-5 text-muted">
            {tr('Dopo il cambio verrai disconnesso dagli altri dispositivi.', 'After the change you’ll be signed out on your other devices.')}
          </p>
        </form>
      )}
    </article>
  );
}
