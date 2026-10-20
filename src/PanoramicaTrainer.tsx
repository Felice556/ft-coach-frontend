import { useEffect, useState } from 'react';
import { getPanoramicaTrainer, PanoramicaTrainer as Dati, RigaTrainer } from './api';

// Solo per l'amministratore: quanti trainer usano l'app e quanto la usano i loro clienti.
// Mostra solo numeri: i nomi dei clienti degli altri trainer non arrivano mai qui.

const dataBreve = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

function giorniFa(iso: string) {
  const giorni = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (giorni <= 0) return 'oggi';
  if (giorni === 1) return 'ieri';
  return `${giorni} giorni fa`;
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

function SchedaTrainer({ t }: { t: RigaTrainer }) {
  return (
    <li className="space-y-3 rounded-xl border border-line bg-field p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{t.nome}</span>
            {t.admin && <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-strong">Tu · admin</span>}
          </p>
          <p className="truncate text-sm text-muted">{t.email}</p>
        </div>
        <p className="text-xs text-muted">{t.registratoIl ? `Registrato il ${dataBreve(t.registratoIl)}` : t.admin ? 'Dall’inizio' : ''}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Numero valore={t.clienti} etichetta="Clienti" />
        <Numero valore={t.clientiAttivi} etichetta="Attivi (30 giorni)" />
        <Numero valore={t.schedeAttive} etichetta="Schede attive" />
        <Numero valore={t.allenamenti30} etichetta="Allenamenti (30 giorni)" />
        <Numero valore={t.ultimoAllenamento ? giorniFa(t.ultimoAllenamento) : '—'} etichetta="Ultimo allenamento" />
      </div>
    </li>
  );
}

export default function PanoramicaTrainer() {
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState('');

  async function carica() {
    setErrore('');
    try {
      setDati(await getPanoramicaTrainer());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento');
    }
  }

  useEffect(() => {
    carica();
  }, []);

  return (
    <section id="trainer-app" className="card scroll-mt-24 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Solo amministratore</p>
          <h2 className="section-title">Trainer dell’app</h2>
          <p className="mt-1 text-sm text-muted">
            Chi usa Liftio e quanto la usano i suoi clienti. Solo numeri: i dati dei clienti restano privati.
          </p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={carica} aria-label="Aggiorna la panoramica">
          Aggiorna
        </button>
      </div>

      {errore && <p className="alert-error">{errore}</p>}

      {dati && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Riquadro valore={dati.totali.trainer} etichetta="Trainer" />
            <Riquadro valore={dati.totali.clienti} etichetta="Clienti in totale" />
            <Riquadro valore={dati.totali.clientiAttivi} etichetta="Clienti attivi (30 giorni)" />
            <Riquadro valore={dati.totali.allenamenti30} etichetta="Allenamenti (30 giorni)" />
          </div>
          <ul className="space-y-3">
            {dati.trainer.map((t) => (
              <SchedaTrainer key={t.id} t={t} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
