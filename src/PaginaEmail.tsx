import { useEffect, useState } from 'react';
import { annullaRegistrazione, confermaEmail, leggiLinkEmail, LinkEmail } from './api';
import { tr } from './lingua';

// Le due pagine del link nell'email di conferma:
// - liftio.it/conferma-email?token=…        → conferma subito l'indirizzo
// - liftio.it/annulla-registrazione?token=… → "Non sono stato io": chiede conferma, poi cancella
//   l'iscrizione (solo se l'email non era mai stata confermata).
const token = () => new URLSearchParams(window.location.search).get('token') ?? '';

function Scheda({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <article className="card mx-auto max-w-md space-y-5">
      <header>
        <p className="eyebrow mb-1">Liftio</p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{titolo}</h1>
      </header>
      {children}
    </article>
  );
}

const vaiAllApp = (testo: string) => <a href="/" className="btn-primary flex w-full justify-center py-3">{testo}</a>;

export function ConfermaEmail() {
  const [stato, setStato] = useState<'attesa' | 'ok' | 'errore'>('attesa');
  const [errore, setErrore] = useState('');

  useEffect(() => {
    confermaEmail(token())
      .then(() => setStato('ok'))
      .catch((err) => { setErrore(err instanceof Error ? err.message : ''); setStato('errore'); });
  }, []);

  return (
    <Scheda titolo={tr('Conferma della tua email', 'Confirming your email')}>
      {stato === 'attesa' && <p className="text-sm text-muted" role="status">{tr('Un momento…', 'One moment…')}</p>}
      {stato === 'ok' && (
        <>
          <p role="status" className="alert-success">{tr('Fatto: la tua email è confermata. Grazie!', 'Done: your email is confirmed. Thank you!')}</p>
          {vaiAllApp(tr('Vai a Liftio', 'Go to Liftio'))}
        </>
      )}
      {stato === 'errore' && (
        <>
          <p role="alert" className="alert-error">
            {errore || tr('Il link non è valido o è scaduto', 'The link is invalid or has expired')}.{' '}
            {tr('Entra in Liftio e tocca “Rimanda l’email” nell’avviso in alto.', 'Sign in to Liftio and tap “Resend the email” in the notice at the top.')}
          </p>
          {vaiAllApp(tr('Vai a Liftio', 'Go to Liftio'))}
        </>
      )}
    </Scheda>
  );
}

export function AnnullaRegistrazione() {
  const [link, setLink] = useState<LinkEmail | null>(null);
  const [errore, setErrore] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const [fatto, setFatto] = useState(false);

  useEffect(() => {
    leggiLinkEmail(token())
      .then(setLink)
      .catch((err) => setErrore(err instanceof Error ? err.message : tr('Il link non è valido o è scaduto', 'The link is invalid or has expired')));
  }, []);

  async function annulla() {
    if (inInvio) return;
    setInInvio(true);
    setErrore('');
    try {
      await annullaRegistrazione(token());
      setFatto(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setInInvio(false);
    }
  }

  return (
    <Scheda titolo={tr('Non ti sei iscritto tu?', 'Didn’t sign up yourself?')}>
      {fatto ? (
        <p role="status" className="alert-success">
          {tr('Fatto: l’iscrizione è stata annullata e cancellata, con tutti i suoi dati. La tua email ora è di nuovo libera.', 'Done: the sign-up has been cancelled and deleted, with all its data. Your email is free again.')}
        </p>
      ) : errore && !link ? (
        <p role="alert" className="alert-error">{errore}</p>
      ) : !link ? (
        <p className="text-sm text-muted" role="status">{tr('Un momento…', 'One moment…')}</p>
      ) : !link.annullabile ? (
        <>
          <p className="text-sm leading-6 text-soft">
            {link.confermata
              ? tr(`L’account di ${link.email} ha già confermato l’email, quindi non si può annullare da qui.`, `The account for ${link.email} has already confirmed its email, so it can’t be cancelled from here.`)
              : tr(`L’account di ${link.email} non si può annullare da qui.`, `The account for ${link.email} can’t be cancelled from here.`)}{' '}
            {tr('Se pensi che qualcuno usi la tua email, scrivici: ti aiutiamo noi.', 'If you think someone is using your email, write to us: we’ll help you.')}
          </p>
          {vaiAllApp(tr('Vai a Liftio', 'Go to Liftio'))}
        </>
      ) : (
        <>
          <p className="text-sm leading-6 text-soft">
            {tr(
              `Qualcuno si è iscritto a Liftio con la tua email (${link.email}), con il nome “${link.nome}”. Se non sei stato tu, puoi annullare l’iscrizione: l’account verrà cancellato con tutti i suoi dati e la tua email tornerà libera.`,
              `Someone signed up to Liftio with your email (${link.email}), using the name “${link.nome}”. If it wasn’t you, you can cancel the sign-up: the account will be deleted with all its data and your email will be free again.`,
            )}
          </p>
          <p className="text-sm leading-6 text-muted">
            {tr('Se invece ti sei iscritto tu, non toccare niente: chiudi questa pagina.', 'If you did sign up, don’t do anything: just close this page.')}
          </p>
          {errore && <p role="alert" className="alert-error">{errore}</p>}
          <button type="button" className="btn-danger w-full py-3" onClick={annulla} disabled={inInvio}>
            {inInvio ? tr('Un momento…', 'One moment…') : tr('Non sono stato io: annulla l’iscrizione', 'It wasn’t me: cancel the sign-up')}
          </button>
        </>
      )}
    </Scheda>
  );
}
