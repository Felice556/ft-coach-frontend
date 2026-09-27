import { useEffect, useState } from 'react';
import { creaScheda, cancellaScheda, getSchede, Scheda } from './api';

type EsercizioBozza = {
  nome: string;
  videoUrl: string;
  serieTarget: string;
  repsTarget: string;
  recuperoSecondi: string;
};

const esercizioVuoto = (): EsercizioBozza => ({
  nome: '',
  videoUrl: '',
  serieTarget: '3',
  repsTarget: '10',
  recuperoSecondi: '60',
});

export default function TrainerDashboard() {
  const [schede, setSchede] = useState<Scheda[]>([]);
  const [errore, setErrore] = useState('');

  const [nomeScheda, setNomeScheda] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [esercizi, setEsercizi] = useState<EsercizioBozza[]>([esercizioVuoto()]);

  async function caricaSchede() {
    try {
      const dati = await getSchede();
      setSchede(dati);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento schede');
    }
  }

  // Al primo render, carica tutte le schede esistenti (utile per vedere subito
  // cosa hai già assegnato ai clienti).
  useEffect(() => {
    caricaSchede();
  }, []);

  function aggiornaEsercizio(indice: number, campo: keyof EsercizioBozza, valore: string) {
    setEsercizi(esercizi.map((es, i) => (i === indice ? { ...es, [campo]: valore } : es)));
  }

  function aggiungiRigaEsercizio() {
    setEsercizi([...esercizi, esercizioVuoto()]);
  }

  function rimuoviRigaEsercizio(indice: number) {
    setEsercizi(esercizi.filter((_, i) => i !== indice));
  }

  async function handleCreaScheda(e: React.FormEvent) {
    e.preventDefault();
    setErrore('');
    try {
      const eserciziValidati = esercizi.map((es) => ({
        nome: es.nome,
        videoUrl: es.videoUrl || undefined,
        serieTarget: Number(es.serieTarget),
        repsTarget: Number(es.repsTarget),
        recuperoSecondi: Number(es.recuperoSecondi),
      }));

      await creaScheda(nomeScheda, Number(clienteId), eserciziValidati);

      // Reset form e ricarica la lista, così la nuova scheda appare subito.
      setNomeScheda('');
      setClienteId('');
      setEsercizi([esercizioVuoto()]);
      await caricaSchede();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nella creazione della scheda');
    }
  }

  async function handleCancella(id: number) {
    try {
      await cancellaScheda(id);
      // Aggiorniamo lo stato locale filtrando, invece di rifare una fetch completa:
      // stesso pattern di delete visto nel task manager.
      setSchede(schede.filter((s) => s.id !== id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nella cancellazione');
    }
  }

  return (
    <div className="space-y-10">
      <section className="card sm:p-6">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
          <span className="h-5 w-1.5 rounded-full bg-accent" />
          Nuova scheda
        </h2>
        <form onSubmit={handleCreaScheda} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Nome scheda</label>
              <input
                className="input"
                placeholder="Nome scheda (es. Full Body A)"
                value={nomeScheda}
                onChange={(e) => setNomeScheda(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">ID cliente</label>
              <input
                className="input"
                placeholder="ID cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold tracking-wide text-neutral-700 uppercase">Esercizi</h3>
            <div className="space-y-3">
              {esercizi.map((es, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 transition focus-within:border-accent"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    {esercizi.length > 1 && (
                      <button
                        type="button"
                        className="btn-danger px-3 py-1 text-xs"
                        onClick={() => rimuoviRigaEsercizio(i)}
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    <div className="col-span-3 sm:col-span-3">
                      <label className="label">Esercizio</label>
                      <input
                        className="input"
                        placeholder="Nome esercizio"
                        value={es.nome}
                        onChange={(e) => aggiornaEsercizio(i, 'nome', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-3">
                      <label className="label">Video</label>
                      <input
                        className="input"
                        placeholder="Link video (opzionale)"
                        value={es.videoUrl}
                        onChange={(e) => aggiornaEsercizio(i, 'videoUrl', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Serie</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="Serie"
                        value={es.serieTarget}
                        onChange={(e) => aggiornaEsercizio(i, 'serieTarget', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Reps</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="Reps"
                        value={es.repsTarget}
                        onChange={(e) => aggiornaEsercizio(i, 'repsTarget', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Rec. (sec)</label>
                      <input
                        className="input"
                        type="number"
                        placeholder="Recupero (sec)"
                        value={es.recuperoSecondi}
                        onChange={(e) => aggiornaEsercizio(i, 'recuperoSecondi', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary mt-3 w-full border-dashed sm:w-auto" onClick={aggiungiRigaEsercizio}>
              + Aggiungi esercizio
            </button>
          </div>

          <div className="flex justify-end border-t border-neutral-200 pt-5">
            <button type="submit" className="btn-primary w-full px-6 py-2.5 sm:w-auto">
              Crea scheda
            </button>
          </div>
        </form>
      </section>

      {errore && <p className="alert-error">{errore}</p>}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <span className="h-5 w-1.5 rounded-full bg-accent" />
          Schede esistenti
        </h2>
        {schede.length === 0 && (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
            Nessuna scheda ancora creata.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {schede.map((scheda) => (
            <div key={scheda.id} className="card flex flex-col transition hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-lg font-bold">{scheda.nome}</strong>
                  <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                    cliente #{scheda.clienteId}
                  </span>
                </div>
                <button className="btn-danger shrink-0 px-3 py-1.5 text-xs" onClick={() => handleCancella(scheda.id)}>
                  Cancella scheda
                </button>
              </div>
              <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
                {scheda.esercizi.map((es) => (
                  <li key={es.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium">{es.nome}</span>
                    <span className="shrink-0 text-neutral-500">
                      <span className="font-semibold text-ink">
                        {es.serieTarget}x{es.repsTarget}
                      </span>{' '}
                      · {es.recuperoSecondi}s
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
