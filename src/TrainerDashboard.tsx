import { useEffect, useRef, useState } from 'react';
import {
  creaScheda,
  aggiornaScheda,
  cancellaScheda,
  getSchede,
  getStorico,
  getPreset,
  creaPreset,
  cancellaPreset,
  Scheda,
  RegistroAllenamento,
  EsercizioPreset,
} from './api';

type EsercizioBozza = {
  // Presente solo per esercizi già salvati: serve al backend per aggiornarli
  // invece di ricrearli (così lo storico del cliente non si perde).
  id?: number;
  nome: string;
  videoUrl: string;
  descrizione: string;
  serieTarget: string;
  repsTarget: string;
  recuperoSecondi: string;
};

const esercizioVuoto = (): EsercizioBozza => ({
  nome: '',
  videoUrl: '',
  descrizione: '',
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

  // null = sto creando una scheda nuova; un numero = sto modificando quella scheda.
  // Lo stesso form serve per entrambe le cose.
  const [schedaInModifica, setSchedaInModifica] = useState<number | null>(null);
  const formRef = useRef<HTMLElement>(null);

  function resetForm() {
    setSchedaInModifica(null);
    setNomeScheda('');
    setClienteId('');
    setEsercizi([esercizioVuoto()]);
  }

  // Carica una scheda esistente nel form (gli input usano stringhe, i dati numeri).
  function avviaModifica(scheda: Scheda) {
    setErrore('');
    setSchedaInModifica(scheda.id);
    setNomeScheda(scheda.nome);
    setClienteId(String(scheda.clienteId));
    setEsercizi(
      scheda.esercizi.map((es) => ({
        id: es.id,
        nome: es.nome,
        videoUrl: es.videoUrl || '',
        descrizione: es.descrizione || '',
        serieTarget: String(es.serieTarget),
        repsTarget: String(es.repsTarget),
        recuperoSecondi: String(es.recuperoSecondi),
      }))
    );
    // Su telefono il form è in cima alla pagina: ci riportiamo lì.
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Storico letto in sola lettura dal trainer, per vedere cosa scrivono i clienti
  // dopo ogni allenamento (dolori, difficoltà, sensazioni).
  const [storicoAperto, setStoricoAperto] = useState<number | null>(null);
  const [storico, setStorico] = useState<RegistroAllenamento[]>([]);

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

  async function caricaSchede() {
    try {
      const dati = await getSchede();
      setSchede(dati);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento schede');
    }
  }

  // Libreria esercizi salvati: si clicca per aggiungere, invece di riscrivere.
  const [preset, setPreset] = useState<EsercizioPreset[]>([]);

  async function caricaPreset() {
    try {
      setPreset(await getPreset());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento della libreria');
    }
  }

  // Al primo render, carica schede e libreria esercizi.
  useEffect(() => {
    caricaSchede();
    caricaPreset();
  }, []);

  // Click su un preset: se l'ultima riga è ancora vuota la riempie,
  // altrimenti aggiunge una riga nuova. Serie/reps/recupero restano i default,
  // da adattare a mano per ogni cliente.
  function aggiungiDaPreset(p: EsercizioPreset) {
    const riga: EsercizioBozza = {
      ...esercizioVuoto(),
      nome: p.nome,
      videoUrl: p.videoUrl || '',
      descrizione: p.descrizione || '',
    };
    const ultima = esercizi[esercizi.length - 1];
    if (ultima && !ultima.nome.trim()) {
      setEsercizi([...esercizi.slice(0, -1), riga]);
    } else {
      setEsercizi([...esercizi, riga]);
    }
  }

  async function salvaComePreset(indice: number) {
    const es = esercizi[indice];
    if (!es.nome.trim()) {
      setErrore('Scrivi almeno il nome dell’esercizio prima di salvarlo');
      return;
    }
    // Evita doppioni con lo stesso nome nella libreria.
    if (preset.some((p) => p.nome.toLowerCase() === es.nome.trim().toLowerCase())) {
      setErrore(`"${es.nome}" è già nella tua libreria`);
      return;
    }
    try {
      setErrore('');
      await creaPreset(es.nome.trim(), es.videoUrl, es.descrizione);
      await caricaPreset();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio');
    }
  }

  async function handleCancellaPreset(id: number) {
    try {
      await cancellaPreset(id);
      setPreset(preset.filter((p) => p.id !== id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nella cancellazione');
    }
  }

  function aggiornaEsercizio(indice: number, campo: keyof EsercizioBozza, valore: string) {
    setEsercizi(esercizi.map((es, i) => (i === indice ? { ...es, [campo]: valore } : es)));
  }

  function aggiungiRigaEsercizio() {
    setEsercizi([...esercizi, esercizioVuoto()]);
  }

  function rimuoviRigaEsercizio(indice: number) {
    setEsercizi(esercizi.filter((_, i) => i !== indice));
  }

  async function handleSalvaScheda(e: React.FormEvent) {
    e.preventDefault();
    setErrore('');
    try {
      const eserciziValidati = esercizi.map((es) => ({
        nome: es.nome,
        videoUrl: es.videoUrl || undefined,
        descrizione: es.descrizione || undefined,
        serieTarget: Number(es.serieTarget),
        repsTarget: Number(es.repsTarget),
        recuperoSecondi: Number(es.recuperoSecondi),
      }));

      if (schedaInModifica !== null) {
        // Rimettiamo gli id sugli esercizi già esistenti, così il backend li aggiorna.
        const conId = eserciziValidati.map((dati, i) => ({ ...dati, id: esercizi[i].id }));
        await aggiornaScheda(schedaInModifica, nomeScheda, Number(clienteId), conId);
      } else {
        await creaScheda(nomeScheda, Number(clienteId), eserciziValidati);
      }

      // Reset form e ricarica la lista, così le modifiche appaiono subito.
      resetForm();
      await caricaSchede();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio della scheda');
    }
  }

  async function handleCancella(id: number) {
    try {
      await cancellaScheda(id);
      // Se stavo modificando proprio questa scheda, esco dalla modifica.
      if (schedaInModifica === id) resetForm();
      // Aggiorniamo lo stato locale filtrando, invece di rifare una fetch completa:
      // stesso pattern di delete visto nel task manager.
      setSchede(schede.filter((s) => s.id !== id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nella cancellazione');
    }
  }

  return (
    <div className="space-y-10">
      <section
        ref={formRef}
        className={`card scroll-mt-20 sm:p-6 ${schedaInModifica !== null ? 'ring-2 ring-accent' : ''}`}
      >
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
          <span className="h-5 w-1.5 rounded-full bg-accent" />
          {schedaInModifica !== null ? 'Modifica scheda' : 'Nuova scheda'}
        </h2>
        {schedaInModifica !== null && (
          <p className="mb-5 rounded-lg bg-accent-soft px-3 py-2 text-sm text-neutral-700">
            Stai modificando una scheda esistente. Lo storico degli esercizi che mantieni resta intatto;
            se rimuovi un esercizio, si perde anche il suo storico.
          </p>
        )}
        <form onSubmit={handleSalvaScheda} className="space-y-6">
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

            <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-neutral-500">
                La tua libreria — tocca per aggiungere
              </p>
              {preset.length === 0 ? (
                <p className="text-xs text-neutral-400">
                  Vuota. Scrivi un esercizio qui sotto e premi “Salva in libreria” per riusarlo le prossime volte.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {preset.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center overflow-hidden rounded-full border border-neutral-300 bg-neutral-50 text-sm"
                    >
                      <button
                        type="button"
                        className="px-3 py-1.5 font-medium transition hover:bg-accent"
                        onClick={() => aggiungiDaPreset(p)}
                      >
                        + {p.nome}
                      </button>
                      <button
                        type="button"
                        aria-label={`Rimuovi ${p.nome} dalla libreria`}
                        className="border-l border-neutral-300 px-2 py-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleCancellaPreset(p.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1 text-xs"
                        onClick={() => salvaComePreset(i)}
                      >
                        ☆ Salva in libreria
                      </button>
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
                  <div className="mt-3">
                    <label className="label">Note per il cliente (opzionale)</label>
                    <textarea
                      className="input min-h-[60px] resize-y"
                      placeholder='Es. "3x10 ma con 3 secondi di isometria in basso"'
                      value={es.descrizione}
                      onChange={(e) => aggiornaEsercizio(i, 'descrizione', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary mt-3 w-full border-dashed sm:w-auto" onClick={aggiungiRigaEsercizio}>
              + Aggiungi esercizio
            </button>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:justify-end">
            {schedaInModifica !== null && (
              <button type="button" className="btn-secondary w-full px-6 py-2.5 sm:w-auto" onClick={resetForm}>
                Annulla modifica
              </button>
            )}
            <button type="submit" className="btn-primary w-full px-6 py-2.5 sm:w-auto">
              {schedaInModifica !== null ? 'Salva modifiche' : 'Crea scheda'}
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
                <div className="flex shrink-0 gap-2">
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => avviaModifica(scheda)}
                    disabled={schedaInModifica === scheda.id}
                  >
                    {schedaInModifica === scheda.id ? 'In modifica…' : 'Modifica'}
                  </button>
                  <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => handleCancella(scheda.id)}>
                    Cancella
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
                {scheda.esercizi.map((es) => (
                  <li key={es.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{es.nome}</span>
                      <span className="shrink-0 text-neutral-500">
                        <span className="font-semibold text-ink">
                          {es.serieTarget}x{es.repsTarget}
                        </span>{' '}
                        · {es.recuperoSecondi}s
                      </span>
                    </div>
                    {es.descrizione && <p className="mt-1 text-xs text-neutral-500">{es.descrizione}</p>}

                    <button
                      type="button"
                      className="btn-link mt-1 text-xs"
                      onClick={() => toggleStorico(es.id)}
                    >
                      {storicoAperto === es.id ? 'Nascondi note cliente' : 'Vedi note cliente'}
                    </button>

                    {storicoAperto === es.id && (
                      <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
                        {storico.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-neutral-500">Nessun allenamento registrato ancora.</p>
                        ) : (
                          <ul className="divide-y divide-neutral-100">
                            {storico.map((r) => (
                              <li key={r.id} className="px-2 py-1.5 text-xs">
                                <div className="flex items-center justify-between gap-2 text-neutral-600">
                                  <span>{new Date(r.data).toLocaleDateString('it-IT')}</span>
                                  <span className="font-semibold text-ink">
                                    {r.pesoUsato}kg x {r.repsFatte}
                                  </span>
                                </div>
                                {r.nota && <p className="mt-0.5 italic text-neutral-500">"{r.nota}"</p>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
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
