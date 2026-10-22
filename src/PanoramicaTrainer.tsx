import { useEffect, useState } from 'react';
import { DatiProgrammiAdmin, getConteggiProgrammi, getPanoramicaTrainer, inviaAnnuncioProgramma, PanoramicaTrainer as Dati, riattivaTrainer, RigaTrainer, sospendiTrainer } from './api';
import { PROGRAMMI } from './ProgrammiInArrivo';
import { locale, tr } from './lingua';

// Solo per l'amministratore: quanti trainer usano l'app e quanto la usano i loro clienti.
// Mostra solo numeri: i nomi dei clienti degli altri trainer non arrivano mai qui.

const dataBreve = (iso: string) =>
  new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

function giorniFa(iso: string) {
  const giorni = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (giorni <= 0) return tr('oggi', 'today');
  if (giorni === 1) return tr('ieri', 'yesterday');
  return tr(`${giorni} giorni fa`, `${giorni} days ago`);
}

function Riquadro({ valore, etichetta }: { valore: number; etichetta: string }) {
  return (
    <div className="rounded-xl border border-line bg-field p-4">
      <p className="text-3xl font-bold tabular-nums tracking-tight">{valore}</p>
      <p className="text-sm text-muted">{etichetta}</p>
    </div>
  );
}

function Numero({ valore, etichetta }: { valore: number | string; etichetta: string }) {
  return (
    <div>
      <p className="text-lg font-bold tabular-nums">{valore}</p>
      <p className="text-xs text-muted">{etichetta}</p>
    </div>
  );
}

