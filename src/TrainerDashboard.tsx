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
    <div>
      <section style={{ marginTop: 24 }}>
        <h2>Nuova scheda</h2>
        <form onSubmit={handleCreaScheda}>
          <input
            placeholder="Nome scheda (es. Full Body A)"
            value={nomeScheda}
            onChange={(e) => setNomeScheda(e.target.value)}
            required
          />
          <input
            placeholder="ID cliente"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            required
          />

          <h3>Esercizi</h3>
          {esercizi.map((es, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                placeholder="Nome esercizio"
                value={es.nome}
                onChange={(e) => aggiornaEsercizio(i, 'nome', e.target.value)}
                required
              />
              <input
                placeholder="Link video (opzionale)"
                value={es.videoUrl}
                onChange={(e) => aggiornaEsercizio(i, 'videoUrl', e.target.value)}
              />
              <input
                type="number"
                placeholder="Serie"
                value={es.serieTarget}
                onChange={(e) => aggiornaEsercizio(i, 'serieTarget', e.target.value)}
              />
              <input
                type="number"
                placeholder="Reps"
                value={es.repsTarget}
                onChange={(e) => aggiornaEsercizio(i, 'repsTarget', e.target.value)}
              />
              <input
                type="number"
                placeholder="Recupero (sec)"
                value={es.recuperoSecondi}
                onChange={(e) => aggiornaEsercizio(i, 'recuperoSecondi', e.target.value)}
              />
              {esercizi.length > 1 && (
                <button type="button" onClick={() => rimuoviRigaEsercizio(i)}>
                  Rimuovi
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={aggiungiRigaEsercizio}>
            + Aggiungi esercizio
          </button>

          <div style={{ marginTop: 12 }}>
            <button type="submit">Crea scheda</button>
          </div>
        </form>
      </section>

      {errore && <p style={{ color: 'crimson' }}>{errore}</p>}

      <section style={{ marginTop: 32 }}>
        <h2>Schede esistenti</h2>
        {schede.length === 0 && <p>Nessuna scheda ancora creata.</p>}
        {schede.map((scheda) => (
          <div key={scheda.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>
                {scheda.nome} (cliente #{scheda.clienteId})
              </strong>
              <button onClick={() => handleCancella(scheda.id)}>Cancella scheda</button>
            </div>
            <ul>
              {scheda.esercizi.map((es) => (
                <li key={es.id}>
                  {es.nome} — {es.serieTarget}x{es.repsTarget}, recupero {es.recuperoSecondi}s
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
