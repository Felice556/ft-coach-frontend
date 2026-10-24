// Pagine pubbliche, aperte a tutti senza accesso (servono anche a Google Play):
// - liftio.it/privacy          → informativa privacy
// - liftio.it/elimina-account  → come eliminare l'account e i dati
// Lingua: quella del telefono, oppure ?lang=en / ?lang=it nell'indirizzo.
import { ReactNode } from 'react';
import InformativaPrivacy, { EMAIL_PRIVACY } from './Privacy';
import { cambiaLingua, lingua, tr } from './lingua';

export const PERCORSI_PUBBLICI = ['/privacy', '/elimina-account', '/delete-account'] as const;

function Cornice({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <a href="/" className="text-xl font-black tracking-tight text-ink">
            LIFTIO<span className="text-accent-strong">.</span>
          </a>
          <div className="flex gap-1 text-sm font-semibold" role="group" aria-label={tr('Lingua', 'Language')}>
            {(['it', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lingua === l}
                onClick={() => cambiaLingua(l)}
                className={`rounded-lg px-3 py-1.5 ${lingua === l ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}
              >
                {l === 'it' ? 'Italiano' : 'English'}
              </button>
            ))}
          </div>
        </div>
        {children}
        <p className="pb-6 text-center text-xs text-muted">
          <a className="underline-offset-4 hover:underline" href="/privacy">{tr('Informativa privacy', 'Privacy notice')}</a>
          {' · '}
          <a className="underline-offset-4 hover:underline" href="/elimina-account">{tr('Eliminare l’account', 'Delete your account')}</a>
          {' · '}
          <a className="underline-offset-4 hover:underline" href="/">liftio.it</a>
        </p>
      </div>
    </div>
  );
}

function PaginaPrivacy() {
  return (
    <Cornice>
      {/* Stessa informativa che si vede dentro l'app */}
      <div className="[&>.card]:max-h-none">
        <InformativaPrivacy onChiudi={() => window.location.assign('/')} />
      </div>
    </Cornice>
  );
}

function Passo({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-ink" aria-hidden="true">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function PaginaEliminaAccount() {
  return (
    <Cornice>
      <article className="card space-y-6 text-sm leading-relaxed text-soft">
        <header>
          <p className="eyebrow mb-1">Liftio</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{tr('Eliminare il tuo account Liftio', 'Delete your Liftio account')}</h1>
          <p className="mt-2">
            {tr(
              'Puoi eliminare il tuo account e tutti i tuoi dati in qualsiasi momento, direttamente dall’app.',
              'You can delete your account and all your data at any time, right from the app.',
            )}
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-ink">{tr('Dall’app', 'From the app')}</h2>
          <ol className="space-y-2.5">
            <Passo n={1}>{tr('Accedi a Liftio (app o liftio.it).', 'Sign in to Liftio (app or liftio.it).')}</Passo>
            <Passo n={2}>{tr('Apri Impostazioni (icona dell’ingranaggio in alto).', 'Open Settings (the gear icon at the top).')}</Passo>
            <Passo n={3}>{tr('Tocca “Elimina account”, in fondo.', 'Tap “Delete account” at the bottom.')}</Passo>
            <Passo n={4}>
              {tr('Scrivi la tua password e la parola ELIMINA, poi conferma.', 'Enter your password and the word DELETE, then confirm.')}
            </Passo>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">{tr('Cosa viene cancellato', 'What gets deleted')}</h2>
          <p>
            {tr(
              'Subito e definitivamente: il tuo account (nome, email, password), le schede, le serie e gli allenamenti registrati, peso e massa grassa, cardio e passi, il diario alimentare e gli avvisi sui programmi in arrivo. Le copie di sicurezza (backup) si cancellano da sole entro 60 giorni.',
              'Immediately and permanently: your account (name, email, password), programmes, logged sets and workouts, weight and body fat, cardio and steps, the food diary and alerts for upcoming plans. Backup copies are deleted automatically within 60 days.',
            )}
          </p>
          <p>
            {tr(
              'Se sei un trainer, puoi eliminare l’account quando non hai più clienti collegati: se ne hai ancora, scrivici e ti aiutiamo a chiudere o trasferire i loro account.',
              'If you’re a trainer, you can delete your account once you no longer have linked clients: if you still have some, write to us and we’ll help you close or transfer their accounts.',
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">{tr('Eliminare solo alcuni dati', 'Deleting only some data')}</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>{tr('Diario alimentare: ritirando il consenso dal diario, viene cancellato tutto.', 'Food diary: withdrawing your consent in the diary deletes all of it.')}</li>
            <li>{tr('Singole serie, misure e sessioni di cardio si cancellano dall’app, una per una.', 'Single sets, measurements and cardio sessions can be deleted in the app, one by one.')}</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink">{tr('Non riesci ad accedere?', 'Can’t sign in?')}</h2>
          <p>
            {tr('Scrivi a', 'Write to')} <a className="font-semibold text-accent-strong" href={`mailto:${EMAIL_PRIVACY}?subject=${encodeURIComponent('Eliminazione account Liftio')}`}>{EMAIL_PRIVACY}</a>{' '}
            {tr(
              'dall’indirizzo email del tuo account, chiedendo di eliminarlo. Lo facciamo entro 30 giorni e ti confermiamo l’avvenuta cancellazione.',
              'from your account’s email address, asking us to delete it. We’ll do it within 30 days and confirm once it’s done.',
            )}
          </p>
        </section>
      </article>
    </Cornice>
  );
}

// Quale pagina pubblica mostrare per questo indirizzo (null = l'app normale).
export function paginaPubblica(percorso: string) {
  const p = percorso.replace(/\/+$/, '').toLowerCase();
  if (p === '/privacy') return <PaginaPrivacy />;
  if (p === '/elimina-account' || p === '/delete-account') return <PaginaEliminaAccount />;
  return null;
}
