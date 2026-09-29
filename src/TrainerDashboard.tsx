import { useEffect, useRef, useState } from 'react';
import {
  creaScheda,
  aggiornaScheda,
  archiviaScheda,
  ripristinaScheda,
  getSchedeArchiviate,
  eliminaSchedaDefinitivamente,
  getSchede,
  getStorico,
  getPreset,
  creaPreset,
  cancellaPreset,
  Scheda,
  RegistroAllenamento,
  EsercizioPreset,
  getSessioni,
  SessioneAllenamento,
  getNotePreset,
  creaNotaPreset,
  cancellaNotaPreset,
  NotaPreset,
  getClienti,
  Cliente,
  cambiaEmailCliente,
  reimpostaPasswordCliente,
  getEserciziArchiviati,
  ripristinaEsercizio,
  EsercizioArchiviato,
  Esercizio,
} from './api';
import { riassuntoSerie, testoReps, testoRecupero, leggiReps } from './serie';

// Campo ripetizioni: numero dalla tastiera numerica, oppure "Max" con un tocco sul bottone.
function CampoReps({ valore, onChange }: { valore: string; onChange: (v: string) => void }) {
  const eMax = /^max$/i.test(valore.trim());
  return (
    // Il bottone sta DENTRO il campo (a destra), così funziona anche nelle colonne strette del telefono.
    <div className="relative">
      <input
        className="input pr-12"
        type="text"
        // Niente tastierino numerico: sul telefono non ha il trattino per scrivere "6-9".
        placeholder="10 o 6-9"
        value={eMax ? 'Max' : valore}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-pressed={eMax}
        title="Ripetizioni massime (a cedimento)"
        className={`absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded-lg px-2 text-[11px] font-bold transition ${
          eMax ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted hover:text-ink'
        }`}
        onClick={() => onChange(eMax ? '' : 'Max')}
      >
        Max
      </button>
    </div>
  );
}

// Da quanto tempo esiste una scheda, in parole: "oggi", "3 giorni fa", "2 mesi fa".
function etaScheda(iso: string): string {
  const giorni = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (giorni <= 0) return 'oggi';
  if (giorni === 1) return 'ieri';
  if (giorni < 14) return `${giorni} giorni fa`;
  if (giorni < 60) return `${Math.floor(giorni / 7)} settimane fa`;
  if (giorni < 365) return `${Math.floor(giorni / 30)} mesi fa`;
  const anni = Math.floor(giorni / 365);
  return anni === 1 ? '1 anno fa' : `${anni} anni fa`;
}

// "29/09/2026"
const dataBreve = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Più vecchia di 90 giorni: probabilmente il programma va aggiornato.
const eVecchia = (iso: string) => Date.now() - new Date(iso).getTime() > 90 * 86_400_000;

// Password temporanea facile da dettare a voce: 4 lettere + 4 cifre, es. "kmtr-4827".
// Niente lettere che si confondono (l/i/o). crypto.getRandomValues = casuale vero, non prevedibile.
function generaPasswordTemporanea(): string {
  const lettere = 'abcdefghjkmnpqrstuvwxyz';
  const casuali = crypto.getRandomValues(new Uint32Array(8));
  const parte1 = Array.from(casuali.slice(0, 4), (n) => lettere[n % lettere.length]).join('');
  const parte2 = Array.from(casuali.slice(4), (n) => String(n % 10)).join('');
  return `${parte1}-${parte2}`;
}

