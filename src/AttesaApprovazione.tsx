import { useEffect, useState } from 'react';
import { getMe } from './api';

// Schermata per il trainer che si è registrato da solo e aspetta l'approvazione dell'amministratore.
// Al posto della dashboard: non può fare niente finché non viene approvato.
export default function AttesaApprovazione({ onApprovato }: { onApprovato: () => void }) {
  const [controllo, setControllo] = useState(false);
  const [messaggio, setMessaggio] = useState('');

  async function controlla(manuale: boolean) {
    setControllo(true);
    setMessaggio('');
    try {
      const me = await getMe();
      if (!me.inAttesa) {
        onApprovato();
        return;
      }
      if (manuale) setMessaggio('Ancora in attesa. Riprova più tardi.');
    } catch {
      if (manuale) setMessaggio('Non riesco a controllare adesso. Riprova tra poco.');
    } finally {
      setControllo(false);
    }
  }

  // Appena si apre (es. il giorno dopo) controlliamo se nel frattempo è stato approvato.
  useEffect(() => {
    controlla(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex justify-center">
      <div className="card w-full max-w-md space-y-5 p-6 sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-ink" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        </span>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Richiesta inviata</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Il tuo account trainer è <strong className="text-ink">in attesa di approvazione</strong>. Appena l’amministratore di Liftio
            lo approva potrai creare i tuoi clienti e le loro schede. Di solito ci vuole poco: riapri l’app più tardi.
          </p>
        </div>
        {messaggio && <p role="status" className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-soft">{messaggio}</p>}
        <button type="button" className="btn-primary w-full py-3 uppercase tracking-wide" disabled={controllo} onClick={() => controlla(true)}>
          {controllo ? 'Controllo…' : 'Controlla di nuovo'}
        </button>
      </div>
    </div>
  );
}
