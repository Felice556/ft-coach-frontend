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
    return <p>Il tuo trainer non ti ha ancora assegnato una scheda.</p>;
  }

  return (
    <div>
      {errore && <p style={{ color: 'crimson' }}>{errore}</p>}
      {messaggio && <p style={{ color: 'seagreen' }}>{messaggio}</p>}

      {schede.map((scheda) => (
        <section key={scheda.id} style={{ marginTop: 24 }}>
          <h2>{scheda.nome}</h2>

          {scheda.esercizi.map((es) => (
            <div key={es.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12 }}>
              <h3>{es.nome}</h3>
              <p>
                Target: {es.serieTarget} serie x {es.repsTarget} reps — recupero {es.recuperoSecondi}s
              </p>
              {es.videoUrl && (
                <p>
                  <a href={es.videoUrl} target="_blank" rel="noreferrer">
                    Guarda il video
                  </a>
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Peso (kg)"
                  value={pesoInput[es.id] || ''}
                  onChange={(e) => setPesoInput({ ...pesoInput, [es.id]: e.target.value })}
                  style={{ width: 100 }}
                />
                <input
                  type="number"
                  placeholder="Reps fatte"
                  value={repsInput[es.id] || ''}
                  onChange={(e) => setRepsInput({ ...repsInput, [es.id]: e.target.value })}
                  style={{ width: 100 }}
                />
                <button onClick={() => handleRegistra(es.id)}>Registra allenamento</button>
                <button onClick={() => toggleStorico(es.id)}>
                  {storicoAperto === es.id ? 'Nascondi storico' : 'Vedi storico'}
                </button>
              </div>

              {storicoAperto === es.id && (
                <ul style={{ marginTop: 8 }}>
                  {storico.length === 0 && <li>Nessun allenamento registrato ancora.</li>}
                  {storico.map((r) => (
                    <li key={r.id}>
                      {new Date(r.data).toLocaleDateString('it-IT')}: {r.pesoUsato}kg x {r.repsFatte} reps
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
