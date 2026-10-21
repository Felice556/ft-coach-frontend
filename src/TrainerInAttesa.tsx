import { useEffect, useState } from 'react';
import { approvaTrainer, FASCE_CLIENTI, getTrainerInAttesa, rifiutaTrainer, TrainerInAttesa as Richiesta } from './api';
import { locale, tr } from './lingua';

// Solo per l'amministratore: i trainer che si sono registrati da soli (senza invito)
// e aspettano di essere approvati. Finché non li approvi non possono fare niente.

const dataOra = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function RigaRichiesta({ r, onFatto }: { r: Richiesta; onFatto: (approvato: boolean) => void }) {
  const [conferma, setConferma] = useState<'approva' | 'rifiuta' | null>(null);
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');

  async function esegui(azione: 'approva' | 'rifiuta') {
    setInInvio(true);
    setErrore('');
    try {
      if (azione === 'approva') await approvaTrainer(r.id);
      else await rifiutaTrainer(r.id);
      onFatto(azione === 'approva');
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Operazione non riuscita', 'Operation failed'));
      setInInvio(false);
      setConferma(null);
    }
  }

  return (
    <li className="space-y-3 rounded-xl border border-line bg-field p-4">
      <div className="min-w-0">
        <p className="font-semibold">{r.nome}</p>
        <p className="truncate text-sm text-muted">{r.email}</p>
        {r.richiestaIl && <p className="mt-0.5 text-xs text-muted">{tr(`Richiesta del ${dataOra(r.richiestaIl)}`, `Requested on ${dataOra(r.richiestaIl)}`)}</p>}
      </div>
      {r.fasciaClienti && (
        <p className="text-sm">
          <span className="text-muted">{tr('Clienti seguiti: ', 'Clients trained: ')}</span>
          <span className="font-semibold">{FASCE_CLIENTI.find((f) => f.valore === r.fasciaClienti)?.testo.toLowerCase() ?? r.fasciaClienti}</span>
        </p>
      )}
      {r.presentazione && (
        <p className="whitespace-pre-line rounded-lg bg-surface-2 px-3 py-2 text-sm leading-6 text-soft">“{r.presentazione}”</p>
      )}
      {errore && <p role="alert" className="alert-error">{errore}</p>}
      {conferma === null ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary" onClick={() => setConferma('approva')}>{tr('Approva', 'Approve')}</button>
          <button type="button" className="btn-ghost" onClick={() => setConferma('rifiuta')}>{tr('Rifiuta', 'Reject')}</button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
          <p className="text-sm text-soft">
            {conferma === 'approva'
              ? tr(
                  `Approvi ${r.nome}? Potrà usare Liftio come trainer, con i suoi clienti (non vedrà mai i tuoi).`,
                  `Approve ${r.nome}? They’ll be able to use Liftio as a trainer, with their own clients (they’ll never see yours).`,
                )
              : tr(
                  `Rifiuti ${r.nome}? La richiesta e l’account in attesa verranno cancellati.`,
                  `Reject ${r.nome}? The request and the pending account will be deleted.`,
                )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={conferma === 'approva' ? 'btn-primary' : 'btn-danger'}
              disabled={inInvio}
              onClick={() => esegui(conferma)}
            >
              {inInvio ? tr('Un momento…', 'One moment…') : conferma === 'approva' ? tr('Sì, approva', 'Yes, approve') : tr('Sì, rifiuta', 'Yes, reject')}
            </button>
            <button type="button" className="btn-secondary" disabled={inInvio} onClick={() => setConferma(null)}>{tr('Annulla', 'Cancel')}</button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function TrainerInAttesa({ onCambio }: { onCambio: (quanti: number, approvato?: boolean) => void }) {
  const [richieste, setRichieste] = useState<Richiesta[] | null>(null);
  const [errore, setErrore] = useState('');

  async function carica() {
    setErrore('');
    try {
      const lista = await getTrainerInAttesa();
      setRichieste(lista);
      onCambio(lista.length);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento', 'Loading error'));
    }
  }

  useEffect(() => {
    carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tolta(id: number, approvato: boolean) {
    const resto = (richieste ?? []).filter((r) => r.id !== id);
    setRichieste(resto);
    onCambio(resto.length, approvato);
  }

  return (
    <section id="trainer-in-attesa" className="card scroll-mt-24 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">{tr('Solo amministratore', 'Administrator only')}</p>
          <h2 className="section-title">{tr('Trainer in attesa', 'Pending trainers')}</h2>
          <p className="mt-1 text-sm text-muted">{tr('Trainer che si sono registrati da soli. Finché non li approvi non possono usare l’app.', 'Trainers who signed up on their own. Until you approve them they can’t use the app.')}</p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={carica} aria-label={tr('Aggiorna le richieste', 'Refresh requests')}>{tr('Aggiorna', 'Refresh')}</button>
      </div>
      {errore && <p className="alert-error">{errore}</p>}
      {richieste && richieste.length === 0 && <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{tr('Nessuna richiesta in attesa.', 'No pending requests.')}</p>}
      {richieste && richieste.length > 0 && (
        <ul className="space-y-3">
          {richieste.map((r) => (
            <RigaRichiesta key={r.id} r={r} onFatto={(approvato) => tolta(r.id, approvato)} />
          ))}
        </ul>
      )}
    </section>
  );
}