// Gestione accesso di un cliente: correzione email e password temporanea.
// La password attuale del cliente non si vede mai (il database ne ha solo una versione cifrata).
function AccessoCliente({ cliente, onEmailCambiata }: { cliente: Cliente; onEmailCambiata: (c: Cliente) => void }) {
  const [email, setEmail] = useState(cliente.email);
  const [temporanea, setTemporanea] = useState<string | null>(null); // proposta, non ancora salvata
  const [salvata, setSalvata] = useState<string | null>(null); // salvata: da comunicare al cliente
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inInvio, setInInvio] = useState(false);

  async function salvaEmail() {
    if (inInvio || email.trim().toLowerCase() === cliente.email) return;
    setInInvio(true);
    setMessaggio(null);
    try {
      const aggiornato = await cambiaEmailCliente(cliente.id, email);
      onEmailCambiata(aggiornato);
      setEmail(aggiornato.email);
      setMessaggio({ ok: true, testo: `Email aggiornata: ora ${cliente.nome} accede con ${aggiornato.email}` });
    } catch (err) {
      setMessaggio({ ok: false, testo: err instanceof Error ? err.message : 'Errore nel salvataggio' });
    } finally {
      setInInvio(false);
    }
  }

  async function confermaReset() {
    if (inInvio || !temporanea) return;
    setInInvio(true);
    setMessaggio(null);
    try {
      await reimpostaPasswordCliente(cliente.id, temporanea);
      setSalvata(temporanea);
      setTemporanea(null);
    } catch (err) {
      setMessaggio({ ok: false, testo: err instanceof Error ? err.message : 'Errore nel reset' });
    } finally {
      setInInvio(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-line pt-3">
      <div>
        <label className="label">Email per accedere</label>
        <div className="flex gap-2">
          <input
            className="input min-w-0 flex-1"
            type="email"
            autoCapitalize="none"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary shrink-0 px-3 text-xs"
            disabled={inInvio || email.trim().toLowerCase() === cliente.email}
            onClick={salvaEmail}
          >
            Salva
          </button>
        </div>
      </div>

      <div>
        <p className="label">Password</p>
        {salvata ? (
          <div className="rounded-xl border border-success/40 bg-success-soft p-3 text-sm">
            <p>
              Password temporanea di {cliente.nome}:
            </p>
            <p className="my-2 text-center font-mono text-2xl font-extrabold tracking-wider select-all">{salvata}</p>
            <p className="text-soft">
              Diglielo a voce o scrivigliela. Al primo accesso dovrà sceglierne una sua, che tu non vedrai.
              I suoi dispositivi collegati sono stati disconnessi.
            </p>
            <button type="button" className="btn-link mt-2 text-xs" onClick={() => setSalvata(null)}>
              Ok, fatto
            </button>
          </div>
        ) : temporanea ? (
          <div className="rounded-xl border border-accent/50 bg-accent-soft p-3 text-sm">
            <p>Nuova password temporanea:</p>
            <p className="my-2 text-center font-mono text-2xl font-extrabold tracking-wider">{temporanea}</p>
            <p className="text-soft">La password attuale di {cliente.nome} smetterà di funzionare.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => setTemporanea(null)} disabled={inInvio}>
                Annulla
              </button>
              <button type="button" className="btn-primary text-xs" onClick={confermaReset} disabled={inInvio}>
                {inInvio ? 'Salvo…' : 'Conferma'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary w-full text-xs"
            onClick={() => {
              setMessaggio(null);
              setTemporanea(generaPasswordTemporanea());
            }}
          >
            Reimposta password
          </button>
        )}
      </div>

      {messaggio && <p className={messaggio.ok ? 'alert-success' : 'alert-error'}>{messaggio.testo}</p>}
    </div>
  );
}

// Scelta del cliente scrivendo le prime lettere: compaiono i nomi che corrispondono
// e si tocca quello giusto. Sul telefono è più veloce di un menu con tutti i clienti.
function SceltaCliente({
  clienti,
  valore,
  onChange,
}: {
  clienti: Cliente[];
  valore: string; // id del cliente scelto, oppure '' se non ne è stato scelto nessuno
  onChange: (id: string) => void;
}) {
  const scelto = clienti.find((c) => String(c.id) === valore);
  // null = non sto scrivendo: nel campo si vede il nome del cliente scelto.
  const [testo, setTesto] = useState<string | null>(null);
  const [aperto, setAperto] = useState(false);

  useEffect(() => {
    if (valore) setTesto(null);
  }, [valore]);

  const ricerca = (testo ?? '').trim().toLowerCase();
  // Chi ha il nome che INIZIA con quelle lettere va in cima; poi chi le contiene (nome o email).
  const suggerimenti = clienti
    .filter((c) => !ricerca || c.nome.toLowerCase().includes(ricerca) || c.email.toLowerCase().includes(ricerca))
    .sort((a, b) => {
      const ia = a.nome.toLowerCase().startsWith(ricerca) ? 0 : 1;
      const ib = b.nome.toLowerCase().startsWith(ricerca) ? 0 : 1;
      return ia - ib || a.nome.localeCompare(b.nome);
    });

  function scegli(c: Cliente) {
    onChange(String(c.id));
    setTesto(null);
    setAperto(false);
  }

  return (
    <div className="relative">
      <input
        className="input pr-10"
        type="text"
        role="combobox"
        aria-expanded={aperto}
        aria-autocomplete="list"
        autoComplete="off"
        autoCapitalize="none"
        placeholder="Scrivi il nome…"
        value={testo ?? scelto?.nome ?? ''}
        onFocus={(e) => {
          setAperto(true);
          if (scelto) e.target.select(); // così scrivendo si sostituisce il nome già scelto
        }}
        onBlur={() => setAperto(false)}
        onChange={(e) => {
          setTesto(e.target.value);
          onChange(''); // finché non si tocca un suggerimento, nessun cliente è scelto
          setAperto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && aperto && suggerimenti.length > 0 && !scelto) {
            e.preventDefault(); // Invio sceglie il primo suggerimento, non invia il form
            scegli(suggerimenti[0]);
          }
          if (e.key === 'Escape') setAperto(false);
        }}
      />
      {scelto && (
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-success">
          ✓
        </span>
      )}
      {aperto && !scelto && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-line bg-surface shadow-lg">
          {suggerimenti.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">Nessun cliente trovato</li>
          ) : (
            suggerimenti.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  // onMouseDown e non onClick: il campo perde il focus prima del click e la lista sparirebbe
                  onMouseDown={(e) => {
                    e.preventDefault();
                    scegli(c);
                  }}
                  className="flex min-h-12 w-full flex-col justify-center px-3 py-1.5 text-left transition hover:bg-accent hover:text-accent-ink"
                >
                  <span className="font-semibold">{c.nome}</span>
                  <span className="text-xs opacity-70">{c.email}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// "oggi alle 18:32", "ieri alle 9:05", oppure "lun 21/09 alle 18:32".
function quando(iso: string): string {
  const d = new Date(iso);
  const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const oggi = new Date();
  const ieri = new Date();
  ieri.setDate(oggi.getDate() - 1);
  if (d.toDateString() === oggi.toDateString()) return `oggi alle ${ora}`;
  if (d.toDateString() === ieri.toDateString()) return `ieri alle ${ora}`;
  const giorno = d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return `${giorno} alle ${ora}`;
}

// Serie "diversa" in fase di scrittura (stringhe, come tutti i campi dei form).
type SerieExtraBozza = {
  reps: string;
  recuperoSecondi: string;
  nota: string;
};

type EsercizioBozza = {
  // Identificativo della riga nel form, stabile anche se si tolgono righe sopra
  // (React lo usa come key: con l'indice, togliendo la riga 2 la 3 "erediterebbe" il suo stato).
  chiave: number;
  // Presente solo per esercizi già salvati: serve al backend per aggiornarli
  // invece di ricrearli (così lo storico del cliente non si perde).
  id?: number;
  nome: string;
  videoUrl: string;
  descrizione: string;
  serieTarget: string;
  repsTarget: string;
  recuperoSecondi: string;
  serieExtra: SerieExtraBozza[];
};

// Campi "semplici" (testo) di un esercizio, modificabili con aggiornaEsercizio.
type CampoTesto = Exclude<keyof EsercizioBozza, 'id' | 'serieExtra' | 'chiave'>;

let prossimaChiave = 1;
const nuovaChiave = () => prossimaChiave++;

const esercizioVuoto = (): EsercizioBozza => ({
  chiave: nuovaChiave(),
  nome: '',
  videoUrl: '',
  descrizione: '',
  serieTarget: '3',
  repsTarget: '10',
  recuperoSecondi: '60',
  serieExtra: [],
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

  // Cliente di cui si stanno guardando le schede esistenti (null = nessuno scelto).
  const [clienteVisto, setClienteVisto] = useState<number | null>(null);

  // Cambia ogni volta che il form si svuota o carica un'altra scheda: azzera il testo digitato nel campo cliente.
  const [versioneForm, setVersioneForm] = useState(0);

  function resetForm() {
    setVersioneForm((v) => v + 1);
    setSchedaInModifica(null);
    setNomeScheda('');
    setClienteId('');
    setEsercizi([esercizioVuoto()]);
    setEserciziRimossi([]);
    setConfermaRimuovi(null);
    setNoteAperte(null);
  }

  // Carica una scheda esistente nel form (gli input usano stringhe, i dati numeri).
  function avviaModifica(scheda: Scheda) {
    setVersioneForm((v) => v + 1);
    setErrore('');
    setSchedaInModifica(scheda.id);
    setNomeScheda(scheda.nome);
    setClienteId(String(scheda.clienteId));
    setEsercizi(scheda.esercizi.map(daEsercizioABozza));
    setConfermaRimuovi(null);
    setNoteAperte(null);
    caricaEserciziRimossi(scheda.id);
    // Su telefono il form è in cima alla pagina: ci riportiamo lì.
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Da esercizio salvato a riga del form (gli input usano stringhe, i dati numeri).
  function daEsercizioABozza(es: Esercizio): EsercizioBozza {
    return {
      chiave: nuovaChiave(),
      id: es.id,
      nome: es.nome,
      videoUrl: es.videoUrl || '',
      descrizione: es.descrizione || '',
      serieTarget: String(es.serieTarget),
      repsTarget: testoReps(es.repsTarget, es.repsMax),
      recuperoSecondi: String(es.recuperoSecondi),
      serieExtra: (es.serieExtra || []).map((x) => ({
        reps: testoReps(x.reps, x.repsMax),
        recuperoSecondi: String(x.recuperoSecondi),
        nota: x.nota || '',
      })),
    };
  }

  // ---- Esercizi tolti dalla scheda in modifica: restano salvati e si possono rimettere ----
  const [eserciziRimossi, setEserciziRimossi] = useState<EsercizioArchiviato[]>([]);
  // Riga per cui è stato toccato "Rimuovi" una volta: serve un secondo tocco per confermare.
  const [confermaRimuovi, setConfermaRimuovi] = useState<number | null>(null);

  useEffect(() => {
    if (confermaRimuovi === null) return;
    const t = setTimeout(() => setConfermaRimuovi(null), 4000);
    return () => clearTimeout(t);
  }, [confermaRimuovi]);

  async function caricaEserciziRimossi(schedaId: number) {
    setEserciziRimossi([]);
    try {
      setEserciziRimossi(await getEserciziArchiviati(schedaId));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento degli esercizi rimossi');
    }
  }

  // Rimette l'esercizio nella scheda (subito, sul server) e lo aggiunge in fondo al form,
  // con il suo id: così resta collegato a tutte le serie che il cliente aveva già fatto.
  async function handleRipristinaEsercizio(es: EsercizioArchiviato) {
    try {
      setErrore('');
      await ripristinaEsercizio(es.id);
      setEserciziRimossi((prev) => prev.filter((x) => x.id !== es.id));
      setEsercizi((prev) => [...prev.filter((r) => r.nome.trim() || r.id), daEsercizioABozza(es)]);
      await caricaSchede();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel ripristino dell’esercizio');
    }
  }

  // Storico letto in sola lettura dal trainer, per vedere cosa scrivono i clienti
  // dopo ogni allenamento (dolori, difficoltà, sensazioni).
  const [storicoAperto, setStoricoAperto] = useState<number | null>(null);
  const [storico, setStorico] = useState<RegistroAllenamento[]>([]);

  // Ultimo esercizio richiesto: se tocchi due "Vedi note" di fila e la prima risposta
  // arriva dopo la seconda, la ignoriamo (altrimenti vedresti le note dell'esercizio sbagliato).
  const storicoRichiesto = useRef<number | null>(null);

  async function toggleStorico(esercizioId: number) {
    if (storicoAperto === esercizioId) {
      storicoRichiesto.current = null;
      setStoricoAperto(null);
      return;
    }
    storicoRichiesto.current = esercizioId;
    try {
      const dati = await getStorico(esercizioId);
      if (storicoRichiesto.current !== esercizioId) return;
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

  // Clienti per il menu a tendina: si sceglie il nome, non si scrive l'ID a mano.
  const [clienti, setClienti] = useState<Cliente[]>([]);
  // Sezione "I tuoi clienti": cliente di cui è aperta la gestione dell'accesso.
  const [accessoAperto, setAccessoAperto] = useState<number | null>(null);
  const [clientiAperti, setClientiAperti] = useState(false);
  async function caricaClienti() {
    try {
      setClienti(await getClienti());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento dei clienti');
    }
  }
  const nomeCliente = (id: number) => clienti.find((c) => c.id === id)?.nome ?? `cliente #${id}`;

  // true mentre il salvataggio è in corso: blocca il doppio tocco su "Crea scheda".
  const [salvando, setSalvando] = useState(false);

  // Libreria esercizi salvati: si clicca per aggiungere, invece di riscrivere.
  const [preset, setPreset] = useState<EsercizioPreset[]>([]);

  // Allenamenti conclusi dai clienti (il più recente in cima).
  const [sessioni, setSessioni] = useState<SessioneAllenamento[]>([]);
  const [mostraTutte, setMostraTutte] = useState(false);

  async function caricaSessioni() {
    try {
      setSessioni(await getSessioni());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento degli allenamenti');
    }
  }

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
    caricaSessioni();
    caricaNote();
    caricaClienti();
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
    // Riempiamo l'ultima riga solo se è vuota E nuova. Se è un esercizio già salvato a cui è
    // stato cancellato il nome, NON la riusiamo: le sue serie passate finirebbero sotto un
    // esercizio diverso (es. lo storico della panca attaccato allo squat).
    if (ultima && !ultima.nome.trim() && ultima.id === undefined) {
      setEsercizi([...esercizi.slice(0, -1), { ...riga, chiave: ultima.chiave }]);
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
      // In libreria esercizi vanno solo nome e video: le note hanno la loro libreria a parte.
      await creaPreset(es.nome.trim(), es.videoUrl);
      await caricaPreset();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio');
    }
  }

  // ---- Libreria note/tecniche ----
  const [notePreset, setNotePreset] = useState<NotaPreset[]>([]);
  // Riga del form (la sua chiave) di cui è aperto l'elenco note salvate.
  const [noteAperte, setNoteAperte] = useState<number | null>(null);

  async function caricaNote() {
    try {
      setNotePreset(await getNotePreset());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento delle note');
    }
  }

  async function salvaNota(testo: string) {
    const pulito = testo.trim();
    if (notePreset.some((n) => n.testo.toLowerCase() === pulito.toLowerCase())) {
      setErrore('Questa nota è già tra le note salvate');
      return;
    }
    try {
      setErrore('');
      const nuova = await creaNotaPreset(pulito);
      setNotePreset([...notePreset, nuova].sort((a, b) => a.testo.localeCompare(b.testo)));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio della nota');
    }
  }

  // Aggiunge la nota salvata a quella dell'esercizio: se il campo è vuoto la scrive,
  // altrimenti la mette a capo sotto (e non la ripete se c'è già).
  function inserisciNota(indice: number, testo: string) {
    const attuale = esercizi[indice].descrizione.trim();
    if (attuale.includes(testo)) return;
    aggiornaEsercizio(indice, 'descrizione', attuale ? `${attuale}\n${testo}` : testo);
  }

  async function handleCancellaNota(id: number) {
    try {
      await cancellaNotaPreset(id);
      setNotePreset(notePreset.filter((n) => n.id !== id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nella cancellazione');
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

  function aggiornaEsercizio(indice: number, campo: CampoTesto, valore: string) {
    setEsercizi(esercizi.map((es, i) => (i === indice ? { ...es, [campo]: valore } : es)));
  }

  // ---- Serie "diverse" di un esercizio ----

  // La nuova serie parte con reps e recupero dell'esercizio: di solito si cambia solo un numero.
  function aggiungiSerieExtra(indice: number) {
    setEsercizi(
      esercizi.map((es, i) =>
        i === indice
          ? {
              ...es,
              serieExtra: es.serieExtra.length >= 10 ? es.serieExtra : [...es.serieExtra, { reps: es.repsTarget, recuperoSecondi: es.recuperoSecondi, nota: '' }],
            }
          : es
      )
    );
  }

  function aggiornaSerieExtra(indice: number, j: number, campo: keyof SerieExtraBozza, valore: string) {
    setEsercizi(
      esercizi.map((es, i) =>
        i === indice
          ? { ...es, serieExtra: es.serieExtra.map((x, k) => (k === j ? { ...x, [campo]: valore } : x)) }
          : es
      )
    );
  }

  function rimuoviSerieExtra(indice: number, j: number) {
    setEsercizi(
      esercizi.map((es, i) => (i === indice ? { ...es, serieExtra: es.serieExtra.filter((_, k) => k !== j) } : es))
    );
  }

  function aggiungiRigaEsercizio() {
    setEsercizi([...esercizi, esercizioVuoto()]);
  }

  // Una riga nuova (mai salvata) si toglie subito. Un esercizio già salvato chiede un
  // secondo tocco: anche se il cliente non perde le serie fatte, meglio non toglierlo per sbaglio.
  function rimuoviRigaEsercizio(indice: number) {
    const riga = esercizi[indice];
    if (riga.id !== undefined && confermaRimuovi !== riga.chiave) {
      setConfermaRimuovi(riga.chiave);
      return;
    }
    setConfermaRimuovi(null);
    if (noteAperte === riga.chiave) setNoteAperte(null);
    setEsercizi(esercizi.filter((_, i) => i !== indice));
  }

  async function handleSalvaScheda(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return; // doppio tocco: il primo salvataggio è ancora in corso
    setErrore('');
    if (!clienteId) {
      setErrore('Scegli il cliente: scrivi le prime lettere e tocca il suggerimento');
      return;
    }
    setSalvando(true);
    try {
      // Reps: "10", "6-9" oppure "Max". Se è altro, fermiamo il salvataggio con un messaggio chiaro.
      const reps = (testo: string, dove: string) => {
        const valore = leggiReps(testo);
        if (valore === undefined) {
          throw new Error(`${dove}: reps non valide. Scrivi un numero (10), un intervallo (6-9) o Max`);
        }
        return valore;
      };

      // Link video scritto senza https:// (es. "youtube.com/...") → lo completiamo noi.
      const link = (url: string) => {
        const pulito = url.trim();
        if (!pulito) return undefined;
        return /^https?:\/\//i.test(pulito) ? pulito : `https://${pulito}`;
      };

      // Numeri interi positivi (serie) o ≥ 0 (recupero): controllati prima di inviare,
      // così l'errore dice subito quale esercizio sistemare.
      const intero = (testo: string, dove: string, campo: string, minimo: number) => {
        const n = Number(testo);
        // testo vuoto → errore (Number('') darebbe 0: un recupero cancellato diventerebbe "nessun recupero")
        if (!testo.trim() || !Number.isInteger(n) || n < minimo) {
          throw new Error(`${dove}: ${campo} non valido${minimo > 0 ? ' (serve un numero maggiore di 0)' : ''}`);
        }
        return n;
      };

      const eserciziValidati = esercizi.map((es, indice) => ({
        nome: es.nome,
        videoUrl: link(es.videoUrl),
        descrizione: es.descrizione || undefined,
        serieTarget: intero(es.serieTarget, es.nome || `Esercizio ${indice + 1}`, 'numero di serie', 1),
        ...(() => {
          const r = reps(es.repsTarget, es.nome || 'Esercizio');
          return { repsTarget: r.reps, repsMax: r.repsMax };
        })(),
        recuperoSecondi: intero(es.recuperoSecondi, es.nome || `Esercizio ${indice + 1}`, 'recupero', 0),
        serieExtra: es.serieExtra.map((x, j) => ({
          ...reps(x.reps, `${es.nome || 'Esercizio'}, serie ${Number(es.serieTarget) + j + 1}`),
          recuperoSecondi: intero(
            x.recuperoSecondi,
            `${es.nome || `Esercizio ${indice + 1}`}, serie ${Number(es.serieTarget) + j + 1}`,
            'recupero',
            0
          ),
          nota: x.nota || undefined,
        })),
      }));

      if (schedaInModifica !== null) {
        // Rimettiamo gli id sugli esercizi già esistenti, così il backend li aggiorna.
        const conId = eserciziValidati.map((dati, i) => ({ ...dati, id: esercizi[i].id }));
        await aggiornaScheda(schedaInModifica, nomeScheda, Number(clienteId), conId);
      } else {
        await creaScheda(nomeScheda, Number(clienteId), eserciziValidati);
      }

      // Dopo il salvataggio apriamo l'elenco di quel cliente: la scheda si vede subito.
      setClienteVisto(Number(clienteId));
      // Reset form e ricarica la lista, così le modifiche appaiono subito.
      resetForm();
      await caricaSchede();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio della scheda');
    } finally {
      setSalvando(false);
    }
  }

  // ---- Archivio: le schede non si cancellano, si archiviano ----
  const [archiviate, setArchiviate] = useState<Scheda[]>([]);
  const [archivioAperto, setArchivioAperto] = useState(false);
  // Scheda per cui è stata chiesta l'eliminazione definitiva (serve un secondo tocco per confermare).
  const [confermaElimina, setConfermaElimina] = useState<number | null>(null);

  async function caricaArchiviate() {
    try {
      setArchiviate(await getSchedeArchiviate());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento dell’archivio');
    }
  }

  // La richiesta di conferma si annulla da sola dopo 4 secondi.
  useEffect(() => {
    if (confermaElimina === null) return;
    const t = setTimeout(() => setConfermaElimina(null), 4000);
    return () => clearTimeout(t);
  }, [confermaElimina]);

  async function handleArchivia(id: number) {
    try {
      setErrore('');
      await archiviaScheda(id);
      // Se stavo modificando proprio questa scheda, esco dalla modifica.
      if (schedaInModifica === id) resetForm();
      setSchede(schede.filter((s) => s.id !== id));
      await caricaArchiviate();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nell’archiviazione');
    }
  }

  async function handleRipristina(id: number) {
    try {
      setErrore('');
      await ripristinaScheda(id);
      setArchiviate(archiviate.filter((s) => s.id !== id));
      await caricaSchede();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel ripristino');
    }
  }

  async function handleEliminaDefinitivo(id: number) {
    try {
      setErrore('');
      await eliminaSchedaDefinitivamente(id);
      setArchiviate(archiviate.filter((s) => s.id !== id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nell’eliminazione');
    } finally {
      setConfermaElimina(null);
    }
  }

  const sessioniVisibili = mostraTutte ? sessioni : sessioni.slice(0, 5);

  return (
    <div className="space-y-10">
      {/* Prima cosa che vede il trainer: chi si è allenato e come è andata */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="h-5 w-1.5 rounded-full bg-accent" />
            Allenamenti completati
          </h2>
          <button
            aria-label="Aggiorna allenamenti completati"
            className="btn-ghost min-h-9 w-9 shrink-0 px-0 text-base"
            onClick={caricaSessioni}
          >
            ↻
          </button>
        </div>
        {sessioni.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
            Nessun cliente ha ancora concluso un allenamento.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {sessioniVisibili.map((s) => {
              const completa = s.serieFatte >= s.serieTotali;
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-accent-ink ${
                      completa ? 'bg-success' : 'bg-accent'
                    }`}
                    aria-hidden
                  >
                    {completa ? '✓' : '½'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {s.cliente.nome} <span className="font-normal text-muted">· {s.scheda.nome}</span>
                    </p>
                    <p className="text-xs text-muted">{quando(s.completataIl)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold tabular-nums ${completa ? 'text-success' : 'text-accent'}`}>
                      {s.serieFatte}/{s.serieTotali} serie
                    </p>
                    <p className="text-xs text-muted tabular-nums">
                      {Math.round(s.volume).toLocaleString('it-IT')} kg
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {sessioni.length > 5 && (
          <button className="btn-link mt-3 text-sm" onClick={() => setMostraTutte(!mostraTutte)}>
            {mostraTutte ? 'Mostra meno' : `Mostra tutti (${sessioni.length})`}
          </button>
        )}
      </section>

      <section
        ref={formRef}
        className={`card scroll-mt-20 sm:p-6 ${schedaInModifica !== null ? 'ring-2 ring-accent' : ''}`}
      >
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
          <span className="h-5 w-1.5 rounded-full bg-accent" />
          {schedaInModifica !== null ? 'Modifica scheda' : 'Nuova scheda'}
        </h2>
        {schedaInModifica !== null && (
          <p className="mb-5 rounded-lg bg-accent-soft px-3 py-2 text-sm text-soft">
            Stai modificando una scheda esistente. Se rimuovi un esercizio esce dalla scheda,
            ma tutte le serie che il cliente ha già registrato restano salvate e puoi rimetterlo
            quando vuoi dall’elenco in fondo agli esercizi.
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
              <label className="label">Cliente</label>
              {/* Si scrivono le prime lettere e si tocca il nome: niente ID da ricordare, niente schede
                  assegnate alla persona sbagliata. La key riparte da zero quando il form si svuota. */}
              <SceltaCliente key={versioneForm} clienti={clienti} valore={clienteId} onChange={setClienteId} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold tracking-wide text-soft uppercase">Esercizi</h3>

            <div className="mb-4 rounded-xl border border-line bg-surface p-3">
              <p className="mb-2 text-xs font-semibold text-muted">
                I tuoi esercizi salvati — tocca per aggiungere
              </p>
              {preset.length === 0 ? (
                <p className="text-xs text-muted">
                  Vuota. Scrivi un esercizio qui sotto e premi “Salva esercizio” per riusarlo le prossime volte.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {preset.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center overflow-hidden rounded-md border border-line bg-surface-2 text-sm"
                    >
                      <button
                        type="button"
                        className="px-3 py-1.5 font-medium transition hover:bg-accent hover:text-accent-ink"
                        onClick={() => aggiungiDaPreset(p)}
                      >
                        + {p.nome}
                      </button>
                      <button
                        type="button"
                        aria-label={`Rimuovi ${p.nome} dalla libreria`}
                        className="border-l border-line px-2 py-1.5 text-muted transition hover:bg-danger-soft hover:text-danger"
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
                  key={es.chiave}
                  className="rounded-xl border border-line bg-surface-2 p-4 transition focus-within:border-accent"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink">
                      {i + 1}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1 text-xs"
                        onClick={() => salvaComePreset(i)}
                      >
                        ☆ Salva esercizio
                      </button>
                      {esercizi.length > 1 && (
                        <button
                          type="button"
                          className="btn-danger px-3 py-1 text-xs"
                          onClick={() => rimuoviRigaEsercizio(i)}
                        >
                          {confermaRimuovi === es.chiave ? 'Sicuro? Tocca ancora' : 'Rimuovi'}
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
                        maxLength={100}
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
                        maxLength={500}
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
                      <CampoReps valore={es.repsTarget} onChange={(v) => aggiornaEsercizio(i, 'repsTarget', v)} />
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
                  {/* Serie aggiunte dopo quelle normali, con valori propri: es. 2 × 10 + una da 15 in drop set */}
                  {es.serieExtra.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {es.serieExtra.map((x, j) => (
                        <div key={j} className="rounded-xl border border-accent/40 bg-accent-soft p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wide text-accent uppercase">
                              Serie {Number(es.serieTarget || 0) + j + 1}
                            </span>
                            <button
                              type="button"
                              aria-label={`Rimuovi serie ${Number(es.serieTarget || 0) + j + 1}`}
                              className="btn-ghost min-h-8 w-8 px-0 text-sm text-muted hover:text-danger"
                              onClick={() => rimuoviSerieExtra(i, j)}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="label">Reps</label>
                              <CampoReps valore={x.reps} onChange={(v) => aggiornaSerieExtra(i, j, 'reps', v)} />
                            </div>
                            <div>
                              <label className="label">Rec. (sec)</label>
                              <input
                                className="input"
                                type="number"
                                inputMode="numeric"
                                value={x.recuperoSecondi}
                                onChange={(e) => aggiornaSerieExtra(i, j, 'recuperoSecondi', e.target.value)}
                              />
                            </div>
                          </div>
                          <input
                            className="input mt-2"
                            placeholder='Nota, es. "drop set" o "a cedimento"'
                            maxLength={200}
                            value={x.nota}
                            onChange={(e) => aggiornaSerieExtra(i, j, 'nota', e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {es.serieExtra.length < 10 && (
                    <button
                      type="button"
                      className="btn-ghost mt-3 w-full border border-dashed border-accent/50 text-accent"
                      onClick={() => aggiungiSerieExtra(i)}
                    >
                      + Aggiungi serie
                    </button>
                  )}

                  <div className="mt-3">
                    <label className="label">Note per il cliente (opzionale)</label>
                    <textarea
                      className="input min-h-[60px] resize-y"
                      placeholder='Es. "3x10 ma con 3 secondi di isometria in basso"'
                      maxLength={1000}
                      value={es.descrizione}
                      onChange={(e) => aggiornaEsercizio(i, 'descrizione', e.target.value)}
                    />
                    {/* Libreria note: salva questa nota, oppure aggiungine una già salvata con un tocco */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary min-h-9 px-3 text-xs"
                        disabled={!es.descrizione.trim()}
                        onClick={() => salvaNota(es.descrizione)}
                      >
                        ☆ Salva nota
                      </button>
                      <button
                        type="button"
                        className={`btn-secondary min-h-9 px-3 text-xs ${noteAperte === es.chiave ? 'border-accent' : ''}`}
                        onClick={() => setNoteAperte(noteAperte === es.chiave ? null : es.chiave)}
                      >
                        Note salvate ({notePreset.length}) {noteAperte === es.chiave ? '▴' : '▾'}
                      </button>
                    </div>
                    {noteAperte === es.chiave && (
                      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
                        {notePreset.length === 0 ? (
                          <p className="px-1 py-1 text-xs text-muted">
                            Nessuna nota salvata. Scrivine una qui sopra e premi “Salva nota”.
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-1.5">
                            {notePreset.map((n) => (
                              <li key={n.id} className="flex items-stretch overflow-hidden rounded-lg border border-line bg-surface-2">
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 px-3 py-2 text-left text-sm transition hover:bg-accent hover:text-accent-ink"
                                  onClick={() => inserisciNota(i, n.testo)}
                                >
                                  + {n.testo}
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Elimina la nota salvata: ${n.testo}`}
                                  className="border-l border-line px-3 text-muted transition hover:bg-danger-soft hover:text-danger"
                                  onClick={() => handleCancellaNota(n.id)}
                                >
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary mt-3 w-full border-dashed sm:w-auto" onClick={aggiungiRigaEsercizio}>
              + Aggiungi esercizio
            </button>

            {/* Solo in modifica: esercizi tolti in passato da questa scheda, con le serie del cliente
                ancora salvate. "Rimetti" li riporta nella scheda con tutto il loro storico. */}
            {schedaInModifica !== null && eserciziRimossi.length > 0 && (
              <div className="mt-5 rounded-xl border border-line bg-surface p-3">
                <p className="mb-2 text-xs font-semibold text-muted">Esercizi tolti da questa scheda (dati conservati)</p>
                <ul className="divide-y divide-line">
                  {eserciziRimossi.map((es) => (
                    <li key={es.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{es.nome}</p>
                        <p className="text-xs text-muted">
                          {es._count.registri > 0 ? `${es._count.registri} serie registrate` : 'nessuna serie registrata'}
                          {' · tolto il '}
                          {new Date(es.archiviatoIl).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <button type="button" className="btn-secondary shrink-0 px-3 py-1 text-xs" onClick={() => handleRipristinaEsercizio(es)}>
                        ↺ Rimetti
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            {schedaInModifica !== null && (
              <button type="button" className="btn-secondary w-full px-6 py-2.5 sm:w-auto" onClick={resetForm}>
                Annulla modifica
              </button>
            )}
            <button type="submit" className="btn-primary w-full px-6 py-2.5 sm:w-auto" disabled={salvando}>
              {salvando ? 'Salvo…' : schedaInModifica !== null ? 'Salva modifiche' : 'Crea scheda'}
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
          <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
            Nessuna scheda ancora creata.
          </p>
        )}

        {/* Elenco clienti: si tocca un nome e sotto compaiono solo le sue schede */}
        {clienti.length > 0 && (
          <div className="mb-4">
            <p className="label">Scegli il cliente</p>
            <div className="flex flex-wrap gap-2">
              {clienti.map((c) => {
                const numero = schede.filter((sc) => sc.clienteId === c.id).length;
                const attivo = clienteVisto === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={attivo}
                    onClick={() => setClienteVisto(attivo ? null : c.id)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
                      attivo
                        ? 'border-accent bg-accent text-accent-ink'
                        : 'border-line bg-surface-2 text-ink hover:border-accent'
                    }`}
                  >
                    {c.nome}
                    <span className={`text-xs font-bold ${attivo ? 'opacity-70' : 'text-muted'}`}>{numero}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {schede.length > 0 && clienteVisto === null && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
            Tocca il nome di un cliente per vedere le sue schede.
          </p>
        )}
        {clienteVisto !== null && !schede.some((sc) => sc.clienteId === clienteVisto) && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
            {nomeCliente(clienteVisto)} non ha ancora schede.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {schede.filter((sc) => sc.clienteId === clienteVisto).map((scheda) => (
            <div key={scheda.id} className="card flex flex-col transition hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block text-lg leading-tight font-bold break-words">{scheda.nome}</strong>
                  <span className="mt-1 inline-block rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                    {nomeCliente(scheda.clienteId)}
                  </span>
                  {/* Data di creazione + quanto tempo fa: le schede sono già in ordine dalla più recente */}
                  <p className={`mt-1.5 text-xs ${eVecchia(scheda.creataIl) ? 'font-semibold text-accent' : 'text-muted'}`}>
                    Creata il {dataBreve(scheda.creataIl)} · {etaScheda(scheda.creataIl)}
                    {eVecchia(scheda.creataIl) && ' · da aggiornare?'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => avviaModifica(scheda)}
                    disabled={schedaInModifica === scheda.id}
                  >
                    {schedaInModifica === scheda.id ? 'In modifica…' : 'Modifica'}
                  </button>
                  {/* Archivia: nessuna conferma serve, perché non si perde niente e si ripristina con un tocco */}
                  <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => handleArchivia(scheda.id)}>
                    Archivia
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {scheda.esercizi.map((es) => (
                  <li key={es.id} className="py-2 text-sm">
                    {/* flex-wrap: se nome e serie non stanno sulla stessa riga, il testo va a capo invece di uscire dallo schermo */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="min-w-0 font-medium break-words">{es.nome}</span>
                      <span className="min-w-0 text-muted">
                        <span className="font-semibold text-ink">{riassuntoSerie(es)}</span> · {testoRecupero(es.recuperoSecondi)}
                      </span>
                    </div>
                    {(es.serieExtra || []).map((x, j) => (
                      <p key={j} className="mt-1 text-xs text-accent">
                        + Serie {es.serieTarget + j + 1}: {testoReps(x.reps, x.repsMax)} reps · {testoRecupero(x.recuperoSecondi)}
                        {x.nota ? ` · ${x.nota}` : ''}
                      </p>
                    ))}
                    {es.descrizione && <p className="mt-1 text-xs text-muted">{es.descrizione}</p>}

                    <button
                      type="button"
                      className="btn-link mt-1 text-xs"
                      onClick={() => toggleStorico(es.id)}
                    >
                      {storicoAperto === es.id ? 'Nascondi note cliente' : 'Vedi note cliente'}
                    </button>

                    {storicoAperto === es.id && (
                      <div className="mt-2 rounded-lg border border-line bg-surface-2 p-2">
                        {storico.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-muted">Nessun allenamento registrato ancora.</p>
                        ) : (
                          <ul className="divide-y divide-line">
                            {storico.map((r) => (
                              <li key={r.id} className="px-2 py-1.5 text-xs">
                                <div className="flex items-center justify-between gap-2 text-muted">
                                  <span>{new Date(r.data).toLocaleDateString('it-IT')}</span>
                                  <span className="font-semibold text-ink">
                                    {r.pesoUsato}kg x {r.repsFatte}
                                  </span>
                                </div>
                                {r.nota && <p className="mt-0.5 italic text-muted">"{r.nota}"</p>}
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

      {/* Accesso dei clienti: correggere l'email o dare una password temporanea a chi l'ha dimenticata */}
      <section>
        <button
          type="button"
          className="btn-ghost w-full justify-between px-4"
          onClick={() => setClientiAperti(!clientiAperti)}
        >
          <span>I tuoi clienti ({clienti.length}) · email e password</span>
          <span aria-hidden>{clientiAperti ? '▴' : '▾'}</span>
        </button>
        {clientiAperti && (
          <div className="mt-3 space-y-2">
            {clienti.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                Nessun cliente registrato.
              </p>
            )}
            {clienti.map((c) => (
              <div key={c.id} className="card space-y-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.nome}</p>
                    <p className="truncate text-xs text-muted">{c.email}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                    onClick={() => setAccessoAperto(accessoAperto === c.id ? null : c.id)}
                  >
                    {accessoAperto === c.id ? 'Chiudi' : 'Gestisci'}
                  </button>
                </div>
                {accessoAperto === c.id && (
                  <AccessoCliente
                    key={c.id}
                    cliente={c}
                    onEmailCambiata={(agg) => setClienti((prev) => prev.map((x) => (x.id === agg.id ? { ...x, ...agg } : x)))}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Archivio: schede tolte dalla vista. Nessun dato perso: si ripristinano con un tocco. */}
      <section>
        <button
          type="button"
          className="btn-ghost w-full justify-between px-4"
          onClick={() => {
            if (!archivioAperto) caricaArchiviate();
            setArchivioAperto(!archivioAperto);
          }}
        >
          <span>Schede archiviate{archivioAperto ? ` (${archiviate.length})` : ''}</span>
          <span aria-hidden>{archivioAperto ? '▴' : '▾'}</span>
        </button>

        {archivioAperto && (
          <div className="mt-3 space-y-3">
            {archiviate.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                Nessuna scheda archiviata.
              </p>
            ) : (
              archiviate.map((scheda) => (
                <div key={scheda.id} className="card space-y-3">
                  <div>
                    <strong className="block leading-tight font-bold break-words">{scheda.nome}</strong>
                    <p className="mt-1 text-xs text-muted">
                      {nomeCliente(scheda.clienteId)} · creata il {dataBreve(scheda.creataIl)}
                      {scheda.archiviataIl &&
                        ` · archiviata il ${new Date(scheda.archiviataIl).toLocaleDateString('it-IT')}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary flex-1 text-xs" onClick={() => handleRipristina(scheda.id)}>
                      ↺ Ripristina
                    </button>
                    {/* Eliminazione definitiva solo se non c'è storico (es. scheda creata per sbaglio) */}
                    {scheda.haStorico ? (
                      <p className="w-full text-xs text-muted">
                        Ha allenamenti registrati: resta in archivio per proteggere i dati del cliente.
                      </p>
                    ) : confermaElimina === scheda.id ? (
                      <button
                        className="btn-danger flex-1 text-xs"
                        onClick={() => handleEliminaDefinitivo(scheda.id)}
                      >
                        Sicuro? Elimina per sempre
                      </button>
                    ) : (
                      <button
                        className="btn-ghost flex-1 text-xs text-muted hover:text-danger"
                        onClick={() => setConfermaElimina(scheda.id)}
                      >
                        Elimina definitivamente
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
