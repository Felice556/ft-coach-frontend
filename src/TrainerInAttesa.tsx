import { useEffect, useState } from 'react';
import { approvaTrainer, FASCE_CLIENTI, getTrainerInAttesa, rifiutaTrainer, TrainerInAttesa as Richiesta } from './api';

// Solo per l'amministratore: i trainer che si sono registrati da soli (senza invito)
// e aspettano di essere approvati. Finché non li approvi non possono fare niente.

const dataOra = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

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
      setErrore(err instanceof Error ? err.message : 'Operazione non riuscita');
      setInInvio(false);
      setConferma(null);
    }
  }

  return (
    <li className="space-y-3 rounded-xl border border-line bg-field p-4">
      <div className="min-w-0">
        <p className="font-semibold">{r.nome}</p>
        <p className="truncate text-sm text-muted">{r.email}</p>
        {r.richiestaIl && <p className="mt-0.5 text-xs text-muted">Richiesta del {dataOra(r.richiestaIl)}</p>}
      </div>
      {r.fasciaClienti && (
        <p className="text-sm">
          <span className="text-muted">Clienti seguiti: </span>
          <span className="font-semibold">{FASCE_CLIENTI.find((f) => f.valore === r.fasciaClienti)?.testo.toLowerCase() ?? r.fasciaClienti}</span>
        </p>
      )}
      {r.presentazione && (
        <p className="whitespace-pre-line rounded-lg bg-surface-2 px-3 py-2 text-sm leading-6 text-soft">“{r.presentazione}”</p>
      )}
      {errore && <p role="alert" className="alert-error">{errore}</p>}
      {conferma === null ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary" onClick={() => setConferma('approva')}>Approva</button>
          <button type="button" className="btn-ghost" onClick={() => setConferma('rifiuta')}>Rifiuta</button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
          <p className="text-sm text-soft">
            {conferma === 'approva'
              ? `Approvi ${r.nome}? Potrà usare Liftio come trainer, con i suoi clienti (non vedrà mai i tuoi).`
              : `Rifiuti ${r.nome}? La richiesta e l’account in attesa verranno cancellati.`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={conferma === 'approva' ? 'btn-primary' : 'btn-danger'}
              disabled={inInvio}
              onClick={() => esegui(conferma)}
            >
              {inInvio ? 'Un momento…' : conferma === 'approva' ? 'Sì, approva' : 'Sì, rifiuta'}
            </button>
            <button type="button" className="btn-secondary" disabled={inInvio} onClick={() => setConferma(null)}>Annulla</button>
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
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento');
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
          <p className="eyebrow mb-1">Solo amministratore</p>
          <h2 className="section-title">Trainer in attesa</h2>
          <p className="mt-1 text-sm text-muted">Trainer che si sono registrati da soli. Finché non li approvi non possono usare l’app.</p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={carica} aria-label="Aggiorna le richieste">Aggiorna</button>
      </div>
      {errore && <p className="alert-error">{errore}</p>}
      {richieste && richieste.length === 0 && <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">Nessuna richiesta in attesa.</p>}
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