// Sospendere un trainer: lui e i suoi clienti non possono più accedere, ma nessun dato viene
// cancellato. Riattivandolo torna tutto come prima. Non vale per l'amministratore (sé stesso).
function SospensioneTrainer({ t, onCambiato }: { t: RigaTrainer; onCambiato: () => void }) {
  const [conferma, setConferma] = useState(false);
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');

  async function esegui() {
    setInInvio(true);
    setErrore('');
    try {
      if (t.sospeso) await riattivaTrainer(t.id);
      else await sospendiTrainer(t.id);
      setConferma(false);
      onCambiato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Operazione non riuscita', 'Operation failed'));
    } finally {
      setInInvio(false);
    }
  }

  return (
    <div className="border-t border-line pt-3">
      {t.sospeso ? (
        <button type="button" className="btn-primary w-full text-sm" disabled={inInvio} onClick={esegui}>
          {inInvio ? tr('Un momento…', 'One moment…') : tr(`Riattiva ${t.nome}`, `Reactivate ${t.nome}`)}
        </button>
      ) : conferma ? (
        <div className="space-y-2 text-sm">
          <p className="text-soft">
            {tr(
              `Sospendi ${t.nome}? Né lui né i suoi ${t.clienti} clienti potranno accedere finché non lo riattivi. Non viene cancellato niente.`,
              `Suspend ${t.nome}? Neither they nor their ${t.clienti} clients will be able to sign in until you reactivate them. Nothing is deleted.`,
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-secondary" disabled={inInvio} onClick={() => setConferma(false)}>{tr('Annulla', 'Cancel')}</button>
            <button type="button" className="btn-danger" disabled={inInvio} onClick={esegui}>{inInvio ? tr('Un momento…', 'One moment…') : tr('Sì, sospendi', 'Yes, suspend')}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-ghost w-full text-sm" onClick={() => setConferma(true)}>
          {tr('Sospendi trainer', 'Suspend trainer')}
        </button>
      )}
      {errore && <p role="alert" className="alert-error mt-2">{errore}</p>}
    </div>
  );
}

function SchedaTrainer({ t, onCambiato }: { t: RigaTrainer; onCambiato: () => void }) {
  return (
    <li className="space-y-3 rounded-xl border border-line bg-field p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{t.nome}</span>
            {t.admin && <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-strong">{tr('Tu · admin', 'You · admin')}</span>}
            {t.sospeso && <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning">{tr('Sospeso', 'Suspended')}</span>}
          </p>
          <p className="truncate text-sm text-muted">{t.email}</p>
        </div>
        <p className="text-xs text-muted">{t.registratoIl ? tr(`Registrato il ${dataBreve(t.registratoIl)}`, `Joined on ${dataBreve(t.registratoIl)}`) : t.admin ? tr('Dall’inizio', 'From the start') : ''}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Numero valore={t.clienti} etichetta={tr('Clienti', 'Clients')} />
        <Numero valore={t.clientiAttivi} etichetta={tr('Attivi (30 giorni)', 'Active (30 days)')} />
        <Numero valore={t.schedeAttive} etichetta={tr('Schede attive', 'Active programmes')} />
        <Numero valore={t.allenamenti30} etichetta={tr('Allenamenti (30 giorni)', 'Workouts (30 days)')} />
        <Numero valore={t.ultimoAllenamento ? giorniFa(t.ultimoAllenamento) : '—'} etichetta={tr('Ultimo allenamento', 'Last workout')} />
      </div>
      {!t.admin && <SospensioneTrainer t={t} onCambiato={onCambiato} />}
    </li>
  );
}

// Programmi in arrivo: quante persone aspettano ciascuno e, per ognuno, "Avvisa chi aspetta":
// un messaggio che chi ha toccato "Avvisami" vedrà nell'app (pallino su "Programmi").
function RiquadroProgrammi({ dati, onInviato }: { dati: DatiProgrammiAdmin; onInviato: () => void }) {
  const [aperto, setAperto] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const [esito, setEsito] = useState('');
  const [errore, setErrore] = useState('');

  function apri(chiave: string, nome: string) {
    setAperto(chiave);
    setMessaggio(tr(`Il programma ${nome} è pronto!`, `The ${nome} plan is ready!`));
    setErrore('');
    setEsito('');
  }

  async function invia(chiave: string) {
    if (inInvio || !messaggio.trim()) return;
    setInInvio(true);
    setErrore('');
    try {
      const r = await inviaAnnuncioProgramma(chiave, messaggio.trim());
      setEsito(r.destinatari === 1 ? tr('Inviato a 1 persona.', 'Sent to 1 person.') : tr(`Inviato a ${r.destinatari} persone.`, `Sent to ${r.destinatari} people.`));
      setAperto(null);
      onInviato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setInInvio(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
      <p className="text-sm font-semibold">{tr('Programmi in arrivo · chi vuole essere avvisato', 'Upcoming plans · who wants to be notified')}</p>
      <ul className="mt-2 divide-y divide-line text-sm">
        {PROGRAMMI().map((p) => {
          const quanti = dati.conteggi[p.chiave] ?? 0;
          const ultimo = dati.ultimiAnnunci?.[p.chiave];
          return (
            <li key={p.chiave} className="space-y-2 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{p.nome}</span>
                <span className="flex items-center gap-3">
                  <strong className="tabular-nums">{quanti}</strong>
                  {aperto !== p.chiave && (
                    <button type="button" className="btn-ghost min-h-9 px-2 text-xs" disabled={quanti === 0} onClick={() => apri(p.chiave, p.nome)}>
                      {tr('Avvisa chi aspetta', 'Notify those waiting')}
                    </button>
                  )}
                </span>
              </div>
              {ultimo && (
                <p className="text-xs text-muted break-words">
                  {tr('Ultimo messaggio', 'Last message')} ({dataBreve(ultimo.creatoIl)}): “{ultimo.messaggio}”
                </p>
              )}
              {aperto === p.chiave && (
                <div className="space-y-2">
                  <label htmlFor={`annuncio-${p.chiave}`} className="label">
                    {quanti === 1 ? tr('Messaggio per 1 persona', 'Message for 1 person') : tr(`Messaggio per ${quanti} persone`, `Message for ${quanti} people`)}
                  </label>
                  <textarea id={`annuncio-${p.chiave}`} className="input min-h-20" maxLength={300} value={messaggio} onChange={(e) => setMessaggio(e.target.value)} />
                  <p className="text-xs text-muted">{tr('Lo vedranno nell’app, nella sezione Programmi (con un pallino rosso). Niente email né notifiche sul telefono.', 'They’ll see it in the app, in the Plans section (with a red dot). No emails or phone notifications.')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary min-h-10 px-4 text-sm" disabled={inInvio || !messaggio.trim()} onClick={() => invia(p.chiave)}>
                      {inInvio ? tr('Invio…', 'Sending…') : tr('Invia', 'Send')}
                    </button>
                    <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={() => setAperto(null)}>{tr('Annulla', 'Cancel')}</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {esito && <p className="mt-2 text-sm font-semibold text-success">{esito}</p>}
      {errore && <p className="alert-error mt-2">{errore}</p>}
    </div>
  );
}

export default function PanoramicaTrainer() {
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState('');
  // Quante persone hanno chiesto "Avvisami" per ogni programma in arrivo (solo numeri).
  const [programmi, setProgrammi] = useState<DatiProgrammiAdmin | null>(null);

  async function carica() {
    setErrore('');
    getConteggiProgrammi()
      .then(setProgrammi)
      .catch(() => setProgrammi(null)); // backend vecchio: il riquadro semplicemente non compare
    try {
      setDati(await getPanoramicaTrainer());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento', 'Loading error'));
    }
  }

  useEffect(() => {
    carica();
  }, []);

  return (
    <section id="trainer-app" className="card scroll-mt-24 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">{tr('Solo amministratore', 'Administrator only')}</p>
          <h2 className="section-title">{tr('Trainer dell’app', 'App trainers')}</h2>
          <p className="mt-1 text-sm text-muted">
            {tr('Chi usa Liftio e quanto la usano i suoi clienti. Solo numeri: i dati dei clienti restano privati.', 'Who uses Liftio and how much their clients use it. Numbers only: client data stays private.')}
          </p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={carica} aria-label={tr('Aggiorna la panoramica', 'Refresh the overview')}>
          {tr('Aggiorna', 'Refresh')}
        </button>
      </div>

      {errore && <p className="alert-error">{errore}</p>}

      {dati && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Riquadro valore={dati.totali.trainer} etichetta={tr('Trainer', 'Trainers')} />
            <Riquadro valore={dati.totali.clienti} etichetta={tr('Clienti in totale', 'Total clients')} />
            <Riquadro valore={dati.totali.clientiAttivi} etichetta={tr('Clienti attivi (30 giorni)', 'Active clients (30 days)')} />
            <Riquadro valore={dati.totali.allenamenti30} etichetta={tr('Allenamenti (30 giorni)', 'Workouts (30 days)')} />
          </div>
          {/* Solo il numero: di chi si allena da solo l'amministratore non vede nomi né dati */}
          {dati.totali.autonomi !== undefined && (
            <p className="text-sm text-muted">
              {tr('Si allenano da soli, senza trainer:', 'Training on their own, without a trainer:')} <strong className="text-ink tabular-nums">{dati.totali.autonomi}</strong>
            </p>
          )}
          {programmi && <RiquadroProgrammi dati={programmi} onInviato={carica} />}
          <ul className="space-y-3">
            {dati.trainer.map((t) => (
              <SchedaTrainer key={t.id} t={t} onCambiato={carica} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
