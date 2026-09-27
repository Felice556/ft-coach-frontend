import { useEffect, useState } from 'react';
import { getSchede, registraAllenamento, getStorico, Scheda, RegistroAllenamento } from './api';

export default function ClienteDashboard() {
  const [schede, setSchede] = useState<Scheda[]>([]);
  const [errore, setErrore] = useState('');
  const [messaggio, setMessaggio] = useState('');

  // Un piccolo "form aperto" per esercizio: teniamo peso/reps digitati per ogni
  // esercizio in un oggetto indicizzato per id, invece di uno stato per riga.
  const [pesoInput, setPesoInput] = useState<Record<number, string>>({});
  const [repsInput, setRepsInput] = useState<Record<number, string>>({});

  // Storico aperto: quale esercizio sta mostrando lo storico, e i dati caricati.
  const [storicoAperto, setStoricoAperto] = useState<number | null>(null);
  const [storico, setStorico] = useState<RegistroAllenamento[]>([]);

  async function caricaSchede() {
    try {
      const dati = await getSchede();
      setSchede(dati);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento della scheda');
    }
  }

  useEffect(() => {
    caricaSchede();
  }, []);

  async function handleRegistra(esercizioId: number) {
    setErrore('');
    setMessaggio('');
    const peso = Number(pesoInput[esercizioId]);
    const reps = Number(repsInput[esercizioId]);

    if (!peso || !reps) {
      setErrore('Inserisci peso e ripetizioni');
      return;
    }

    try {
      await registraAllenamento(esercizioId, peso, reps);
      setMessaggio('Allenamento registrato!');
      // Se lo storico di questo esercizio è aperto, lo ricarichiamo per mostrare
      // subito il nuovo dato senza dover chiudere e riaprire.
      if (storicoAperto === esercizioId) {
        const dati = await getStorico(esercizioId);
        setStorico(dati);
      }
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nella registrazione');
    }
  }

  async function toggleStorico(esercizioId: number) {
    if (storicoAperto === esercizioId) {
      setStoricoAperto(null);
      return;
    }
    try {
      const dati = await getStorico(esercizioId);
      setStorico(dati);
      setStoricoAperto(esercizioId);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento storico');
    }
  }

  if (schede.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
        Il tuo trainer non ti ha ancora assegnato una scheda.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {(errore || messaggio) && (
        <div className="space-y-2">
          {errore && <p className="alert-error">{errore}</p>}
          {messaggio && <p className="alert-success">{messaggio}</p>}
        </div>
      )}

      {schede.map((scheda) => (
        <section key={scheda.id}>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <span className="h-5 w-1.5 rounded-full bg-accent" />
            {scheda.nome}
          </h2>

          <div className="space-y-4">
            {scheda.esercizi.map((es) => (
              <div
                key={es.id}
                className={`card border-l-4 transition ${
                  storicoAperto === es.id ? 'border-l-accent shadow-md' : 'border-l-transparent hover:border-l-accent'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">{es.nome}</h3>
                  {es.videoUrl && (
                    <a
                      href={es.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-link text-sm"
                    >
                      ▶ Guarda il video
                    </a>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-lg bg-neutral-100 px-3 py-1">
                    <span className="font-bold">{es.serieTarget}</span> serie
                  </span>
                  <span className="rounded-lg bg-neutral-100 px-3 py-1">
                    <span className="font-bold">{es.repsTarget}</span> reps
                  </span>
                  <span className="rounded-lg bg-neutral-100 px-3 py-1">
                    recupero <span className="font-bold">{es.recuperoSecondi}s</span>
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:items-end">
                  <div className="sm:w-32">
                    <label className="label">Peso (kg)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="Peso (kg)"
                      value={pesoInput[es.id] || ''}
                      onChange={(e) => setPesoInput({ ...pesoInput, [es.id]: e.target.value })}
                    />
                  </div>
                  <div className="sm:w-32">
                    <label className="label">Reps</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="Reps fatte"
                      value={repsInput[es.id] || ''}
                      onChange={(e) => setRepsInput({ ...repsInput, [es.id]: e.target.value })}
                    />
                  </div>
                  <button className="btn-primary col-span-2 sm:col-span-1" onClick={() => handleRegistra(es.id)}>
                    Registra allenamento
                  </button>
                  <button className="btn-secondary col-span-2 sm:col-span-1" onClick={() => toggleStorico(es.id)}>
                    {storicoAperto === es.id ? 'Nascondi storico' : 'Vedi storico'}
                  </button>
                </div>

                {storicoAperto === es.id && (
                  <ul className="mt-5 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-neutral-50 text-sm">
                    {storico.length === 0 && (
                      <li className="px-4 py-3 text-neutral-500">Nessun allenamento registrato ancora.</li>
                    )}
                    {storico.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="text-neutral-500">{new Date(r.data).toLocaleDateString('it-IT')}</span>
                        <span>
                          <span className="font-bold">{r.pesoUsato}kg</span> x {r.repsFatte} reps
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
