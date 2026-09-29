import { useEffect, useState } from 'react';
import {
  getSchede,
  registraAllenamento,
  getStorico,
  modificaSerie,
  eliminaSerie,
  getSessioni,
  completaAllenamento,
  SessioneAllenamento,
  Scheda,
  Esercizio,
  RegistroAllenamento,
} from './api';
import ProgressoChart from './ProgressoChart';
import { pianoSerie, riassuntoSerie, testoReps, testoRecupero, SerieDaFare } from './serie';
import {
  impostaSuono,
  impostaVolume,
  leggiVolume,
  provaSuono,
  sbloccaAudio,
  suonoAttivo,
  suonoConteggio,
  suonoFine,
  tieniSchermoAcceso,
} from './suono';

// Valore di partenza del campo reps per una serie: il numero se è fisso,
// vuoto se è "Max" o un intervallo (6-9): lì il cliente scrive quante ne ha fatte davvero.
function repsDiPartenza(serie: SerieDaFare | undefined): string {
  if (!serie || serie.reps == null || serie.repsMax != null) return '';
  return String(serie.reps);
}

// ---------- Piccole utility ----------

// Sulla tastiera italiana del telefono il decimale è la virgola: "62,5".
// Number("62,5") darebbe NaN, quindi normalizziamo prima di convertire.
function leggiNumero(testo: string): number {
  return Number(testo.replace(',', '.'));
}

function scriviNumero(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2, useGrouping: false });
}

// Controllo comune per peso e ripetizioni: il peso può essere 0 (corpo libero)
// ma il campo non può restare vuoto; le ripetizioni devono essere almeno 1.
function valoriValidi(testoKg: string, testoReps: string): boolean {
  if (!testoKg.trim() || !testoReps.trim()) return false;
  const kg = leggiNumero(testoKg);
  const reps = leggiNumero(testoReps);
  // Tetto a 1000 come sul server: un "25000" digitato per sbaglio non finisce nei grafici.
  return !Number.isNaN(kg) && kg >= 0 && kg <= 1000 && Number.isInteger(reps) && reps >= 1 && reps <= 1000;
}

function eOggi(dataIso: string): boolean {
  return new Date(dataIso).toDateString() === new Date().toDateString();
}

