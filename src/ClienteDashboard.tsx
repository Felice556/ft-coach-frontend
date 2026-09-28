import { useEffect, useState } from 'react';
import {
  getSchede,
  registraAllenamento,
  getStorico,
  modificaSerie,
  eliminaSerie,
  getSessioni,
  completaAllenamento,
  annullaCompletamento,
  SessioneAllenamento,
  Scheda,
  Esercizio,
  RegistroAllenamento,
} from './api';
import ProgressoChart from './ProgressoChart';

// ---------- Piccole utility ----------

// Sulla tastiera italiana del telefono il decimale è la virgola: "62,5".
// Number("62,5") darebbe NaN, quindi normalizziamo prima di convertire.
function leggiNumero(testo: string): number {
  return Number(testo.replace(',', '.'));
}

function scriviNumero(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2, useGrouping: false });
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
  compatto?: boolean; // versione più stretta, per la correzione dentro una riga
  onChange: (valore: string) => void;
}

function Stepper({ etichetta, valore, passo, minimo, decimali, compatto = false, onChange }: StepperProps) {
  const larghezzaBottone = compatto ? 'w-10' : 'w-12';
  function cambia(delta: number) {
    const attuale = leggiNumero(valore) || 0;
    onChange(scriviNumero(Math.max(minimo, attuale + delta)));
  }

  return (
    <div>
      <span className="label text-center">{etichetta}</span>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-field focus-within:border-accent">
        <button
          type="button"
          aria-label={`Diminuisci ${etichetta}`}
          className={`${larghezzaBottone} shrink-0 text-2xl font-bold text-soft transition active:bg-surface-2`}
          onClick={() => cambia(-passo)}
        >
          −
        </button>
        <input
          // inputMode sceglie la tastiera del telefono: numerica con virgola per i kg,
          // solo cifre per le ripetizioni.
          inputMode={decimali ? 'decimal' : 'numeric'}
          className={`w-full min-w-0 bg-transparent text-center font-bold text-ink outline-none ${compatto ? 'min-h-12 text-lg' : 'min-h-14 text-2xl'}`}
          value={valore}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          aria-label={`Aumenta ${etichetta}`}
          className={`${larghezzaBottone} shrink-0 text-2xl font-bold text-soft transition active:bg-surface-2`}
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
    const nuovoKg = leggiNumero(kg);
    const nuoveReps = leggiNumero(reps);
    if (!nuovoKg || nuovoKg <= 0 || !nuoveReps || nuoveReps <= 0) {
      setErrore('Inserisci peso e ripetizioni');
      return;
    }
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
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">Correggi · {etichetta}</p>
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
    <li className="px-3 py-2">
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
              ✎
            </button>
            <button
              aria-label={`Elimina ${etichetta}`}
              className="btn-ghost min-h-9 w-9 px-0 text-sm text-muted hover:text-danger"
              onClick={() => setModalita('conferma')}
            >
              ✕
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
  const [inInvio, setInInvio] = useState<number | null>(null);

  // Timer di recupero. Salviamo l'ORARIO di fine, non i secondi rimasti:
  // se il telefono blocca lo schermo e il browser rallenta, il conto resta giusto.
  const [timer, setTimer] = useState<Timer | null>(null);
  const [ora, setOra] = useState(Date.now());

  useEffect(() => {
    async function carica() {
      try {
        const [dati, sessioniSalvate] = await Promise.all([getSchede(), getSessioni()]);
        setSchede(dati);
        setSessioni(sessioniSalvate);

        const tutti = dati.flatMap((s) => s.esercizi);
        // Tutte le richieste partono insieme (Promise.all) invece che una alla volta.
        const risultati = await Promise.all(tutti.map((es) => getStorico(es.id)));

        const nuoviStorici: Record<number, RegistroAllenamento[]> = {};
        const pesiIniziali: Record<number, string> = {};
        const repsIniziali: Record<number, string> = {};
        tutti.forEach((es, i) => {
          nuoviStorici[es.id] = risultati[i];
          const ultimo = risultati[i][risultati[i].length - 1];
          // Peso: quello dell'ultima volta. Reps: l'obiettivo della scheda.
          pesiIniziali[es.id] = ultimo ? scriviNumero(ultimo.pesoUsato) : '';
          repsIniziali[es.id] = String(es.repsTarget);
        });
        setStorici(nuoviStorici);
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
    const id = setTimeout(() => setTimer(null), 4000);
    return () => clearTimeout(id);
  }, [recuperoFinito]);

  function avviaRecupero(es: Esercizio) {
    const adesso = Date.now();
    setOra(adesso);
    setTimer({ nome: es.nome, fine: adesso + es.recuperoSecondi * 1000, totale: es.recuperoSecondi * 1000 });
  }

  function aggiungiTempo() {
    setTimer((t) => t && { ...t, fine: Math.max(t.fine, Date.now()) + 15000, totale: t.totale + 15000 });
  }

  // Dopo una correzione/eliminazione aggiorniamo lo storico locale: pallini,
  // contatore "serie oggi", "ultima volta" e grafico si ricalcolano da soli.
  function sostituisciSerie(esercizioId: number, nuova: RegistroAllenamento) {
    setStorici((prev) => ({
      ...prev,
      [esercizioId]: (prev[esercizioId] || []).map((s) => (s.id === nuova.id ? nuova : s)),
    }));
  }

  function rimuoviSerie(esercizioId: number, id: number) {
    setStorici((prev) => ({
      ...prev,
      [esercizioId]: (prev[esercizioId] || []).filter((s) => s.id !== id),
    }));
  }

  async function handleRegistra(es: Esercizio) {
    setErroreEsercizio(null);
    const kg = leggiNumero(peso[es.id] || '');
    const r = leggiNumero(reps[es.id] || '');
    if (!kg || kg <= 0 || !r || r <= 0) {
      setErroreEsercizio({ id: es.id, testo: 'Inserisci peso e ripetizioni' });
      return;
    }

    setInInvio(es.id);
    try {
      const nuovo = await registraAllenamento(es.id, kg, r, nota[es.id]);
      // Aggiungiamo il nuovo record allo storico locale invece di ricaricare tutto.
      const aggiornato = [...(storici[es.id] || []), nuovo];
      setStorici({ ...storici, [es.id]: aggiornato });
      setNota({ ...nota, [es.id]: '' });
      setNotaAperta(null);

      // Parte il recupero, tranne dopo l'ultima serie prevista.
      const fatteOggi = aggiornato.filter((x) => eOggi(x.data)).length;
      if (fatteOggi < es.serieTarget) avviaRecupero(es);
    } catch (err) {
      setErroreEsercizio({ id: es.id, testo: err instanceof Error ? err.message : 'Errore nella registrazione' });
    } finally {
      setInInvio(null);
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
      serieTotali += es.serieTarget;
      serieFatte += Math.min(es.serieTarget, diOggi.length);
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
      setSessioni([sessione, ...sessioni]);
      setRiepilogo(sessione);
      tornaAllaHome();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio dell’allenamento');
    } finally {
      setInChiusura(false);
    }
  }

  // "Riprendi allenamento": annulla la chiusura (le serie restano) e riapre la scheda.
  async function handleRiprendi(sessione: SessioneAllenamento) {
    setErrore('');
    try {
      await annullaCompletamento(sessione.id);
      setSessioni(sessioni.filter((s) => s.id !== sessione.id));
      apriScheda(sessione.schedaId);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore, riprova');
    }
  }

  if (caricamento) {
    return <p className="py-12 text-center text-muted">Carico la tua scheda…</p>;
  }

  if (schede.length === 0) {
    return (
      <div className="space-y-4">
        {errore && <p className="alert-error">{errore}</p>}
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
          Il tuo trainer non ti ha ancora assegnato una scheda.
        </p>
      </div>
    );
  }

  // ---------- HOME: elenco delle schede ----------
  if (schedaAperta === null) {
    return (
      <div className="space-y-6">
        {errore && <p className="alert-error">{errore}</p>}

        {riepilogo && (
          <div className="card border-success/40 bg-success-soft">
            <p className="text-xs font-semibold tracking-wide text-success uppercase">Allenamento completato</p>
            <p className="mt-1 text-xl font-extrabold">{riepilogo.scheda.nome}</p>
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
              <button className="btn-ghost" onClick={() => handleRiprendi(riepilogo)}>
                ↺ Riapri
              </button>
              <button className="btn-secondary" onClick={() => setRiepilogo(null)}>
                Ok
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="label">Le tue schede</h2>
          {schede.map((scheda) => {
            const { serieFatte, serieTotali, ultimaData } = statoScheda(scheda);
            const iniziataOggi = serieFatte > 0;
            const sessioneOggi = sessioneDiOggi(scheda.id);
            const chiusaOggi = sessioneOggi !== undefined;
            return (
              <article key={scheda.id} className="card space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-extrabold tracking-tight">{scheda.nome}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {scheda.esercizi.length} esercizi · {serieTotali} serie
                    </p>
                  </div>
                  {chiusaOggi ? (
                    <span className="chip shrink-0 text-success">✓ Completata oggi</span>
                  ) : (
                    iniziataOggi && (
                      <span className="chip shrink-0 text-accent">
                        {serieFatte}/{serieTotali} oggi
                      </span>
                    )
                  )}
                </div>

                <p className="text-sm text-muted">
                  {ultimaData
                    ? `Ultimo allenamento: ${ultimaData.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`
                    : 'Non ancora iniziata'}
                </p>

                {/* Già chiusa oggi → "Riprendi" annulla la chiusura e riapre la scheda;
                    iniziata ma non chiusa → "Continua"; altrimenti → "Inizia". */}
                {sessioneOggi ? (
                  <button className="btn-secondary min-h-14 w-full text-base" onClick={() => handleRiprendi(sessioneOggi)}>
                    ↺ Riprendi allenamento
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
    );
  }

  // ---------- ALLENAMENTO sulla scheda aperta ----------
  return (
    // Spazio in fondo quando c'è la barra del timer, così non copre l'ultimo esercizio.
    <div className={`space-y-8 ${timer ? 'pb-32' : ''}`}>
      {errore && <p className="alert-error">{errore}</p>}

      <button className="btn-ghost -mt-2" onClick={tornaAllaHome}>
        ← Le mie schede
      </button>

      {schede.filter((s) => s.id === schedaAperta).map((scheda) => {
        const serieTotali = scheda.esercizi.reduce((acc, es) => acc + es.serieTarget, 0);
        const serieFatte = scheda.esercizi.reduce(
          (acc, es) => acc + Math.min(es.serieTarget, (storici[es.id] || []).filter((x) => eOggi(x.data)).length),
          0
        );

        return (
          <section key={scheda.id} className="space-y-4">
            {/* Intestazione scheda con avanzamento della giornata */}
            <div>
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-2xl font-extrabold tracking-tight">{scheda.nome}</h2>
                <span className="shrink-0 text-sm text-muted">
                  <span className="font-bold text-ink">{serieFatte}</span>/{serieTotali} serie oggi
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${serieTotali ? (serieFatte / serieTotali) * 100 : 0}%` }}
                />
              </div>
            </div>

            {scheda.esercizi.map((es, indice) => {
              const storico = storici[es.id] || [];
              const oggi = storico.filter((x) => eOggi(x.data)).length;
              const completato = oggi >= es.serieTarget;
              const ultimaVolta = [...storico].reverse().find((x) => !eOggi(x.data));

              return (
                <article
                  key={es.id}
                  className={`card space-y-4 transition ${completato ? 'border-success/40' : ''}`}
                >
                  {/* Titolo + stato */}
                  <header className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                        completato ? 'bg-success text-accent-ink' : 'bg-accent text-accent-ink'
                      }`}
                    >
                      {completato ? '✓' : indice + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg leading-tight font-bold">{es.nome}</h3>
                      <p className="mt-1 text-sm text-soft">
                        <span className="font-semibold text-ink">
                          {es.serieTarget} × {es.repsTarget}
                        </span>
                        <span className="text-muted"> · recupero {es.recuperoSecondi}s</span>
                      </p>
                    </div>
                  </header>

                  {/* Serie di oggi come pallini: si capisce a colpo d'occhio a che punto sei */}
                  <div className="flex items-center gap-1.5" aria-label={`${oggi} serie su ${es.serieTarget} fatte oggi`}>
                    {Array.from({ length: es.serieTarget }, (_, i) => (
                      <span
                        key={i}
                        className={`h-2 flex-1 rounded-full ${i < oggi ? (completato ? 'bg-success' : 'bg-accent') : 'bg-surface-2'}`}
                      />
                    ))}
                  </div>

                  {es.descrizione && (
                    <div className="rounded-xl border-l-4 border-accent bg-accent-soft px-3 py-2.5">
                      <p className="text-xs font-semibold tracking-wide text-accent uppercase">Dal tuo trainer</p>
                      <p className="mt-0.5 text-sm text-soft">{es.descrizione}</p>
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

                  {completato ? (
                    <p className="alert-success">Esercizio completato per oggi. Ottimo lavoro!</p>
                  ) : (
                    <>
                      {ultimaVolta && (
                        <p className="text-sm text-muted">
                          Ultima volta:{' '}
                          <span className="font-semibold text-soft">
                            {scriviNumero(ultimaVolta.pesoUsato)} kg × {ultimaVolta.repsFatte}
                          </span>{' '}
                          · {new Date(ultimaVolta.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <Stepper
                          etichetta="Kg"
                          valore={peso[es.id] || ''}
                          passo={2.5}
                          minimo={0}
                          decimali
                          onChange={(v) => setPeso({ ...peso, [es.id]: v })}
                        />
                        <Stepper
                          etichetta="Reps"
                          valore={reps[es.id] || ''}
                          passo={1}
                          minimo={1}
                          decimali={false}
                          onChange={(v) => setReps({ ...reps, [es.id]: v })}
                        />
                      </div>

                      {notaAperta === es.id && (
                        <input
                          className="input"
                          autoFocus
                          placeholder='Per il trainer, es. "fastidio alla spalla"'
                          value={nota[es.id] || ''}
                          onChange={(e) => setNota({ ...nota, [es.id]: e.target.value })}
                        />
                      )}

                      {erroreEsercizio?.id === es.id && <p className="alert-error">{erroreEsercizio.testo}</p>}

                      <button
                        className="btn-primary min-h-14 w-full text-base"
                        disabled={inInvio === es.id}
                        onClick={() => handleRegistra(es)}
                      >
                        {inInvio === es.id ? 'Salvo…' : `✓ Registra serie ${oggi + 1} di ${es.serieTarget}`}
                      </button>
                    </>
                  )}

                  {/* Azioni secondarie, piccole e in basso: non rubano spazio al bottone principale */}
                  <div className="flex flex-wrap gap-2">
                    {es.videoUrl && (
                      <a href={es.videoUrl} target="_blank" rel="noreferrer" className="btn-ghost flex-1">
                        ▶ Video
                      </a>
                    )}
                    {!completato && (
                      <button
                        className={`btn-ghost flex-1 ${nota[es.id] ? 'text-accent' : ''}`}
                        onClick={() => setNotaAperta(notaAperta === es.id ? null : es.id)}
                      >
                        {nota[es.id] ? '✎ Nota pronta' : '+ Nota'}
                      </button>
                    )}
                    <button
                      className={`btn-ghost flex-1 ${progressiAperti === es.id ? 'bg-line' : ''}`}
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
            <div className="space-y-2 pt-2">
              {errore && <p className="alert-error">{errore}</p>}
              {serieFatte < serieTotali && (
                <p className="text-center text-sm text-muted">
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
                {inChiusura ? 'Salvo…' : '✓ Allenamento completato'}
              </button>
            </div>
          </section>
        );
      })}

      {/* Barra del recupero, fissa in basso dove arriva il pollice */}
      {timer && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">
                {recuperoFinito ? 'Recupero finito' : 'Recupero'} · {timer.nome}
              </p>
              <p className={`text-3xl font-extrabold tabular-nums ${recuperoFinito ? 'text-success' : 'text-ink'}`}>
                {recuperoFinito ? 'Via!' : formattaTempo(secondiRimasti)}
              </p>
            </div>
            {!recuperoFinito && (
              <button className="btn-ghost" onClick={aggiungiTempo}>
                +15s
              </button>
            )}
            <button className="btn-secondary" onClick={() => setTimer(null)}>
              {recuperoFinito ? 'Chiudi' : 'Salta'}
            </button>
          </div>
          <div className="mx-auto mt-2 h-1 max-w-4xl overflow-hidden rounded-full bg-surface-2">
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