function formattaTempo(secondi: number): string {
  const m = Math.floor(secondi / 60);
  const s = secondi % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------- Stepper: campo numerico con − / + grandi, comodo col pollice ----------

interface StepperProps {
  etichetta: string;
  valore: string;
  passo: number;
  minimo: number;
  decimali: boolean;
  segnaposto?: string; // testo grigio quando il campo è vuoto (es. "Max")
  compatto?: boolean; // versione più stretta, per la correzione dentro una riga
  onChange: (valore: string) => void;
}

function Stepper({
  etichetta,
  valore,
  passo,
  minimo,
  decimali,
  compatto = false,
  segnaposto = '0',
  onChange,
}: StepperProps) {
  // Bottoni − / + più stretti sui telefoni piccoli: lo spazio serve al numero (es. 102,5 kg).
  const larghezzaBottone = compatto ? 'w-9' : 'w-9 min-[380px]:w-10 sm:w-12';
  function cambia(delta: number) {
    const attuale = leggiNumero(valore) || 0;
    onChange(scriviNumero(Math.max(minimo, attuale + delta)));
  }

  return (
    <div>
      <span className="label text-center">{etichetta}</span>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-field transition focus-within:border-accent-strong focus-within:ring-2 focus-within:ring-accent-strong/15">
        <button
          type="button"
          aria-label={`Diminuisci ${etichetta}`}
          className={`${larghezzaBottone} shrink-0 text-2xl font-medium text-soft transition hover:bg-surface-2 active:bg-accent-soft`}
          onClick={() => cambia(-passo)}
        >
          −
        </button>
        <input
          // inputMode sceglie la tastiera del telefono: numerica con virgola per i kg,
          // solo cifre per le ripetizioni.
          inputMode={decimali ? 'decimal' : 'numeric'}
          aria-label={etichetta}
          className={`w-full min-w-0 bg-transparent px-0 text-center font-bold tracking-tight tabular-nums text-ink outline-none ${compatto ? 'min-h-12 text-lg' : 'min-h-14 text-[clamp(1.05rem,5.2vw,1.5rem)]'}`}
          value={valore}
          placeholder={segnaposto}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          aria-label={`Aumenta ${etichetta}`}
          className={`${larghezzaBottone} shrink-0 text-2xl font-medium text-soft transition hover:bg-surface-2 active:bg-accent-soft`}
          onClick={() => cambia(passo)}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ---------- Una serie registrata, correggibile o eliminabile ----------

interface SerieRigaProps {
  serie: RegistroAllenamento;
  etichetta: string; // "Serie 2" per oggi, oppure la data nei progressi
  onModificata: (nuova: RegistroAllenamento) => void;
  onEliminata: (id: number) => void;
}

function SerieRiga({ serie, etichetta, onModificata, onEliminata }: SerieRigaProps) {
  // 'vista' → riga normale; 'modifica' → campi aperti; 'conferma' → chiede conferma prima di eliminare.
  const [modalita, setModalita] = useState<'vista' | 'modifica' | 'conferma'>('vista');
  const [kg, setKg] = useState(scriviNumero(serie.pesoUsato));
  const [reps, setReps] = useState(String(serie.repsFatte));
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');

  // La richiesta di conferma si annulla da sola dopo 4 secondi:
  // un tocco sbagliato su "Elimina" non resta "armato".
  useEffect(() => {
    if (modalita !== 'conferma') return;
    const id = setTimeout(() => setModalita('vista'), 4000);
    return () => clearTimeout(id);
  }, [modalita]);

  function apriModifica() {
    // Ripartiamo sempre dai valori salvati, non da un tentativo precedente annullato.
    setKg(scriviNumero(serie.pesoUsato));
    setReps(String(serie.repsFatte));
    setErrore('');
    setModalita('modifica');
  }

  async function salva() {
    if (!valoriValidi(kg, reps)) {
      setErrore('Inserisci peso (anche 0) e ripetizioni');
      return;
    }
    const nuovoKg = leggiNumero(kg);
    const nuoveReps = leggiNumero(reps);
    setInInvio(true);
    try {
      const aggiornata = await modificaSerie(serie.id, nuovoKg, nuoveReps, serie.nota ?? undefined);
      onModificata(aggiornata);
      setModalita('vista');
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setInInvio(false);
    }
  }

  async function elimina() {
    setInInvio(true);
    try {
      await eliminaSerie(serie.id);
      onEliminata(serie.id);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nella cancellazione');
      setModalita('vista');
      setInInvio(false);
    }
  }

  if (modalita === 'modifica') {
    return (
      <li className="space-y-3 bg-surface-2 px-3 py-3">
        <p className="text-xs font-semibold tracking-wide text-accent-strong uppercase">Correggi · {etichetta}</p>
        <div className="grid grid-cols-2 gap-3">
          <Stepper etichetta="Kg" valore={kg} passo={2.5} minimo={0} decimali compatto onChange={setKg} />
          <Stepper etichetta="Reps" valore={reps} passo={1} minimo={1} decimali={false} compatto onChange={setReps} />
        </div>
        {errore && <p className="alert-error">{errore}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-secondary" onClick={() => setModalita('vista')} disabled={inInvio}>
            Annulla
          </button>
          <button className="btn-primary" onClick={salva} disabled={inInvio}>
            {inInvio ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-sm text-muted">{etichetta}</span>
        <span className="min-w-0 flex-1 text-sm whitespace-nowrap">
          <span className="font-bold">{scriviNumero(serie.pesoUsato)} kg</span>
          <span className="text-muted"> × {serie.repsFatte}</span>
        </span>
        {modalita === 'conferma' ? (
          <>
            <button className="btn-ghost min-h-9 px-3 text-xs" onClick={() => setModalita('vista')} disabled={inInvio}>
              No
            </button>
            <button className="btn-danger min-h-9 px-3 text-xs" onClick={elimina} disabled={inInvio}>
              {inInvio ? '…' : 'Elimina?'}
            </button>
          </>
        ) : (
          <>
            <button
              aria-label={`Correggi ${etichetta}`}
              className="btn-ghost min-h-9 w-9 px-0 text-sm"
              onClick={apriModifica}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 5Z" /></svg>
            </button>
            <button
              aria-label={`Elimina ${etichetta}`}
              className="btn-ghost min-h-9 w-9 px-0 text-sm text-muted hover:text-danger"
              onClick={() => setModalita('conferma')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" /></svg>
            </button>
          </>
        )}
      </div>
      {serie.nota && <p className="mt-1 pl-18 text-xs text-muted italic">“{serie.nota}”</p>}
      {errore && <p className="alert-error mt-2">{errore}</p>}
    </li>
  );
}

// ---------- Vista cliente ----------

type Timer = { nome: string; fine: number; totale: number };

// Icona altoparlante: con le onde se il suono è attivo, con la X se è silenziato.
function IconaVolume({ muto }: { muto: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      {muto ? (
        <path d="m16 9 5 6m0-6-5 6" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

export default function ClienteDashboard() {
  const [schede, setSchede] = useState<Scheda[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState('');
  // Errore legato a un esercizio: lo mostriamo DENTRO la sua card, perché sul
  // telefono un messaggio in cima alla pagina non si vedrebbe mentre sei in fondo.
  const [erroreEsercizio, setErroreEsercizio] = useState<{ id: number; testo: string } | null>(null);

  // Storico di ogni esercizio, caricato una volta sola all'inizio: serve per
  // precompilare il peso, contare le serie di oggi e mostrare i progressi.
  const [storici, setStorici] = useState<Record<number, RegistroAllenamento[]>>({});

  const [peso, setPeso] = useState<Record<number, string>>({});
  const [reps, setReps] = useState<Record<number, string>>({});
  const [nota, setNota] = useState<Record<number, string>>({});
  const [notaAperta, setNotaAperta] = useState<number | null>(null);
  const [progressiAperti, setProgressiAperti] = useState<number | null>(null);

  // Navigazione: null = home con l'elenco schede; un id = allenamento in corso su quella scheda.
  // Niente router: con due sole schermate basta uno stato.
  const [schedaAperta, setSchedaAperta] = useState<number | null>(null);
  // Allenamenti conclusi, salvati nel database (il trainer li vede).
  const [sessioni, setSessioni] = useState<SessioneAllenamento[]>([]);
  // Sessione appena chiusa: la mostriamo in home come riepilogo.
  const [riepilogo, setRiepilogo] = useState<SessioneAllenamento | null>(null);
  const [inChiusura, setInChiusura] = useState(false);
  // Esercizi con una serie in fase di salvataggio. Un insieme e non un solo id: in una
  // superserie si può registrare su due esercizi quasi insieme, e ognuno deve restare
  // bloccato finché la SUA richiesta non finisce (niente serie doppie per un doppio tocco).
  const [inInvio, setInInvio] = useState<Set<number>>(new Set());
  // Esercizi di cui non è stato possibile caricare lo storico: finché non si ricarica,
  // non facciamo registrare serie (il conteggio "serie 2 di 3" sarebbe sbagliato).
  const [storiciFalliti, setStoriciFalliti] = useState<Set<number>>(new Set());

  // Timer di recupero. Salviamo l'ORARIO di fine, non i secondi rimasti:
  // se il telefono blocca lo schermo e il browser rallenta, il conto resta giusto.
  const [timer, setTimer] = useState<Timer | null>(null);
  const [ora, setOra] = useState(Date.now());
  // Suono del timer: silenziato sì/no e volume (0-100), salvati su questo telefono.
  const [suono, setSuono] = useState(suonoAttivo);
  const [volume, setVolume] = useState(leggiVolume);

  useEffect(() => {
    async function carica() {
      try {
        const [dati, sessioniSalvate] = await Promise.all([getSchede(), getSessioni()]);
        setSchede(dati);
        setSessioni(sessioniSalvate);

        const tutti = dati.flatMap((s) => s.esercizi);
        // Tutte le richieste partono insieme. allSettled (e non all): se lo storico di UN
        // esercizio non arriva (rete ballerina in palestra), gli altri si caricano lo stesso.
        const esiti = await Promise.allSettled(tutti.map((es) => getStorico(es.id)));

        const nuoviStorici: Record<number, RegistroAllenamento[]> = {};
        const pesiIniziali: Record<number, string> = {};
        const repsIniziali: Record<number, string> = {};
        const falliti = new Set<number>();
        tutti.forEach((es, i) => {
          const esito = esiti[i];
          if (esito.status === 'rejected') {
            falliti.add(es.id);
            return;
          }
          const storico = esito.value;
          nuoviStorici[es.id] = storico;
          const ultimo = storico[storico.length - 1];
          // Peso: quello dell'ultima volta. Reps: l'obiettivo della scheda.
          pesiIniziali[es.id] = ultimo ? scriviNumero(ultimo.pesoUsato) : '';
          const fatteOggi = storico.filter((x) => eOggi(x.data)).length;
          const prossima = pianoSerie(es)[fatteOggi];
          // Reps fisse → precompilate; "Max" o intervallo (6-9) → campo vuoto.
          repsIniziali[es.id] = repsDiPartenza(prossima);
        });
        setStorici(nuoviStorici);
        setStoriciFalliti(falliti);
        setPeso(pesiIniziali);
        setReps(repsIniziali);
      } catch (err) {
        setErrore(err instanceof Error ? err.message : 'Errore nel caricamento della scheda');
      } finally {
        setCaricamento(false);
      }
    }
    carica();
  }, []);

  // Finché il timer è attivo, aggiorniamo "ora" 4 volte al secondo.
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setOra(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const secondiRimasti = timer ? Math.max(0, Math.ceil((timer.fine - ora) / 1000)) : 0;
  const recuperoFinito = timer !== null && secondiRimasti === 0;

  // A fine recupero: vibrazione (Android; iPhone non la supporta dal browser)
  // e dopo qualche secondo la barra sparisce da sola.
  useEffect(() => {
    if (!recuperoFinito) return;
    navigator.vibrate?.([200, 100, 200]);
    suonoFine();
    const id = setTimeout(() => setTimer(null), 4000);
    return () => clearTimeout(id);
  }, [recuperoFinito]);

  // Ultimi 3 secondi: un bip per secondo (3, 2, 1).
  const timerAttivo = timer !== null;
  useEffect(() => {
    if (timerAttivo && secondiRimasti > 0 && secondiRimasti <= 3) suonoConteggio();
  }, [secondiRimasti, timerAttivo]);

  // Mentre il timer corre teniamo acceso lo schermo: se si spegne, il telefono
  // addormenta la pagina e il suono di fine recupero non partirebbe.
  useEffect(() => {
    if (!timerAttivo) return;
    let blocco: Awaited<ReturnType<typeof tieniSchermoAcceso>> = null;
    let finito = false;
    tieniSchermoAcceso().then((b) => {
      if (finito) void b?.release();
      else blocco = b;
    });
    return () => {
      finito = true;
      void blocco?.release();
    };
  }, [timerAttivo]);

  // Il recupero dipende dalla serie appena fatta: una serie aggiunta può averne uno diverso.
  function avviaRecupero(nome: string, secondi: number) {
    if (secondi <= 0) return;
    const adesso = Date.now();
    setOra(adesso);
    setTimer({ nome, fine: adesso + secondi * 1000, totale: secondi * 1000 });
  }

  // +10 / +15 / -10 / -15 secondi. Togliendo non si va sotto zero (a zero il recupero finisce).
  function cambiaTempo(secondi: number) {
    sbloccaAudio();
    const adesso = Date.now();
    setOra(adesso);
    setTimer((t) => {
      if (!t) return t;
      const fine = Math.max(adesso, Math.max(t.fine, adesso) + secondi * 1000);
      // la barra resta proporzionata: se il tempo rimasto supera il totale, il totale cresce
      return { ...t, fine, totale: Math.max(t.totale, fine - adesso) };
    });
  }

  // Tocco sull'altoparlante: silenzia / riattiva. Se il volume era a zero lo riporta a metà.
  const muto = !suono || volume === 0;

  function cambiaMuto() {
    sbloccaAudio();
    const attivo = muto;
    if (attivo && volume === 0) {
      setVolume(50);
      impostaVolume(50);
    }
    setSuono(attivo);
    impostaSuono(attivo);
    if (attivo) provaSuono();
  }

  function cambiaVolume(valore: number) {
    setVolume(valore);
    impostaVolume(valore);
    if (!suono && valore > 0) {
      setSuono(true);
      impostaSuono(true);
    }
  }

  // Riprova a caricare lo storico di un esercizio che all'inizio non era arrivato.
  async function ricaricaStorico(es: Esercizio) {
    setErroreEsercizio(null);
    try {
      const storico = await getStorico(es.id);
      setStorici((prev) => ({ ...prev, [es.id]: storico }));
      setStoriciFalliti((prev) => {
        const nuovo = new Set(prev);
        nuovo.delete(es.id);
        return nuovo;
      });
      const ultimo = storico[storico.length - 1];
      setPeso((prev) => ({ ...prev, [es.id]: prev[es.id] || (ultimo ? scriviNumero(ultimo.pesoUsato) : '') }));
      const prossima = pianoSerie(es)[storico.filter((x) => eOggi(x.data)).length];
      setReps((prev) => ({ ...prev, [es.id]: prev[es.id] || repsDiPartenza(prossima) }));
    } catch (err) {
      setErroreEsercizio({ id: es.id, testo: err instanceof Error ? err.message : 'Ancora nessuna connessione, riprova' });
    }
  }

  // Se oggi l'allenamento di questa scheda è già stato chiuso e il cliente corregge o
  // elimina una serie, ricalcoliamo la sessione sul server: così il trainer vede i numeri
  // giusti. Il server AGGIORNA la sessione di oggi, non ne crea un'altra.
  async function aggiornaSessioneDiOggi(esercizioId: number) {
    const scheda = schede.find((sc) => sc.esercizi.some((e) => e.id === esercizioId));
    if (!scheda || !sessioneDiOggi(scheda.id)) return;
    try {
      const sessione = await completaAllenamento(scheda.id);
      setSessioni((prev) => [sessione, ...prev.filter((s) => s.id !== sessione.id)]);
    } catch {
      // Non è grave: i numeri si sistemano la prossima volta che tocca "Allenamento completato".
    }
  }

  // Dopo una correzione/eliminazione aggiorniamo lo storico locale: pallini,
  // contatore "serie oggi", "ultima volta" e grafico si ricalcolano da soli.
  function sostituisciSerie(esercizioId: number, nuova: RegistroAllenamento) {
    setStorici((prev) => ({
      ...prev,
      [esercizioId]: (prev[esercizioId] || []).map((s) => (s.id === nuova.id ? nuova : s)),
    }));
    if (eOggi(nuova.data)) aggiornaSessioneDiOggi(esercizioId);
  }

  function rimuoviSerie(esercizioId: number, id: number) {
    const eraDiOggi = (storici[esercizioId] || []).some((s) => s.id === id && eOggi(s.data));
    setStorici((prev) => ({
      ...prev,
      [esercizioId]: (prev[esercizioId] || []).filter((s) => s.id !== id),
    }));
    if (eraDiOggi) aggiornaSessioneDiOggi(esercizioId);
  }

  async function handleRegistra(es: Esercizio) {
    if (inInvio.has(es.id)) return; // doppio tocco: la prima richiesta è ancora in corso
    sbloccaAudio(); // dentro il tocco: così a fine recupero il telefono può suonare
    setErroreEsercizio(null);
    if (storiciFalliti.has(es.id)) {
      setErroreEsercizio({ id: es.id, testo: 'Prima tocca "Riprova a caricare": serve lo storico per contare le serie' });
      return;
    }
    if (!valoriValidi(peso[es.id] || '', reps[es.id] || '')) {
      setErroreEsercizio({ id: es.id, testo: 'Inserisci peso (anche 0 per il corpo libero) e ripetizioni' });
      return;
    }
    const kg = leggiNumero(peso[es.id] || '');
    const r = leggiNumero(reps[es.id] || '');

    setInInvio((prev) => new Set(prev).add(es.id));
    try {
      const nuovo = await registraAllenamento(es.id, kg, r, nota[es.id]);
      // Aggiungiamo il nuovo record allo storico locale invece di ricaricare tutto.
      // setStorici(prev => …) e non setStorici({...storici}): se nel frattempo è arrivata
      // la risposta di un ALTRO esercizio (superserie), non la sovrascriviamo con dati vecchi.
      setStorici((prev) => ({ ...prev, [es.id]: [...(prev[es.id] || []), nuovo] }));
      setNota((prev) => ({ ...prev, [es.id]: '' }));
      setNotaAperta((prev) => (prev === es.id ? null : prev));
      const aggiornato = [...(storici[es.id] || []).filter((x) => x.id !== nuovo.id), nuovo];

      const piano = pianoSerie(es);
      const fatteOggi = aggiornato.filter((x) => eOggi(x.data)).length;
      const prossima = piano[fatteOggi];
      if (prossima) {
        // Parte il recupero della serie appena fatta, e le reps passano a quelle della
        // prossima serie (utile quando la prossima ha reps diverse, o è "Max" → campo vuoto).
        avviaRecupero(es.nome, piano[fatteOggi - 1]?.recuperoSecondi ?? es.recuperoSecondi);
        setReps((prev) => ({ ...prev, [es.id]: repsDiPartenza(prossima) }));
      }
    } catch (err) {
      setErroreEsercizio({ id: es.id, testo: err instanceof Error ? err.message : 'Errore nella registrazione' });
    } finally {
      setInInvio((prev) => {
        const nuovo = new Set(prev);
        nuovo.delete(es.id);
        return nuovo;
      });
    }
  }

  // Numeri di oggi per una scheda: serie fatte (senza contare quelle oltre l'obiettivo),
  // serie previste, volume (kg × reps sommati) e data dell'ultimo allenamento.
  function statoScheda(scheda: Scheda) {
    let serieFatte = 0;
    let serieTotali = 0;
    let volume = 0;
    let ultimaData: Date | null = null;
    for (const es of scheda.esercizi) {
      const storico = storici[es.id] || [];
      const diOggi = storico.filter((x) => eOggi(x.data));
      const previste = pianoSerie(es).length;
      serieTotali += previste;
      serieFatte += Math.min(previste, diOggi.length);
      volume += diOggi.reduce((acc, x) => acc + x.pesoUsato * x.repsFatte, 0);
      for (const x of storico) {
        const d = new Date(x.data);
        if (!ultimaData || d > ultimaData) ultimaData = d;
      }
    }
    return { serieFatte, serieTotali, volume, ultimaData };
  }

  function vaiInCima() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function apriScheda(id: number) {
    setRiepilogo(null);
    setErroreEsercizio(null);
    setSchedaAperta(id);
    vaiInCima();
  }

  function tornaAllaHome() {
    setTimer(null);
    setNotaAperta(null);
    setProgressiAperti(null);
    setSchedaAperta(null);
    vaiInCima();
  }

  // Sessione di oggi per una scheda (se il cliente l'ha già chiusa oggi).
  function sessioneDiOggi(schedaId: number) {
    return sessioni.find((s) => s.schedaId === schedaId && eOggi(s.completataIl));
  }

  async function handleCompleta(scheda: Scheda) {
    setErrore('');
    setInChiusura(true);
    try {
      const sessione = await completaAllenamento(scheda.id);
      // Se il server ha aggiornato la sessione di oggi (stesso id), la sostituiamo invece di duplicarla.
      setSessioni((prev) => [sessione, ...prev.filter((s) => s.id !== sessione.id)]);
      setRiepilogo(sessione);
      tornaAllaHome();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio dell’allenamento');
    } finally {
      setInChiusura(false);
    }
  }

  // "Riprendi allenamento": per chi ha toccato "Allenamento completato" per sbaglio o vuole
  // fare ancora qualcosa. NON cancella niente: riapre solo la scheda. Quando il cliente
  // ripreme "Allenamento completato", il server aggiorna la sessione di oggi con i numeri nuovi.
  function riprendiAllenamento(schedaId: number) {
    setErrore('');
    apriScheda(schedaId);
  }

  if (caricamento) {
    return <p className="card py-16 text-center text-muted" role="status">Carico la tua scheda…</p>;
  }

  if (schede.length === 0) {
    return (
      <div className="space-y-4">
        {errore && <p className="alert-error">{errore}</p>}
        <div className="card py-14 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7"><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" /></svg>
          </span>
          <h2 className="text-2xl font-black uppercase tracking-tight">Il tuo percorso inizia qui</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">Il tuo trainer non ti ha ancora assegnato una scheda. Quando sarà pronta, la troverai in questa pagina.</p>
        </div>
      </div>
    );
  }

  // ---------- HOME: elenco delle schede ----------
  if (schedaAperta === null) {
    return (
      <div className="space-y-7">
        {errore && <p className="alert-error">{errore}</p>}

        <p className="text-sm capitalize text-muted">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="card !p-4 sm:!p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Le tue schede</p>
            <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">{schede.length}</p>
          </div>
          <div className="card border-accent-strong bg-accent !p-4 text-accent-ink sm:!p-5">
            <p className="text-xs font-semibold uppercase tracking-wide">Serie oggi</p>
            <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">{schede.reduce((totale, scheda) => totale + statoScheda(scheda).serieFatte, 0)}</p>
          </div>
          <div className="card !p-4 sm:!p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sessioni concluse</p>
            <p className="mt-2 text-4xl font-black tabular-nums tracking-tight">{sessioni.length}</p>
          </div>
        </div>

        {riepilogo && (
          <div className="card border-success/40 bg-success-soft">
            <p className="text-xs font-semibold tracking-wide text-success uppercase">Allenamento completato</p>
            <p className="mt-1 text-2xl font-black uppercase tracking-tight">{riepilogo.scheda.nome}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-bg/40 px-3 py-2">
                <p className="text-2xl font-extrabold tabular-nums">
                  {riepilogo.serieFatte}
                  <span className="text-base font-semibold text-muted">/{riepilogo.serieTotali}</span>
                </p>
                <p className="text-xs text-muted">serie</p>
              </div>
              <div className="rounded-xl bg-bg/40 px-3 py-2">
                <p className="text-2xl font-extrabold tabular-nums">
                  {Math.round(riepilogo.volume).toLocaleString('it-IT')}
                  <span className="text-base font-semibold text-muted"> kg</span>
                </p>
                <p className="text-xs text-muted">sollevati in totale</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-soft">Il tuo trainer vedrà che hai concluso l’allenamento.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => riprendiAllenamento(riepilogo.schedaId)}>
                Riprendi
              </button>
              <button className="btn-secondary" onClick={() => setRiepilogo(null)}>
                Ok
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Il tuo programma</h2>
            <p className="mt-1 text-sm text-muted">Le schede preparate dal tuo trainer.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
          {schede.map((scheda) => {
            const { serieFatte, serieTotali, ultimaData } = statoScheda(scheda);
            const iniziataOggi = serieFatte > 0;
            const sessioneOggi = sessioneDiOggi(scheda.id);
            const chiusaOggi = sessioneOggi !== undefined;
            return (
              <article key={scheda.id} className="card flex flex-col gap-5 border-t-2 border-t-accent/70 transition hover:border-accent-strong/70">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight">{scheda.nome}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {scheda.esercizi.length} esercizi · {serieTotali} serie
                    </p>
                  </div>
                  {chiusaOggi ? (
                    <span className="chip shrink-0 bg-success-soft text-success">Completata oggi</span>
                  ) : (
                    iniziataOggi && (
                      <span className="chip shrink-0 bg-accent-soft text-accent-strong">
                        {serieFatte}/{serieTotali} oggi
                      </span>
                    )
                  )}
                </div>

                <div className="rounded-xl bg-surface-2 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-muted">
                    <span>Avanzamento di oggi</span>
                    <span className="tabular-nums text-ink">{serieFatte} / {serieTotali} serie</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={`Avanzamento ${scheda.nome}`} aria-valuenow={serieFatte} aria-valuemin={0} aria-valuemax={serieTotali}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${serieTotali ? (serieFatte / serieTotali) * 100 : 0}%` }} />
                  </div>
                </div>

                <p className="mt-auto text-sm text-muted">
                  {ultimaData
                    ? `Ultimo allenamento: ${ultimaData.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`
                    : 'Non ancora iniziata'}
                </p>

                {/* Già chiusa oggi → "Riprendi" riapre la scheda (senza cancellare nulla);
                    iniziata ma non chiusa → "Continua"; altrimenti → "Inizia". */}
                {sessioneOggi ? (
                  <button
                    className="btn-secondary min-h-14 w-full text-base"
                    onClick={() => riprendiAllenamento(scheda.id)}
                  >
                    Riprendi allenamento
                  </button>
                ) : (
                  <button className="btn-primary min-h-14 w-full text-base" onClick={() => apriScheda(scheda.id)}>
                    {iniziataOggi ? 'Continua allenamento' : 'Inizia allenamento'}
                  </button>
                )}
              </article>
            );
          })}
          </div>
        </div>
      </div>
    );
  }

  // ---------- ALLENAMENTO sulla scheda aperta ----------
  return (
    // Spazio in fondo quando c'è la barra del timer, così non copre l'ultimo esercizio.
    <div className={`mx-auto max-w-3xl space-y-6 ${timer ? 'pb-64' : ''}`}>
      {errore && <p className="alert-error">{errore}</p>}

      <button className="btn-ghost -mt-2" onClick={tornaAllaHome}>
        ← Le mie schede
      </button>

      {schede.filter((s) => s.id === schedaAperta).map((scheda) => {
        const { serieFatte, serieTotali } = statoScheda(scheda);

        return (
          <section key={scheda.id} className="space-y-5">
            {/* Intestazione scheda con avanzamento della giornata */}
            <div className="rounded-2xl border border-line border-l-4 border-l-accent bg-surface p-5 sm:p-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Il tuo allenamento</p>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">{scheda.nome}</h2>
                <span className="shrink-0 text-sm text-soft">
                  <span className="font-bold text-ink">{serieFatte}</span>/{serieTotali} serie oggi
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-accent/10" role="progressbar" aria-label="Serie completate oggi" aria-valuenow={serieFatte} aria-valuemin={0} aria-valuemax={serieTotali}>
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${serieTotali ? (serieFatte / serieTotali) * 100 : 0}%` }}
                />
              </div>
            </div>

            {scheda.esercizi.map((es, indice) => {
              const storico = storici[es.id] || [];
              const oggi = storico.filter((x) => eOggi(x.data)).length;
              const piano = pianoSerie(es);
              const completato = oggi >= piano.length;
              const prossima = piano[oggi]; // undefined se l'esercizio è finito
              const ultimaVolta = [...storico].reverse().find((x) => !eOggi(x.data));

              return (
                <article
                  key={es.id}
                  className={`card space-y-5 transition ${completato ? 'border-success/30' : ''}`}
                >
                  {/* Titolo + stato */}
                  <header className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black ${
                        completato ? 'bg-success-soft text-success' : 'bg-accent text-accent-ink'
                      }`}
                    >
                      {completato ? '✓' : indice + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg leading-snug font-extrabold tracking-tight sm:text-xl">{es.nome}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-soft">
                        <span className="font-semibold text-ink">{riassuntoSerie(es)}</span>
                        <span className="text-muted"> · {testoRecupero(es.recuperoSecondi)}</span>
                      </p>
                    </div>
                  </header>

                  {/* Serie di oggi come pallini: si capisce a colpo d'occhio a che punto sei */}
                  {/* Le serie aggiunte ancora da fare hanno il bordo tratteggiato: si vede che sono diverse */}
                  <div className="flex items-center gap-1.5" aria-label={`${oggi} serie su ${piano.length} fatte oggi`}>
                    {piano.map((serie, i) => (
                      <span
                        key={i}
                        className={`h-2 flex-1 rounded-full ${
                          i < oggi
                            ? completato
                              ? 'bg-success'
                              : 'bg-accent'
                            : serie.aggiunta
                              ? 'border border-dashed border-accent-strong/70'
                              : 'bg-surface-2'
                        }`}
                      />
                    ))}
                  </div>

                  {es.descrizione && (
                    <div className="rounded-xl border-l-4 border-accent-strong bg-accent-soft px-3 py-2.5">
                      <p className="text-xs font-semibold tracking-wide text-accent-strong uppercase">Dal tuo trainer</p>
                      <p className="mt-1 text-sm leading-relaxed text-soft">{es.descrizione}</p>
                    </div>
                  )}

                  {/* Serie già fatte oggi: si possono correggere o eliminare se c'è stato un errore */}
                  {oggi > 0 && (
                    <div>
                      <p className="label">Serie di oggi</p>
                      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                        {storico
                          .filter((x) => eOggi(x.data))
                          .map((s, i) => (
                            <SerieRiga
                              key={s.id}
                              serie={s}
                              etichetta={`Serie ${i + 1}`}
                              onModificata={(nuova) => sostituisciSerie(es.id, nuova)}
                              onEliminata={(id) => rimuoviSerie(es.id, id)}
                            />
                          ))}
                      </ul>
                    </div>
                  )}

                  {storiciFalliti.has(es.id) ? (
                    <div className="space-y-2">
                      <p className="alert-error">Non sono riuscito a caricare le tue serie di questo esercizio.</p>
                      {erroreEsercizio?.id === es.id && <p className="alert-error">{erroreEsercizio.testo}</p>}
                      <button className="btn-secondary min-h-12 w-full" onClick={() => ricaricaStorico(es)}>
                        Riprova a caricare
                      </button>
                    </div>
                  ) : completato ? (
                    <p className="alert-success">Esercizio completato per oggi. Ottimo lavoro!</p>
                  ) : (
                    <>
                      {/* Se la prossima serie ha valori propri (aggiunta dal trainer) o è "Max",
                          lo diciamo chiaramente prima dei campi */}
                      {prossima && (prossima.aggiunta || prossima.reps == null) && (
                        <div className="rounded-xl border border-dashed border-accent-strong/70 bg-accent-soft px-3 py-2.5">
                          <p className="text-xs font-semibold tracking-wide text-accent-strong uppercase">
                            Serie {prossima.numero}
                          </p>
                          <p className="mt-0.5 text-sm text-ink">
                            <span className="font-bold">
                              {prossima.reps == null ? 'Max ripetizioni' : `${testoReps(prossima.reps, prossima.repsMax)} reps`}
                            </span>
                            <span className="text-soft"> · {testoRecupero(prossima.recuperoSecondi)}</span>
                            {prossima.nota && <span className="text-soft"> · {prossima.nota}</span>}
                          </p>
                        </div>
                      )}

                      {ultimaVolta && (
                        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
                          Ultima volta:{' '}
                          <span className="font-semibold text-soft">
                            {scriviNumero(ultimaVolta.pesoUsato)} kg × {ultimaVolta.repsFatte}
                          </span>{' '}
                          · {new Date(ultimaVolta.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <Stepper
                          etichetta="Peso (kg)"
                          valore={peso[es.id] || ''}
                          passo={2.5}
                          minimo={0}
                          decimali
                          onChange={(v) => setPeso((prev) => ({ ...prev, [es.id]: v }))}
                        />
                        <Stepper
                          etichetta="Ripetizioni"
                          valore={reps[es.id] || ''}
                          passo={1}
                          minimo={1}
                          decimali={false}
                          segnaposto={prossima ? testoReps(prossima.reps, prossima.repsMax) : '0'}
                          onChange={(v) => setReps((prev) => ({ ...prev, [es.id]: v }))}
                        />
                      </div>

                      {notaAperta === es.id && (
                        <input
                          className="input"
                          autoFocus
                          aria-label="Nota per il trainer"
                          placeholder='Per il trainer, es. "fastidio alla spalla"'
                          value={nota[es.id] || ''}
                          maxLength={500}
                          onChange={(e) => setNota({ ...nota, [es.id]: e.target.value })}
                        />
                      )}

                      {erroreEsercizio?.id === es.id && <p className="alert-error">{erroreEsercizio.testo}</p>}

                      <button
                        className="btn-primary min-h-14 w-full text-base"
                        disabled={inInvio.has(es.id)}
                        onClick={() => handleRegistra(es)}
                      >
                        {inInvio.has(es.id) ? 'Salvo…' : `Registra serie ${oggi + 1} di ${piano.length}`}
                      </button>
                    </>
                  )}

                  {/* Azioni secondarie, piccole e in basso: non rubano spazio al bottone principale */}
                  <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                    {/* Solo link web normali: un link "javascript:" non viene mai reso cliccabile */}
                    {es.videoUrl && /^https?:\/\//i.test(es.videoUrl) && (
                      <a href={es.videoUrl} target="_blank" rel="noreferrer" className="btn-ghost flex-1">
                        Video esercizio
                      </a>
                    )}
                    {!completato && (
                      <button
                        className={`btn-ghost flex-1 ${nota[es.id] ? 'text-accent-strong' : ''}`}
                        onClick={() => setNotaAperta(notaAperta === es.id ? null : es.id)}
                      >
                        {nota[es.id] ? 'Nota pronta' : 'Aggiungi nota'}
                      </button>
                    )}
                    <button
                      className={`btn-ghost flex-1 ${progressiAperti === es.id ? 'bg-accent-soft text-accent-strong' : ''}`}
                      aria-expanded={progressiAperti === es.id}
                      onClick={() => setProgressiAperti(progressiAperti === es.id ? null : es.id)}
                    >
                      Progressi
                    </button>
                  </div>

                  {progressiAperti === es.id && (
                    <div className="space-y-3 border-t border-line pt-4">
                      <ProgressoChart storico={storico} />
                      {storico.length > 0 && (
                        <ul className="divide-y divide-line rounded-xl bg-surface-2 text-sm">
                          {/* Dal più recente, massimo 10 righe: sul telefono lo spazio conta */}
                          {[...storico]
                            .reverse()
                            .slice(0, 10)
                            .map((r) => (
                              <SerieRiga
                                key={r.id}
                                serie={r}
                                etichetta={new Date(r.data).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                                onModificata={(nuova) => sostituisciSerie(es.id, nuova)}
                                onEliminata={(id) => rimuoviSerie(es.id, id)}
                              />
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {/* Fine allenamento: salva il riepilogo e torna alla home */}
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h3 className="mb-2 text-xl font-black uppercase tracking-tight">Hai concluso per oggi?</h3>
              <p className="mb-4 text-sm leading-relaxed text-muted">Salva il riepilogo dell’allenamento per condividerlo con il tuo trainer.</p>
              {errore && <p className="alert-error">{errore}</p>}
              {serieFatte < serieTotali && (
                <p className="mb-3 text-sm text-muted">
                  Mancano {serieTotali - serieFatte} serie: puoi chiudere lo stesso.
                </p>
              )}
              <button
                className={`min-h-14 w-full text-base ${
                  serieFatte >= serieTotali ? 'btn-primary' : 'btn-secondary'
                }`}
                disabled={inChiusura}
                onClick={() => handleCompleta(scheda)}
              >
                {inChiusura ? 'Salvo…' : 'Allenamento completato'}
              </button>
            </div>
          </section>
        );
      })}

      {/* Barra del recupero, fissa in basso dove arriva il pollice */}
      {timer && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.3)] backdrop-blur">
          {/* Riga del suono: altoparlante per silenziare e slider del volume */}
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-muted">
              {recuperoFinito ? 'Recupero finito' : 'Recupero'} · {timer.nome}
            </p>
            <button
              type="button"
              onClick={cambiaMuto}
              aria-label={muto ? 'Riattiva il suono del timer' : 'Silenzia il timer'}
              aria-pressed={muto}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                muto ? 'bg-surface-2 text-muted' : 'bg-accent-soft text-accent-strong'
              }`}
            >
              <IconaVolume muto={muto} />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={muto ? 0 : volume}
              aria-label="Volume del timer"
              aria-valuetext={muto ? 'silenziato' : `${volume}%`}
              onChange={(e) => cambiaVolume(Number(e.target.value))}
              // anteprima del suono quando si lascia lo slider
              onPointerUp={provaSuono}
              onKeyUp={provaSuono}
              className={`h-11 w-24 shrink-0 cursor-pointer accent-accent-strong min-[380px]:w-32 ${muto ? 'opacity-50' : ''}`}
            />
          </div>
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={`text-4xl font-black tabular-nums ${recuperoFinito ? 'text-success' : 'text-accent-strong'}`}>
                {recuperoFinito ? 'Via!' : formattaTempo(secondiRimasti)}
              </p>
            </div>
            <button className="btn-secondary" onClick={() => setTimer(null)}>
              {recuperoFinito ? 'Chiudi' : 'Salta'}
            </button>
          </div>
          {!recuperoFinito && (
            <div className="mx-auto mt-3 grid max-w-3xl grid-cols-4 gap-2">
              {[-15, -10, 10, 15].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn-ghost px-0 tabular-nums"
                  aria-label={s > 0 ? `Aggiungi ${s} secondi` : `Togli ${-s} secondi`}
                  onClick={() => cambiaTempo(s)}
                >
                  {s > 0 ? `+${s}s` : `−${-s}s`}
                </button>
              ))}
            </div>
          )}
          <div className="mx-auto mt-3 h-1.5 max-w-3xl overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-linear"
              style={{ width: `${timer.totale ? Math.max(0, Math.min(100, ((timer.fine - ora) / timer.totale) * 100)) : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
