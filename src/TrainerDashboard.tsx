import { Fragment, useEffect, useRef, useState } from 'react';
import SezioneInviti from './Inviti';
import PanoramicaTrainer from './PanoramicaTrainer';
import TrainerInAttesa from './TrainerInAttesa';
import StoricoCliente from './StoricoCliente';
import MisureCorporee from './MisureCorporee';
import CardioPassi from './CardioPassi';
import DiarioAlimentare from './DiarioAlimentare';
import FeedbackCliente, { ChipFatica } from './FeedbackCliente';
import { gruppiCollegati, sigla, InfoGruppo } from './collegamenti';
import { CampoNomeEsercizio, PannelloLibreria, SceltaGruppo } from './LibreriaEsercizi';
import {
  getMe,
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
  cambiaGruppoPreset,
  GruppoMuscolare,
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
  sospendiCliente,
  riattivaCliente,
  reimpostaPasswordCliente,
  getEserciziArchiviati,
  ripristinaEsercizio,
  EsercizioArchiviato,
  Esercizio,
  TipoCollegamento,
  getTrainerInAttesa,
  getConteggiProgrammi,
} from './api';
import { riassuntoSerie, testoReps, testoRecupero, leggiReps } from './serie';
import { locale, tr } from './lingua';
import { BarraSezioni, ICONE, ricordaSezione, useIndirizzo } from './Sezioni';
import CampoReps from './CampoReps';

// Da quanto tempo esiste una scheda, in parole: "oggi", "3 giorni fa", "2 mesi fa".
function etaScheda(iso: string): string {
  const giorni = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (giorni <= 0) return tr('oggi', 'today');
  if (giorni === 1) return tr('ieri', 'yesterday');
  if (giorni < 14) return tr(`${giorni} giorni fa`, `${giorni} days ago`);
  if (giorni < 60) return tr(`${Math.floor(giorni / 7)} settimane fa`, `${Math.floor(giorni / 7)} weeks ago`);
  if (giorni < 365) return tr(`${Math.floor(giorni / 30)} mesi fa`, `${Math.floor(giorni / 30)} months ago`);
  const anni = Math.floor(giorni / 365);
  return anni === 1 ? tr('1 anno fa', '1 year ago') : tr(`${anni} anni fa`, `${anni} years ago`);
}

// "29/09/2026"
const dataBreve = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

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
      setMessaggio({
        ok: true,
        testo: tr(`Email aggiornata: ora ${cliente.nome} accede con ${aggiornato.email}`, `Email updated: ${cliente.nome} now signs in with ${aggiornato.email}`),
      });
    } catch (err) {
      setMessaggio({ ok: false, testo: err instanceof Error ? err.message : tr('Errore nel salvataggio', 'Error saving') });
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
      setMessaggio({ ok: false, testo: err instanceof Error ? err.message : tr('Errore nel reset', 'Reset error') });
    } finally {
      setInInvio(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-line pt-3">
      <div>
        <label className="label">{tr('Email per accedere', 'Sign-in email')}</label>
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
            {tr('Salva', 'Save')}
          </button>
        </div>
      </div>

      <div>
        <p className="label">Password</p>
        {salvata ? (
          <div className="rounded-xl border border-success/40 bg-success-soft p-3 text-sm">
            <p>{tr(`Password temporanea di ${cliente.nome}:`, `${cliente.nome}’s temporary password:`)}</p>
            <p className="my-2 text-center font-mono text-2xl font-extrabold tracking-wider select-all">{salvata}</p>
            <p className="text-soft">
              {tr(
                'Diglielo a voce o scrivigliela. Al primo accesso dovrà sceglierne una sua, che tu non vedrai. I suoi dispositivi collegati sono stati disconnessi.',
                'Tell them or write it down for them. On first sign-in they’ll have to choose their own, which you won’t see. Their signed-in devices have been signed out.',
              )}
            </p>
            <button type="button" className="btn-link mt-2 text-xs" onClick={() => setSalvata(null)}>
              {tr('Ok, fatto', 'OK, done')}
            </button>
          </div>
        ) : temporanea ? (
          <div className="rounded-xl border border-accent-strong/50 bg-accent-soft p-3 text-sm">
            <p>{tr('Nuova password temporanea:', 'New temporary password:')}</p>
            <p className="my-2 text-center font-mono text-2xl font-extrabold tracking-wider">{temporanea}</p>
            <p className="text-soft">{tr(`La password attuale di ${cliente.nome} smetterà di funzionare.`, `${cliente.nome}’s current password will stop working.`)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => setTemporanea(null)} disabled={inInvio}>
                {tr('Annulla', 'Cancel')}
              </button>
              <button type="button" className="btn-primary text-xs" onClick={confermaReset} disabled={inInvio}>
                {inInvio ? tr('Salvo…', 'Saving…') : tr('Conferma', 'Confirm')}
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
            {tr('Reimposta password', 'Reset password')}
          </button>
        )}
      </div>

      <SospensioneCliente cliente={cliente} onCambiato={onEmailCambiata} />

      {messaggio && <p className={messaggio.ok ? 'alert-success' : 'alert-error'}>{messaggio.testo}</p>}
    </div>
  );
}

// Sospendere l'accesso di un cliente (es. ha smesso di venire o non paga): non può più entrare
// nell'app, ma NESSUN dato viene cancellato. Si riattiva con un tocco e ritrova tutto.
function SospensioneCliente({ cliente, onCambiato }: { cliente: Cliente; onCambiato: (c: Cliente) => void }) {
  const [conferma, setConferma] = useState(false);
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');

  async function esegui() {
    setInInvio(true);
    setErrore('');
    try {
      onCambiato(cliente.sospeso ? await riattivaCliente(cliente.id) : await sospendiCliente(cliente.id));
      setConferma(false);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Operazione non riuscita', 'Operation failed'));
    } finally {
      setInInvio(false);
    }
  }

  return (
    <div>
      <p className="label">{tr('Accesso all’app', 'App access')}</p>
      {cliente.sospeso ? (
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
          <p className="text-soft">
            <strong className="text-warning">{tr('Sospeso.', 'Suspended.')}</strong>{' '}
            {tr(
              `${cliente.nome} non può accedere. Schede, serie e misure sono tutte al loro posto.`,
              `${cliente.nome} can’t sign in. Programmes, sets and measurements are all still there.`,
            )}
          </p>
          <button type="button" className="btn-primary w-full text-xs" disabled={inInvio} onClick={esegui}>
            {inInvio ? tr('Un momento…', 'One moment…') : tr('Riattiva l’accesso', 'Restore access')}
          </button>
        </div>
      ) : conferma ? (
        <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <p className="text-soft">
            {tr(
              `Sospendi ${cliente.nome}? Non potrà più accedere finché non lo riattivi. Non viene cancellato niente.`,
              `Suspend ${cliente.nome}? They won’t be able to sign in until you reactivate them. Nothing is deleted.`,
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-secondary text-xs" disabled={inInvio} onClick={() => setConferma(false)}>{tr('Annulla', 'Cancel')}</button>
            <button type="button" className="btn-danger text-xs" disabled={inInvio} onClick={esegui}>
              {inInvio ? tr('Un momento…', 'One moment…') : tr('Sì, sospendi', 'Yes, suspend')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-ghost w-full text-xs" onClick={() => setConferma(true)}>
          {tr('Sospendi l’accesso', 'Suspend access')}
        </button>
      )}
      {errore && <p role="alert" className="alert-error mt-2">{errore}</p>}
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
        aria-label={tr('Cliente della scheda', 'Programme client')}
        aria-expanded={aperto}
        aria-autocomplete="list"
        autoComplete="off"
        autoCapitalize="none"
        placeholder={tr('Scrivi il nome…', 'Type the name…')}
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
            <li className="px-3 py-3 text-sm text-muted">{tr('Nessun cliente trovato', 'No clients found')}</li>
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

// ---------- Superset / jumpset nell'editor ----------

// Etichetta del gruppo sulla card: "Superset", "Jumpset"… (la sigla A1/A2 è nel pallino accanto).
function ChipGruppo({ g }: { g: InfoGruppo }) {
  return <span className="chip min-w-0 truncate bg-accent-soft text-accent-strong">{g.nome}</span>;
}

// Al posto del campo recupero, in un superset: tra i due esercizi non si riposa.
function RecuperoAssente() {
  return (
    <p className="input flex items-center text-sm text-muted" aria-label={tr('Nessun recupero', 'No rest')}>
      {tr('Nessuno', 'None')}
    </p>
  );
}

// Cosa succede con il recupero di questo esercizio dentro il gruppo, in parole semplici.
function spiegaRecupero(tipo: TipoCollegamento | '', g: InfoGruppo): string {
  const successivo = `${g.lettera}${g.posizione + 1}`;
  if (tipo === 'SUPERSET' && g.posizione < g.dimensione)
    return tr(`Dopo ogni serie si passa subito a ${successivo}, senza recupero.`, `After each set, move straight to ${successivo}, with no rest.`);
  if (tipo === 'JUMPSET' && g.posizione < g.dimensione)
    return tr(`Questo recupero si fa prima di passare a ${successivo}.`, `This rest is taken before moving to ${successivo}.`);
  return tr(
    `Fine giro: questo recupero si fa prima di ricominciare da ${g.lettera}1 (esercizio ${g.inizio + 1}).`,
    `End of round: this rest is taken before starting again from ${g.lettera}1 (exercise ${g.inizio + 1}).`,
  );
}

// Tra un esercizio e il successivo: collegali in superset o jumpset, oppure scollegali.
function Collegamento({
  tipo,
  onCambia,
  numeroSuccessivo,
}: {
  tipo: TipoCollegamento | '';
  onCambia: (tipo: TipoCollegamento | '') => void;
  numeroSuccessivo: number;
}) {
  if (!tipo) {
    return (
      <div className="flex justify-center py-1.5">
        <button
          type="button"
          className="btn-ghost min-h-9 px-3 text-xs text-muted"
          onClick={() => onCambia('SUPERSET')}
        >
          {tr(`+ Collega con l’esercizio ${numeroSuccessivo}`, `+ Link with exercise ${numeroSuccessivo}`)}
        </button>
      </div>
    );
  }
  const opzione = (valore: TipoCollegamento, testo: string) => (
    <button
      type="button"
      aria-pressed={tipo === valore}
      className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${
        tipo === valore ? 'bg-accent text-accent-ink' : 'text-soft hover:text-ink'
      }`}
      onClick={() => onCambia(valore)}
    >
      {testo}
    </button>
  );
  return (
    <div className="relative flex justify-center py-1.5">
      {/* La linea verticale "lega" visivamente le due card */}
      <span aria-hidden className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-accent-strong/60" />
      <div
        role="group"
        aria-label={tr(`Collegamento con l’esercizio ${numeroSuccessivo}`, `Link with exercise ${numeroSuccessivo}`)}
        className="relative flex items-center gap-1 rounded-full border border-accent-strong/60 bg-surface p-1"
      >
        {opzione('SUPERSET', 'Superset')}
        {opzione('JUMPSET', 'Jumpset')}
        <button
          type="button"
          aria-label={tr('Scollega', 'Unlink')}
          className="min-h-9 rounded-full px-3 text-xs text-muted transition hover:text-danger"
          onClick={() => onCambia('')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// "oggi alle 18:32", "ieri alle 9:05", oppure "lun 21/09 alle 18:32".
function quando(iso: string): string {
  const d = new Date(iso);
  const ora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const oggi = new Date();
  const ieri = new Date();
  ieri.setDate(oggi.getDate() - 1);
  if (d.toDateString() === oggi.toDateString()) return tr(`oggi alle ${ora}`, `today at ${ora}`);
  if (d.toDateString() === ieri.toDateString()) return tr(`ieri alle ${ora}`, `yesterday at ${ora}`);
  const giorno = d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
  return tr(`${giorno} alle ${ora}`, `${giorno} at ${ora}`);
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
  // Collegato all'esercizio successivo ('' = singolo)
  collegamento: TipoCollegamento | '';
};

// Campi "semplici" (testo) di un esercizio, modificabili con aggiornaEsercizio.
type CampoTesto = Exclude<keyof EsercizioBozza, 'id' | 'serieExtra' | 'chiave' | 'collegamento'>;

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
  collegamento: '',
});

// Sezioni del trainer (barra in basso sul telefono, schede in alto sul computer)
// e pagine della scheda di un cliente.
const SEZIONI_TRAINER = ['attivita', 'clienti', 'inviti', 'trainer'] as const;
type SezioneTrainer = (typeof SEZIONI_TRAINER)[number];
const PAGINE_CLIENTE = ['schede', 'cardio', 'diario', 'corpo', 'accesso'] as const;
type PaginaCliente = (typeof PAGINE_CLIENTE)[number];

export default function TrainerDashboard() {
  const [schede, setSchede] = useState<Scheda[]>([]);
  const [errore, setErrore] = useState('');
  // true solo per l'amministratore (lo dice il server): vede anche "Inviti trainer".
  const [admin, setAdmin] = useState(false);
  const [adminNoto, setAdminNoto] = useState(false); // la risposta del server è arrivata
  useEffect(() => {
    getMe()
      .then((me) => setAdmin(me.admin === true))
      .catch(() => setAdmin(false)) // in caso di errore la sezione resta nascosta
      .finally(() => setAdminNoto(true));
  }, []);
  // Solo amministratore: quanti trainer aspettano l'approvazione (avviso in alto e numero nel menu).
  const [trainerInAttesa, setTrainerInAttesa] = useState(0);
  // Cambia dopo un'approvazione: la panoramica dei trainer si ricarica e mostra il nuovo arrivato.
  const [chiavePanoramica, setChiavePanoramica] = useState(0);
  // Il numero serve subito (pallino sulla voce "Trainer"), anche prima di aprire quella sezione.
  useEffect(() => {
    if (admin) getTrainerInAttesa().then((l) => setTrainerInAttesa(l.length)).catch(() => {});
  }, [admin]);
  // Solo amministratore: qualcuno ha toccato "Avvisami" su un programma dopo l'ultima visita alla sezione "Trainer"?
  const [ultimoAvvisoProgrammi, setUltimoAvvisoProgrammi] = useState<string | null>(null);
  const [programmiVisti, setProgrammiVisti] = useState(() => ricordaSezione('programmiVistiIl') ?? '');
  useEffect(() => {
    if (admin) getConteggiProgrammi().then((r) => setUltimoAvvisoProgrammi(r.ultimoAvvisoIl ?? null)).catch(() => {});
  }, [admin]);

  const [nomeScheda, setNomeScheda] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [esercizi, setEsercizi] = useState<EsercizioBozza[]>([esercizioVuoto()]);

  // null = sto creando una scheda nuova; un numero = sto modificando quella scheda.
  // Lo stesso form serve per entrambe le cose.
  const [schedaInModifica, setSchedaInModifica] = useState<number | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const [editorAperto, setEditorAperto] = useState(false);

  useEffect(() => {
    if (editorAperto) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editorAperto, schedaInModifica]);

  // ---- Dove si trova il trainer: sta nell'indirizzo, così il tasto "indietro" funziona ----
  // #attivita · #clienti (elenco) · #clienti/12 (pagina del cliente) · #clienti/12/diario · #inviti · #trainer
  const [indirizzo, vai] = useIndirizzo();
  const [pezzo0, pezzo1, pezzo2] = indirizzo.split('/');
  const sezioneDaIndirizzo = SEZIONI_TRAINER.find((x) => x === pezzo0);
  const sezione: SezioneTrainer = sezioneDaIndirizzo ?? SEZIONI_TRAINER.find((x) => x === ricordaSezione('sezioneTrainer')) ?? 'attivita';
  // Cliente di cui è aperta la pagina (null = elenco dei clienti).
  const clienteVisto = sezione === 'clienti' && /^\d{1,9}$/.test(pezzo1 ?? '') ? Number(pezzo1) : null;
  const paginaCliente: PaginaCliente = PAGINE_CLIENTE.find((x) => x === pezzo2) ?? 'schede';
  function apriCliente(id: number | null, pagina: PaginaCliente = 'schede', sostituisci = false) {
    vai(id === null ? 'clienti' : `clienti/${id}${pagina === 'schede' ? '' : `/${pagina}`}`, sostituisci);
  }
  useEffect(() => {
    // Indirizzo vuoto o sconosciuto: si sistema senza aggiungere un passo alla cronologia.
    if (!sezioneDaIndirizzo) vai(sezione, true);
    else if (sezione === 'trainer' && adminNoto && !admin) vai('attivita', true);
    else ricordaSezione('sezioneTrainer', sezione);
  });
  useEffect(() => {
    if (sezione !== 'trainer' || !admin) return;
    const adesso = new Date().toISOString();
    ricordaSezione('programmiVistiIl', adesso);
    setProgrammiVisti(adesso);
  }, [sezione, admin]);
  const nuoviAvvisiProgrammi = !!ultimoAvvisoProgrammi && ultimoAvvisoProgrammi > programmiVisti && sezione !== 'trainer';

  // Cambia ogni volta che il form si svuota o carica un'altra scheda: azzera il testo digitato nel campo cliente.
  const [versioneForm, setVersioneForm] = useState(0);
  // Nome dell'ultimo giorno appena creato: l'editor resta aperto sullo stesso cliente
  // per creare subito il giorno successivo, finché non si tocca "Ho finito".
  const [giornoSalvato, setGiornoSalvato] = useState<string | null>(null);

  function resetForm() {
    setGiornoSalvato(null);
    setEditorAperto(false);
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
    setGiornoSalvato(null);
    setEditorAperto(true);
    setVersioneForm((v) => v + 1);
    setErrore('');
    setSchedaInModifica(scheda.id);
    setNomeScheda(scheda.nome);
    setClienteId(String(scheda.clienteId));
    setEsercizi(scheda.esercizi.map(daEsercizioABozza));
    setConfermaRimuovi(null);
    setNoteAperte(null);
    caricaEserciziRimossi(scheda.id);
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
      repsTarget: testoReps(es.repsTarget, es.repsMax, es.piuMax, es.rpSecondi),
      recuperoSecondi: String(es.recuperoSecondi),
      serieExtra: (es.serieExtra || []).map((x) => ({
        reps: testoReps(x.reps, x.repsMax, x.piuMax, x.rpSecondi),
        recuperoSecondi: String(x.recuperoSecondi),
        nota: x.nota || '',
      })),
      collegamento: es.collegamento ?? '',
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
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento degli esercizi rimossi', 'Error loading removed exercises'));
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
      setErrore(err instanceof Error ? err.message : tr('Errore nel ripristino dell’esercizio', 'Error restoring the exercise'));
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
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento storico', 'Error loading history'));
    }
  }

  async function caricaSchede() {
    try {
      const dati = await getSchede();
      setSchede(dati);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento schede', 'Error loading programmes'));
    }
  }

  // Clienti per il menu a tendina: si sceglie il nome, non si scrive l'ID a mano.
  const [clienti, setClienti] = useState<Cliente[]>([]);
  // Pannello "Progressi" di una scheda: aperto dalla scheda o da un allenamento completato.
  const [progressiScheda, setProgressiScheda] = useState<{ schedaId: number; giorno?: string } | null>(null);
  // Sezione "I tuoi clienti": cliente di cui è aperta la gestione dell'accesso.
  const [clientiCaricati, setClientiCaricati] = useState(false);
  async function caricaClienti() {
    try {
      setClienti(await getClienti());
      setClientiCaricati(true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento dei clienti', 'Error loading clients'));
    }
  }
  const nomeCliente = (id: number) => clienti.find((c) => c.id === id)?.nome ?? tr(`cliente #${id}`, `client #${id}`);

  // true mentre il salvataggio è in corso: blocca il doppio tocco su "Crea scheda".
  const [salvando, setSalvando] = useState(false);

  // Libreria esercizi salvati: si clicca per aggiungere, invece di riscrivere.
  const [preset, setPreset] = useState<EsercizioPreset[]>([]);

  // Allenamenti conclusi dai clienti (il più recente in cima).
  const [sessioni, setSessioni] = useState<SessioneAllenamento[]>([]);
  const [mostraTutte, setMostraTutte] = useState(false);
  // Allenamenti completati: si guardano un cliente alla volta (null = il cliente che si è allenato per ultimo).
  const [clienteSessioni, setClienteSessioni] = useState<number | null>(null);

  async function caricaSessioni() {
    try {
      setSessioni(await getSessioni());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento degli allenamenti', 'Error loading workouts'));
    }
  }

  async function caricaPreset() {
    try {
      setPreset(await getPreset());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento della libreria', 'Error loading the library'));
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
    let chiave = riga.chiave;
    if (ultima && !ultima.nome.trim() && ultima.id === undefined) {
      chiave = ultima.chiave;
      setEsercizi([...esercizi.slice(0, -1), { ...riga, chiave }]);
    } else {
      setEsercizi([...esercizi, riga]);
    }
    // Sul telefono chiudiamo il pannello e portiamo in vista l'esercizio appena aggiunto.
    setLibreriaAperta(false);
    setTimeout(() => document.getElementById(`riga-${chiave}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  }

  // Suggerimento scelto mentre si scrive il nome: riempie quella riga
  // (video e note solo se erano vuoti, per non cancellare quello che hai già scritto).
  function scegliSuggerimento(indice: number, p: EsercizioPreset) {
    setEsercizi(
      esercizi.map((es, i) =>
        i === indice
          ? { ...es, nome: p.nome, videoUrl: es.videoUrl || p.videoUrl || '', descrizione: es.descrizione || p.descrizione || '' }
          : es
      )
    );
  }

  // Libreria su telefono: pannello che si apre dal basso.
  const [libreriaAperta, setLibreriaAperta] = useState(false);
  const [scrivendo, setScrivendo] = useState(false);
  // Riga per cui si sta scegliendo il gruppo muscolare prima di salvarla in libreria.
  const [gruppoPer, setGruppoPer] = useState<number | null>(null);

  async function handleCambiaGruppo(p: EsercizioPreset, gruppo: GruppoMuscolare | null) {
    try {
      const aggiornato = await cambiaGruppoPreset(p.id, gruppo);
      setPreset((prev) => prev.map((x) => (x.id === aggiornato.id ? aggiornato : x)));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel cambio di gruppo', 'Error changing the group'));
    }
  }

  // Primo tocco su "Salva esercizio": chiede il gruppo muscolare; poi salva.
  function chiediGruppo(indice: number) {
    const es = esercizi[indice];
    if (!es.nome.trim()) {
      setErrore(tr('Scrivi almeno il nome dell’esercizio prima di salvarlo', 'Type at least the exercise name before saving it'));
      return;
    }
    if (preset.some((p) => p.nome.toLowerCase() === es.nome.trim().toLowerCase())) {
      setErrore(tr(`"${es.nome}" è già nella tua libreria`, `"${es.nome}" is already in your library`));
      return;
    }
    setErrore('');
    setGruppoPer(es.chiave);
  }

  async function salvaComePreset(indice: number, gruppo: GruppoMuscolare) {
    setGruppoPer(null);
    const es = esercizi[indice];
    if (!es.nome.trim()) {
      setErrore(tr('Scrivi almeno il nome dell’esercizio prima di salvarlo', 'Type at least the exercise name before saving it'));
      return;
    }
    // Evita doppioni con lo stesso nome nella libreria.
    if (preset.some((p) => p.nome.toLowerCase() === es.nome.trim().toLowerCase())) {
      setErrore(tr(`"${es.nome}" è già nella tua libreria`, `"${es.nome}" is already in your library`));
      return;
    }
    try {
      setErrore('');
      // In libreria esercizi vanno solo nome e video: le note hanno la loro libreria a parte.
      await creaPreset(es.nome.trim(), es.videoUrl, undefined, gruppo);
      await caricaPreset();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio', 'Error saving'));
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
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento delle note', 'Error loading notes'));
    }
  }

  async function salvaNota(testo: string) {
    const pulito = testo.trim();
    if (notePreset.some((n) => n.testo.toLowerCase() === pulito.toLowerCase())) {
      setErrore(tr('Questa nota è già tra le note salvate', 'This note is already among your saved notes'));
      return;
    }
    try {
      setErrore('');
      const nuova = await creaNotaPreset(pulito);
      setNotePreset([...notePreset, nuova].sort((a, b) => a.testo.localeCompare(b.testo)));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio della nota', 'Error saving the note'));
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
      setErrore(err instanceof Error ? err.message : tr('Errore nella cancellazione', 'Error deleting'));
    }
  }

  async function handleCancellaPreset(id: number) {
    try {
      await cancellaPreset(id);
      setPreset(preset.filter((p) => p.id !== id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nella cancellazione', 'Error deleting'));
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

  // Superset / jumpset: collega (o scollega) l'esercizio con quello successivo.
  // Passando a jumpset il recupero torna visibile: se era 0 (es. veniva da un superset)
  // proponiamo 60 secondi, così non resta un jumpset senza recupero per sbaglio.
  function cambiaCollegamento(indice: number, tipo: TipoCollegamento | '') {
    setEsercizi(
      esercizi.map((es, i) => {
        if (i !== indice) return es;
        const senzaRecupero = !es.recuperoSecondi.trim() || Number(es.recuperoSecondi) === 0;
        return { ...es, collegamento: tipo, recuperoSecondi: tipo === 'JUMPSET' && senzaRecupero ? '60' : es.recuperoSecondi };
      })
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
      setErrore(tr('Scegli il cliente: scrivi le prime lettere e tocca il suggerimento', 'Choose the client: type the first letters and tap the suggestion'));
      return;
    }
    setSalvando(true);
    try {
      // Reps: "10", "6-9", "Max" oppure con il drop set "6-9 + max". Se è altro, fermiamo il salvataggio con un messaggio chiaro.
      const reps = (testo: string, dove: string) => {
        const valore = leggiReps(testo);
        if (valore === undefined) {
          throw new Error(
            tr(`${dove}: reps non valide. Scrivi un numero (10), un intervallo (6-9), Max, oppure 6-9 + max o 6-9 + rp 15 (pausa tra 5 e 120 secondi)`, `${dove}: invalid reps. Enter a number (10), a range (6-9), Max, or 6-9 + max or 6-9 + rp 15 (break between 5 and 120 seconds)`),
          );
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
          throw new Error(
            tr(
              `${dove}: ${campo} non valido${minimo > 0 ? ' (serve un numero maggiore di 0)' : ''}`,
              `${dove}: invalid ${campo}${minimo > 0 ? ' (a number greater than 0 is needed)' : ''}`,
            ),
          );
        }
        return n;
      };

      // In un superset il recupero tra un esercizio e il successivo non c'è (il campo è nascosto):
      // se è vuoto o strano non blocchiamo il salvataggio, mandiamo 0.
      const recuperoNascosto = (testo: string) => {
        const n = Number(testo);
        return testo.trim() && Number.isInteger(n) && n >= 0 ? n : 0;
      };

      const eserciziValidati = esercizi.map((es, indice) => {
        const superset = es.collegamento === 'SUPERSET' && indice < esercizi.length - 1;
        return {
        nome: es.nome,
        videoUrl: link(es.videoUrl),
        descrizione: es.descrizione || undefined,
        serieTarget: intero(es.serieTarget, es.nome || tr(`Esercizio ${indice + 1}`, `Exercise ${indice + 1}`), tr('numero di serie', 'number of sets'), 1),
        ...(() => {
          const r = reps(es.repsTarget, es.nome || tr('Esercizio', 'Exercise'));
          return { repsTarget: r.reps, repsMax: r.repsMax, piuMax: r.piuMax, rpSecondi: r.rpSecondi };
        })(),
        recuperoSecondi: superset
          ? recuperoNascosto(es.recuperoSecondi)
          : intero(es.recuperoSecondi, es.nome || tr(`Esercizio ${indice + 1}`, `Exercise ${indice + 1}`), tr('recupero', 'rest'), 0),
        serieExtra: es.serieExtra.map((x, j) => ({
          ...reps(x.reps, `${es.nome || tr('Esercizio', 'Exercise')}, ${tr('serie', 'set')} ${Number(es.serieTarget) + j + 1}`),
          recuperoSecondi: superset
            ? recuperoNascosto(x.recuperoSecondi)
            : intero(
                x.recuperoSecondi,
                `${es.nome || tr(`Esercizio ${indice + 1}`, `Exercise ${indice + 1}`)}, ${tr('serie', 'set')} ${Number(es.serieTarget) + j + 1}`,
                tr('recupero', 'rest'),
                0
              ),
          nota: x.nota || undefined,
        })),
        // L'ultimo esercizio non ha un "successivo" a cui collegarsi.
        collegamento: indice < esercizi.length - 1 && es.collegamento ? es.collegamento : null,
        };
      });

      const eraNuova = schedaInModifica === null;
      if (!eraNuova) {
        // Rimettiamo gli id sugli esercizi già esistenti, così il backend li aggiorna.
        const conId = eserciziValidati.map((dati, i) => ({ ...dati, id: esercizi[i].id }));
        await aggiornaScheda(schedaInModifica, nomeScheda, Number(clienteId), conId);
      } else {
        await creaScheda(nomeScheda, Number(clienteId), eserciziValidati);
      }

      // Dopo il salvataggio apriamo l'elenco di quel cliente: la scheda si vede subito.
      if (clienteVisto !== Number(clienteId) || paginaCliente !== 'schede') apriCliente(Number(clienteId));
      if (eraNuova) {
        // Scheda nuova: l'editor resta aperto con lo STESSO cliente già scelto, pronto per il
        // giorno successivo (Giorno A, poi B, poi C…). Si svuotano solo nome ed esercizi.
        setGiornoSalvato(nomeScheda.trim());
        setNomeScheda('');
        setEsercizi([esercizioVuoto()]);
        setNoteAperte(null);
        setConfermaRimuovi(null);
        setGruppoPer(null);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Modifica di una scheda esistente: finita la modifica, l'editor si chiude.
        resetForm();
      }
      await caricaSchede();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio della scheda', 'Error saving the programme'));
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
      setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento dell’archivio', 'Error loading the archive'));
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
      setErrore(err instanceof Error ? err.message : tr('Errore nell’archiviazione', 'Error archiving'));
    }
  }

  async function handleRipristina(id: number) {
    try {
      setErrore('');
      await ripristinaScheda(id);
      setArchiviate(archiviate.filter((s) => s.id !== id));
      await caricaSchede();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel ripristino', 'Error restoring'));
    }
  }

  async function handleEliminaDefinitivo(id: number) {
    try {
      setErrore('');
      await eliminaSchedaDefinitivamente(id);
      setArchiviate(archiviate.filter((s) => s.id !== id));
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nell’eliminazione', 'Error deleting'));
    } finally {
      setConfermaElimina(null);
    }
  }

  // Clienti che hanno almeno un allenamento concluso, in ordine alfabetico, con quanti ne hanno fatti.
  const clientiConSessioni = [...sessioni.reduce((m, s) => {
    const c = m.get(s.clienteId);
    m.set(s.clienteId, { id: s.clienteId, nome: s.cliente.nome, quanti: (c?.quanti ?? 0) + 1 });
    return m;
  }, new Map<number, { id: number; nome: string; quanti: number }>()).values()].sort((a, b) => a.nome.localeCompare(b.nome, locale));
  // Le sessioni arrivano dalla più recente: di base si apre il cliente che si è allenato per ultimo.
  const clienteScelto = clientiConSessioni.some((c) => c.id === clienteSessioni) ? clienteSessioni : (sessioni[0]?.clienteId ?? null);
  const sessioniCliente = sessioni.filter((s) => s.clienteId === clienteScelto);
  const sessioniVisibili = mostraTutte ? sessioniCliente : sessioniCliente.slice(0, 5);
  const gruppiBozza = gruppiCollegati(esercizi);

  // L'editor si vede nell'elenco clienti e nella pagina "Schede" di un cliente.
  const mostraEditor = editorAperto && (clienteVisto === null || paginaCliente === 'schede');
  const clienteAperto = clienteVisto !== null ? clienti.find((c) => c.id === clienteVisto) : undefined;
  // Cliente non (più) esistente nell'indirizzo: si torna all'elenco.
  useEffect(() => {
    if (clienteVisto !== null && clientiCaricati && !clienteAperto) apriCliente(null, 'schede', true);
  });
  const nomiPagine: Record<PaginaCliente, string> = {
    schede: tr('Schede', 'Programmes'),
    cardio: 'Cardio',
    diario: tr('Diario', 'Diary'),
    corpo: tr('Misure', 'Measurements'),
    accesso: tr('Accesso', 'Sign-in'),
  };
  const bottoneNuovaScheda = (
    <button type="button" className="btn-primary shrink-0" aria-expanded={editorAperto} aria-controls="scheda-editor" onClick={() => {
      // Nella pagina di un cliente, la nuova scheda parte già con lui scelto.
      if (!editorAperto && schedaInModifica === null && !clienteId && clienteVisto !== null) setClienteId(String(clienteVisto));
      if (clienteVisto !== null && paginaCliente !== 'schede') apriCliente(clienteVisto, 'schede', true);
      setEditorAperto(true);
      if (editorAperto) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    }}>
      <span aria-hidden="true" className="text-xl leading-none">+</span>
      {editorAperto ? tr('Continua la scheda', 'Continue programme') : tr('Nuova scheda', 'New programme')}
    </button>
  );

  return (
    <div className="space-y-8 pb-24 sm:pb-0">
      <BarraSezioni<SezioneTrainer>
        etichetta={tr('Sezioni trainer', 'Trainer sections')}
        attiva={sezione}
        onCambia={(id) => vai(id)}
        voci={[
          { id: 'attivita', nome: tr('Attività', 'Activity'), icona: ICONE.attivita },
          { id: 'clienti', nome: tr('Clienti', 'Clients'), icona: ICONE.clienti },
          { id: 'inviti', nome: tr('Inviti', 'Invites'), icona: ICONE.inviti },
          ...(admin ? [{ id: 'trainer' as const, nome: tr('Trainer', 'Trainers'), icona: ICONE.trainer, pallino: trainerInAttesa > 0 || nuoviAvvisiProgrammi }] : []),
        ]}
      />

      {errore && <p className="alert-error" role="alert">{errore}</p>}

      {sezione === 'attivita' && (
        <>
          {admin && trainerInAttesa > 0 && (
            <button
              type="button"
              onClick={() => vai('trainer')}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-accent-strong/40 bg-accent-soft px-5 py-4 text-left text-sm font-semibold text-ink transition-colors hover:border-accent-strong"
            >
              <span>
                {trainerInAttesa === 1
                  ? tr('1 trainer aspetta la tua approvazione', '1 trainer is waiting for your approval')
                  : tr(`${trainerInAttesa} trainer aspettano la tua approvazione`, `${trainerInAttesa} trainers are waiting for your approval`)}
              </span>
              <span className="shrink-0 text-accent-strong">{tr('Vedi →', 'See →')}</span>
            </button>
          )}
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4" aria-label={tr('Riepilogo attività', 'Activity summary')}>
            <div className="metric-card">
              <span className="metric-icon bg-surface-2 text-accent-strong" aria-hidden="true">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/></svg>
              </span>
              <div><p className="text-3xl font-bold tabular-nums tracking-tight">{clienti.length}</p><p className="text-sm text-muted">{tr('Clienti registrati', 'Registered clients')}</p></div>
            </div>
            <div className="metric-card">
              <span className="metric-icon bg-surface-2 text-accent-strong" aria-hidden="true">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="5" y="4" width="14" height="17" rx="3"/><rect x="9" y="2" width="6" height="4" rx="1.5" fill="currentColor" stroke="none"/><path d="M9 11h6m-6 5h6"/></svg>
              </span>
              <div><p className="text-3xl font-bold tabular-nums tracking-tight">{schede.length}</p><p className="text-sm text-muted">{tr('Schede attive', 'Active programmes')}</p></div>
            </div>
            <div className="metric-card">
              <span className="metric-icon bg-surface-2 text-accent-strong" aria-hidden="true">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m4 14 5-5 4 4 7-9m-5 0h5v5M4 4v16h16"/></svg>
              </span>
              <div><p className="text-3xl font-bold tabular-nums tracking-tight">{sessioni.length}</p><p className="text-sm text-muted">{tr('Allenamenti conclusi', 'Workouts completed')}</p></div>
            </div>
          </div>

          {/* Prima cosa che vede il trainer: chi si è allenato e come è andata */}
          <section id="attivita" className="card scroll-mt-24">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-1">{tr('Attività recente', 'Recent activity')}</p>
                <h2 className="section-title">{tr('Allenamenti completati', 'Completed workouts')}</h2>
                <p className="mt-1 text-sm text-muted">{tr('Scegli un cliente e guarda come sono andati i suoi allenamenti.', 'Choose a client and see how their workouts went.')}</p>
              </div>
              <button
                aria-label={tr('Aggiorna allenamenti completati', 'Refresh completed workouts')}
                className="btn-secondary h-11 w-11 shrink-0 px-0"
                onClick={caricaSessioni}
              >
                <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5M4 17v-5h5M6.1 6a8 8 0 0 1 13 3M4.9 15a8 8 0 0 0 13 3"/></svg>
              </button>
            </div>
            {sessioni.length === 0 ? (
              <p className="empty-state">
                {tr('Nessun cliente ha ancora concluso un allenamento.', 'No client has finished a workout yet.')}
              </p>
            ) : (
              <>
              <div className="mb-2">
                <label className="label" htmlFor="cliente-sessioni">{tr('Cliente', 'Client')}</label>
                <select
                  id="cliente-sessioni"
                  className="input"
                  value={clienteScelto ?? ''}
                  onChange={(e) => { setClienteSessioni(Number(e.target.value)); setMostraTutte(false); }}
                >
                  {clientiConSessioni.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} · {c.quanti === 1 ? tr('1 allenamento', '1 workout') : tr(`${c.quanti} allenamenti`, `${c.quanti} workouts`)}
                    </option>
                  ))}
                </select>
              </div>
              <ul className="divide-y divide-line overflow-hidden">
                {sessioniVisibili.map((s) => {
                  const completa = s.serieFatte >= s.serieTotali;
                  return (
                    <li key={s.id}>
                      {/* Tocca un allenamento per vedere cosa ha fatto il cliente quel giorno, serie per serie */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-surface-2/50 sm:gap-4"
                        onClick={() => setProgressiScheda({ schedaId: s.schedaId, giorno: s.completataIl })}
                        aria-label={tr(`Dettaglio allenamento di ${s.cliente.nome}, ${s.scheda.nome}`, `Workout details for ${s.cliente.nome}, ${s.scheda.nome}`)}
                      >
                      {/* Il cliente è già scelto sopra: nel quadratino c'è il giorno dell'allenamento */}
                      <span
                        className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${
                          completa ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                        }`}
                        aria-hidden
                      >
                        <span className="text-base font-bold tabular-nums">{new Date(s.completataIl).getDate()}</span>
                        <span className="mt-0.5 text-[10px] font-semibold uppercase">
                          {new Date(s.completataIl).toLocaleDateString(locale, { month: 'short' }).replace('.', '')}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug break-words">{s.scheda.nome}</p>
                        <p className="mt-0.5 text-xs text-muted">{quando(s.completataIl)}</p>
                        {/* Feedback del cliente a fine allenamento */}
                        {(s.fatica != null || s.nota) && (
                          <div className="mt-2 flex flex-wrap items-start gap-2">
                            {s.fatica != null && <ChipFatica fatica={s.fatica} />}
                            {s.nota && <p className="min-w-0 flex-1 text-sm italic leading-snug text-soft break-words">“{s.nota}”</p>}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`rounded-md px-2 py-1 text-xs font-semibold tabular-nums sm:text-sm ${completa ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
                          {s.serieFatte}/{s.serieTotali} {tr('serie', 'sets')}
                        </p>
                        <p className="mt-1 text-xs text-muted tabular-nums">
                          {Math.round(s.volume).toLocaleString(locale)} kg
                        </p>
                      </div>
                      <span aria-hidden className="shrink-0 text-lg text-muted">›</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              </>
            )}
            {sessioniCliente.length > 5 && (
              <button className="btn-link mt-3 text-sm" onClick={() => setMostraTutte(!mostraTutte)}>
                {mostraTutte ? tr('Mostra meno', 'Show less') : tr(`Mostra tutti (${sessioniCliente.length})`, `Show all (${sessioniCliente.length})`)}
              </button>
            )}
          </section>
        </>
      )}

      {sezione === 'clienti' && (
        <>
          {/* Intestazione: elenco clienti, oppure nome del cliente con le sue pagine */}
          {clienteVisto === null ? (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow mb-1">{tr('Clienti', 'Clients')}</p>
                <h2 className="section-title">{tr('I tuoi clienti', 'Your clients')}</h2>
                <p className="mt-1 text-sm text-muted">{tr('Tocca un cliente per aprire la sua pagina: schede, cardio, diario, misure e accesso.', 'Tap a client to open their page: programmes, cardio, diary, measurements and sign-in.')}</p>
              </div>
              {bottoneNuovaScheda}
            </div>
          ) : (
            <div>
              <button type="button" className="btn-link mb-3 text-sm" onClick={() => apriCliente(null)}>
                ← {tr('Tutti i clienti', 'All clients')}
              </button>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow mb-1">{tr('Cliente', 'Client')}</p>
                  <h2 className="section-title flex flex-wrap items-center gap-2 break-words">
                    {nomeCliente(clienteVisto)}
                    {clienteAperto?.sospeso && <span className="rounded-md bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning">{tr('Sospeso', 'Suspended')}</span>}
                  </h2>
                  {clienteAperto && <p className="mt-1 truncate text-sm text-muted">{clienteAperto.email}</p>}
                </div>
                {bottoneNuovaScheda}
              </div>
              <nav className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1" aria-label={tr('Pagine del cliente', 'Client pages')}>
                {PAGINE_CLIENTE.map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    aria-current={pg === paginaCliente ? 'page' : undefined}
                    onClick={() => apriCliente(clienteVisto, pg, true)}
                    className={`inline-flex min-h-11 shrink-0 items-center rounded-xl border px-4 text-sm font-semibold transition-colors ${
                      pg === paginaCliente ? 'border-accent-strong bg-accent text-accent-ink' : 'border-line bg-surface text-ink hover:border-accent-strong'
                    }`}
                  >
                    {nomiPagine[pg]}
                  </button>
                ))}
              </nav>
            </div>
          )}

          <section
            id="scheda-editor"
            hidden={!mostraEditor}
            ref={formRef}
            className={`card scroll-mt-24 sm:p-7 ${schedaInModifica !== null ? 'ring-2 ring-accent-strong/30' : ''}`}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow mb-1">{tr('Programmazione', 'Planning')}</p>
                <h2 className="section-title">{schedaInModifica !== null ? tr('Modifica scheda', 'Edit programme') : tr('Nuova scheda', 'New programme')}</h2>
                <p className="mt-1 text-sm text-muted">{tr('Scegli il cliente e costruisci il suo prossimo allenamento.', 'Choose the client and build their next workout.')}</p>
              </div>
              <button type="button" className="btn-secondary shrink-0" onClick={() => setEditorAperto(false)}>{tr('Riduci', 'Collapse')}</button>
            </div>
            {schedaInModifica !== null && (
              <p className="mb-5 rounded-lg bg-accent-soft px-3 py-2 text-sm text-soft">
                {tr(
                  'Stai modificando una scheda esistente. Se rimuovi un esercizio esce dalla scheda, ma tutte le serie che il cliente ha già registrato restano salvate e puoi rimetterlo quando vuoi dall’elenco in fondo agli esercizi.',
                  'You’re editing an existing programme. If you remove an exercise it leaves the programme, but every set the client already logged stays saved and you can put it back any time from the list below the exercises.',
                )}
              </p>
            )}
            {giornoSalvato !== null && schedaInModifica === null && (
              <div role="status" className="mb-5 flex flex-col gap-3 rounded-xl border border-success/40 bg-success-soft px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-soft">
                  <strong className="text-success">
                    {tr(`“${giornoSalvato}” salvata`, `“${giornoSalvato}” saved`)}
                    {clienteId ? ` · ${nomeCliente(Number(clienteId))}` : ''}.
                  </strong>{' '}
                  {tr('Il cliente resta scelto: crea subito il prossimo giorno.', 'The client stays selected: create the next day straight away.')}
                </p>
                <button type="button" className="btn-secondary shrink-0" onClick={resetForm}>
                  {tr('Ho finito', 'I’m done')}
                </button>
              </div>
            )}
            <form
              onSubmit={handleSalvaScheda}
              className="space-y-6"
              // Mentre scrivi, il bottone "+ Libreria" si nasconde: non copre i suggerimenti né la tastiera.
              onFocus={(e) => setScrivendo(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)}
              onBlur={() => setScrivendo(false)}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="nome-scheda">{tr('Nome scheda', 'Programme name')}</label>
                  <input
                    id="nome-scheda"
                    className="input"
                    placeholder={tr('Nome scheda (es. Full Body A)', 'Programme name (e.g. Full Body A)')}
                    value={nomeScheda}
                    onChange={(e) => setNomeScheda(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">{tr('Cliente', 'Client')}</label>
                  {/* Si scrivono le prime lettere e si tocca il nome: niente ID da ricordare, niente schede
                      assegnate alla persona sbagliata. La key riparte da zero quando il form si svuota. */}
                  <SceltaCliente key={versioneForm} clienti={clienti} valore={clienteId} onChange={setClienteId} />
                </div>
              </div>

              {/* Su PC: esercizi a sinistra e libreria fissa a destra (resta visibile mentre scorri).
                  Su telefono: la libreria si apre dal bottone "Libreria" in basso. */}
              <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-6">
              <div className="min-w-0">
                <h3 className="mb-3 text-lg font-bold text-ink">{tr('Esercizi della scheda', 'Programme exercises')}</h3>

                <div>
                  {esercizi.map((es, i) => {
                    const g = gruppiBozza[i];
                    const ultimo = i === esercizi.length - 1;
                    const superset = es.collegamento === 'SUPERSET' && !ultimo;
                    return (
                    <Fragment key={es.chiave}>
                    <div
                      id={`riga-${es.chiave}`}
                      className={`rounded-2xl border bg-field p-4 transition-colors focus-within:border-accent-strong/50 sm:p-5 ${
                        g ? 'border-accent-strong/60' : 'border-line'
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-ink">
                            {g ? sigla(g) : i + 1}
                          </span>
                          {/* Su schermi stretti il nome del gruppo sta sotto (vedi sotto), qui solo da tablet in su */}
                          {g && <span className="hidden sm:inline-flex"><ChipGruppo g={g} /></span>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-secondary px-3 py-1 text-xs"
                            aria-expanded={gruppoPer === es.chiave}
                            onClick={() => (gruppoPer === es.chiave ? setGruppoPer(null) : chiediGruppo(i))}
                          >
                            {tr('☆ Salva esercizio', '☆ Save exercise')}
                          </button>
                          {esercizi.length > 1 && (
                            <button
                              type="button"
                              className="btn-danger px-3 py-1 text-xs"
                              onClick={() => rimuoviRigaEsercizio(i)}
                            >
                              {confermaRimuovi === es.chiave ? tr('Sicuro? Tocca ancora', 'Sure? Tap again') : tr('Rimuovi', 'Remove')}
                            </button>
                          )}
                        </div>
                      </div>
                      {g && (
                        <p className="-mt-1 mb-3 text-xs font-bold tracking-wide text-accent-strong uppercase sm:hidden">
                          {g.nome} {g.lettera}
                        </p>
                      )}
                      {gruppoPer === es.chiave && (
                        <SceltaGruppo onScegli={(gruppo) => salvaComePreset(i, gruppo)} onAnnulla={() => setGruppoPer(null)} />
                      )}
                      <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_minmax(0,1fr)] gap-3 sm:grid-cols-6">
                        <div className="col-span-3 sm:col-span-3">
                          <label className="label">{tr('Esercizio', 'Exercise')}</label>
                          <CampoNomeEsercizio
                            valore={es.nome}
                            preset={preset}
                            onChange={(v) => aggiornaEsercizio(i, 'nome', v)}
                            onScegli={(p) => scegliSuggerimento(i, p)}
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-3">
                          <label className="label">Video</label>
                          <input
                            className="input"
                            placeholder={tr('Link video (opzionale)', 'Video link (optional)')}
                            maxLength={500}
                            value={es.videoUrl}
                            onChange={(e) => aggiornaEsercizio(i, 'videoUrl', e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">{tr('Serie', 'Sets')}</label>
                          <input
                            className="input"
                            type="number"
                            placeholder={tr('Serie', 'Sets')}
                            value={es.serieTarget}
                            onChange={(e) => aggiornaEsercizio(i, 'serieTarget', e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">Reps</label>
                          <CampoReps valore={es.repsTarget} onChange={(v) => aggiornaEsercizio(i, 'repsTarget', v)} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">{tr('Rec. (sec)', 'Rest (sec)')}</label>
                          {superset ? (
                            <RecuperoAssente />
                          ) : (
                            <input
                              className="input"
                              type="number"
                              placeholder={tr('Recupero (sec)', 'Rest (sec)')}
                              value={es.recuperoSecondi}
                              onChange={(e) => aggiornaEsercizio(i, 'recuperoSecondi', e.target.value)}
                            />
                          )}
                        </div>
                      </div>
                      {g && <p className="mt-2 text-xs leading-relaxed text-accent-strong">{spiegaRecupero(es.collegamento, g)}</p>}
                      {/* Serie aggiunte dopo quelle normali, con valori propri: es. 2 × 10 + una da 15 in drop set */}
                      {es.serieExtra.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {es.serieExtra.map((x, j) => (
                            <div key={j} className="rounded-xl border border-accent-strong/40 bg-accent-soft p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-semibold tracking-wide text-accent-strong uppercase">
                                  {tr('Serie', 'Set')} {Number(es.serieTarget || 0) + j + 1}
                                </span>
                                <button
                                  type="button"
                                  aria-label={tr(`Rimuovi serie ${Number(es.serieTarget || 0) + j + 1}`, `Remove set ${Number(es.serieTarget || 0) + j + 1}`)}
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
                                  <label className="label">{tr('Rec. (sec)', 'Rest (sec)')}</label>
                                  {superset ? (
                                    <RecuperoAssente />
                                  ) : (
                                    <input
                                      className="input"
                                      type="number"
                                      inputMode="numeric"
                                      value={x.recuperoSecondi}
                                      onChange={(e) => aggiornaSerieExtra(i, j, 'recuperoSecondi', e.target.value)}
                                    />
                                  )}
                                </div>
                              </div>
                              <input
                                className="input mt-2"
                                placeholder={tr('Nota, es. "drop set" o "a cedimento"', 'Note, e.g. "drop set" or "to failure"')}
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
                          className="btn-ghost mt-3 w-full border border-dashed border-accent-strong/50 text-accent-strong"
                          onClick={() => aggiungiSerieExtra(i)}
                        >
                          {tr('+ Aggiungi serie', '+ Add set')}
                        </button>
                      )}

                      <div className="mt-3">
                        <label className="label">{tr('Note per il cliente (opzionale)', 'Notes for the client (optional)')}</label>
                        <textarea
                          className="input min-h-[60px] resize-y"
                          placeholder={tr('Es. "3x10 ma con 3 secondi di isometria in basso"', 'E.g. "3x10 with a 3-second pause at the bottom"')}
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
                            {tr('☆ Salva nota', '☆ Save note')}
                          </button>
                          <button
                            type="button"
                            className={`btn-secondary min-h-9 px-3 text-xs ${noteAperte === es.chiave ? 'border-accent-strong' : ''}`}
                            onClick={() => setNoteAperte(noteAperte === es.chiave ? null : es.chiave)}
                          >
                            {tr('Note salvate', 'Saved notes')} ({notePreset.length}) {noteAperte === es.chiave ? '▴' : '▾'}
                          </button>
                        </div>
                        {noteAperte === es.chiave && (
                          <div className="mt-2 rounded-xl border border-line bg-surface p-2">
                            {notePreset.length === 0 ? (
                              <p className="px-1 py-1 text-xs text-muted">
                                {tr('Nessuna nota salvata. Scrivine una qui sopra e premi “Salva nota”.', 'No saved notes. Write one above and press “Save note”.')}
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
                                      aria-label={tr(`Elimina la nota salvata: ${n.testo}`, `Delete the saved note: ${n.testo}`)}
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
                    {!ultimo && (
                      <Collegamento
                        tipo={es.collegamento}
                        onCambia={(tipo) => cambiaCollegamento(i, tipo)}
                        numeroSuccessivo={i + 2}
                      />
                    )}
                    </Fragment>
                    );
                  })}
                </div>
                <button type="button" className="btn-secondary mt-3 w-full border-dashed sm:w-auto" onClick={aggiungiRigaEsercizio}>
                  {tr('+ Aggiungi esercizio', '+ Add exercise')}
                </button>

                {/* Solo in modifica: esercizi tolti in passato da questa scheda, con le serie del cliente
                    ancora salvate. "Rimetti" li riporta nella scheda con tutto il loro storico. */}
                {schedaInModifica !== null && eserciziRimossi.length > 0 && (
                  <div className="mt-5 rounded-xl border border-line bg-surface p-3">
                    <p className="mb-2 text-xs font-semibold text-muted">{tr('Esercizi tolti da questa scheda (dati conservati)', 'Exercises removed from this programme (data kept)')}</p>
                    <ul className="divide-y divide-line">
                      {eserciziRimossi.map((es) => (
                        <li key={es.id} className="flex items-center gap-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{es.nome}</p>
                            <p className="text-xs text-muted">
                              {es._count.registri > 0
                                ? tr(`${es._count.registri} serie registrate`, `${es._count.registri} sets logged`)
                                : tr('nessuna serie registrata', 'no sets logged')}
                              {tr(' · tolto il ', ' · removed on ')}
                              {new Date(es.archiviatoIl).toLocaleDateString(locale)}
                            </p>
                          </div>
                          <button type="button" className="btn-secondary shrink-0 px-3 py-1 text-xs" onClick={() => handleRipristinaEsercizio(es)}>
                            {tr('↺ Rimetti', '↺ Put back')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
                <aside
                  aria-label={tr('Libreria esercizi', 'Exercise library')}
                  className="hidden rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-8rem)]"
                >
                  <PannelloLibreria
                    preset={preset}
                    onAggiungi={aggiungiDaPreset}
                    onCambiaGruppo={handleCambiaGruppo}
                    onElimina={(p) => handleCancellaPreset(p.id)}
                  />
                </aside>
              </div>

              {/* Telefono: libreria in un pannello dal basso */}
              {libreriaAperta && (
                <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={tr('Libreria esercizi', 'Exercise library')}>
                  <button type="button" aria-label={tr('Chiudi la libreria', 'Close the library')} className="absolute inset-0 bg-black/50" onClick={() => setLibreriaAperta(false)} />
                  <div className="absolute inset-x-0 bottom-0 flex h-[75vh] flex-col rounded-t-3xl border-t border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
                    <div className="mb-2 flex justify-end">
                      <button type="button" className="btn-ghost min-h-9 px-3 text-sm" onClick={() => setLibreriaAperta(false)}>
                        {tr('Chiudi', 'Close')}
                      </button>
                    </div>
                    <div className="min-h-0 flex-1">
                      <PannelloLibreria
                        preset={preset}
                        onAggiungi={aggiungiDaPreset}
                        onCambiaGruppo={handleCambiaGruppo}
                        onElimina={(p) => handleCancellaPreset(p.id)}
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* Bottone "Libreria" sempre a portata mentre scorri l'editor (solo telefono) */}
              {mostraEditor && !libreriaAperta && !scrivendo && (
                <button
                  type="button"
                  className="btn-primary fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-4 z-30 min-h-12 px-4 shadow-lg lg:hidden"
                  onClick={() => setLibreriaAperta(true)}
                >
                  {tr('+ Libreria', '+ Library')}
                </button>
              )}

              {errore && <p className="alert-error">{errore}</p>}
              <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
                {schedaInModifica !== null && (
                  <button type="button" className="btn-secondary w-full px-6 py-2.5 sm:w-auto" onClick={resetForm}>
                    {tr('Annulla modifica', 'Cancel editing')}
                  </button>
                )}
                <button type="submit" className="btn-primary w-full px-6 py-2.5 sm:w-auto" disabled={salvando}>
                  {salvando ? tr('Salvo…', 'Saving…') : schedaInModifica !== null ? tr('Salva modifiche', 'Save changes') : tr('Crea scheda', 'Create programme')}
                </button>
              </div>
            </form>
          </section>

          {clienteVisto === null ? (
            <div className="space-y-8">
              {clientiCaricati && clienti.length === 0 ? (
                <div className="empty-state">
                  <p>{tr('Nessun cliente ancora. Crea un codice invito e mandalo al tuo cliente.', 'No clients yet. Create an invite code and send it to your client.')}</p>
                  <button type="button" className="btn-secondary mt-4" onClick={() => vai('inviti')}>{tr('Vai agli inviti', 'Go to invites')}</button>
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {clienti.map((c) => {
                    const numero = schede.filter((sc) => sc.clienteId === c.id).length;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => apriCliente(c.id)}
                          className="card flex w-full items-center gap-3 py-4 text-left transition hover:border-accent-strong hover:shadow-md"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-base font-bold text-accent-strong" aria-hidden="true">
                            {c.nome.trim().charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 font-semibold">
                              <span className="truncate">{c.nome}</span>
                              {c.sospeso && <span className="shrink-0 rounded-md bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning">{tr('Sospeso', 'Suspended')}</span>}
                            </span>
                            <span className="block text-xs text-muted">
                              {numero === 1 ? tr('1 scheda', '1 programme') : tr(`${numero} schede`, `${numero} programmes`)}
                            </span>
                          </span>
                          <span aria-hidden="true" className="shrink-0 text-lg text-muted">›</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

            {/* Archivio: schede tolte dalla vista. Nessun dato perso: si ripristinano con un tocco. */}
            <section className="card">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-semibold"
                aria-expanded={archivioAperto}
                onClick={() => {
                  if (!archivioAperto) caricaArchiviate();
                  setArchivioAperto(!archivioAperto);
                }}
              >
                <span>{tr('Schede archiviate', 'Archived programmes')}{archivioAperto ? ` (${archiviate.length})` : ''}</span>
                <span aria-hidden>{archivioAperto ? '▴' : '▾'}</span>
              </button>

              {archivioAperto && (
                <div className="mt-3 space-y-3">
                  {archiviate.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                      {tr('Nessuna scheda archiviata.', 'No archived programmes.')}
                    </p>
                  ) : (
                    archiviate.map((scheda) => (
                      <div key={scheda.id} className="card space-y-3">
                        <div>
                          <strong className="block leading-tight font-bold break-words">{scheda.nome}</strong>
                          <p className="mt-1 text-xs text-muted">
                            {nomeCliente(scheda.clienteId)} · {tr('creata il', 'created on')} {dataBreve(scheda.creataIl)}
                            {scheda.archiviataIl &&
                              ` · ${tr('archiviata il', 'archived on')} ${new Date(scheda.archiviataIl).toLocaleDateString(locale)}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className="btn-secondary flex-1 text-xs" onClick={() => setProgressiScheda({ schedaId: scheda.id })}>
                            {tr('Progressi', 'Progress')}
                          </button>
                          <button className="btn-secondary flex-1 text-xs" onClick={() => handleRipristina(scheda.id)}>
                            {tr('↺ Ripristina', '↺ Restore')}
                          </button>
                          {/* Eliminazione definitiva solo se non c'è storico (es. scheda creata per sbaglio) */}
                          {scheda.haStorico ? (
                            <p className="w-full text-xs text-muted">
                              {tr('Ha allenamenti registrati: resta in archivio per proteggere i dati del cliente.', 'It has logged workouts: it stays in the archive to protect the client’s data.')}
                            </p>
                          ) : confermaElimina === scheda.id ? (
                            <button
                              className="btn-danger flex-1 text-xs"
                              onClick={() => handleEliminaDefinitivo(scheda.id)}
                            >
                              {tr('Sicuro? Elimina per sempre', 'Sure? Delete forever')}
                            </button>
                          ) : (
                            <button
                              className="btn-ghost flex-1 text-xs text-muted hover:text-danger"
                              onClick={() => setConfermaElimina(scheda.id)}
                            >
                              {tr('Elimina definitivamente', 'Delete permanently')}
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
          ) : (
            <div key={clienteVisto}>
              {paginaCliente === 'schede' && (
                <div className="space-y-6">
                  <FeedbackCliente clienteId={clienteVisto} nomeCliente={nomeCliente(clienteVisto)} />
                  {!schede.some((sc) => sc.clienteId === clienteVisto) && (
                    <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
                      {tr(`${nomeCliente(clienteVisto)} non ha ancora schede.`, `${nomeCliente(clienteVisto)} has no programmes yet.`)}
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    {schede.filter((sc) => sc.clienteId === clienteVisto).map((scheda) => (
                      <div key={scheda.id} className="card flex flex-col transition hover:shadow-md">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <strong className="block text-lg leading-tight font-bold break-words">{scheda.nome}</strong>
                            <span className="mt-1 inline-block rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                              {nomeCliente(scheda.clienteId)}
                            </span>
                            {/* Data di creazione + quanto tempo fa: le schede sono già in ordine dalla più recente */}
                            <p className={`mt-1.5 text-xs ${eVecchia(scheda.creataIl) ? 'font-semibold text-accent-strong' : 'text-muted'}`}>
                              {tr('Creata il', 'Created on')} {dataBreve(scheda.creataIl)} · {etaScheda(scheda.creataIl)}
                              {eVecchia(scheda.creataIl) && tr(' · da aggiornare?', ' · time to update?')}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setProgressiScheda({ schedaId: scheda.id })}>
                              {tr('Progressi', 'Progress')}
                            </button>
                            <button
                              className="btn-secondary px-3 py-1.5 text-xs"
                              onClick={() => avviaModifica(scheda)}
                              disabled={schedaInModifica === scheda.id}
                            >
                              {schedaInModifica === scheda.id ? tr('In modifica…', 'Editing…') : tr('Modifica', 'Edit')}
                            </button>
                            {/* Archivia: nessuna conferma serve, perché non si perde niente e si ripristina con un tocco */}
                            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => handleArchivia(scheda.id)}>
                              {tr('Archivia', 'Archive')}
                            </button>
                          </div>
                        </div>
                        <ul className="divide-y divide-line border-t border-line">
                          {scheda.esercizi.map((es, i, tutti) => {
                            const g = gruppiCollegati(tutti)[i];
                            const superset = es.collegamento === 'SUPERSET' && g !== null && g.posizione < g.dimensione;
                            return (
                            <li key={es.id} className={`py-3 text-sm ${g ? 'border-l-2 border-l-accent-strong pl-3' : ''}`}>
                              {g && g.posizione === 1 && (
                                <p className="mb-1 text-xs font-semibold tracking-wide text-accent-strong uppercase">{g.nome} {g.lettera}</p>
                              )}
                              {/* flex-wrap: se nome e serie non stanno sulla stessa riga, il testo va a capo invece di uscire dallo schermo */}
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                <span className="min-w-0 font-medium break-words">
                                  {g && <span className="mr-1.5 font-bold text-accent-strong">{sigla(g)}</span>}
                                  {es.nome}
                                </span>
                                <span className="min-w-0 text-muted">
                                  <span className="font-semibold text-ink">{riassuntoSerie(es)}</span> · {superset ? tr('subito il successivo', 'straight to the next') : testoRecupero(es.recuperoSecondi)}
                                </span>
                              </div>
                              {(es.serieExtra || []).map((x, j) => (
                                <p key={j} className="mt-1 text-xs text-accent-strong">
                                  + {tr('Serie', 'Set')} {es.serieTarget + j + 1}: {testoReps(x.reps, x.repsMax, x.piuMax, x.rpSecondi)} reps{superset ? '' : ` · ${testoRecupero(x.recuperoSecondi)}`}
                                  {x.nota ? ` · ${x.nota}` : ''}
                                </p>
                              ))}
                              {es.descrizione && <p className="mt-1 text-xs text-muted">{es.descrizione}</p>}

                              <button
                                type="button"
                                className="btn-link mt-1 text-xs"
                                onClick={() => toggleStorico(es.id)}
                              >
                                {storicoAperto === es.id ? tr('Nascondi note cliente', 'Hide client notes') : tr('Vedi note cliente', 'See client notes')}
                              </button>

                              {storicoAperto === es.id && (
                                <div className="mt-2 rounded-lg border border-line bg-surface-2 p-2">
                                  {storico.length === 0 ? (
                                    <p className="px-2 py-1 text-xs text-muted">{tr('Nessun allenamento registrato ancora.', 'No workouts logged yet.')}</p>
                                  ) : (
                                    <ul className="divide-y divide-line">
                                      {storico.map((r) => (
                                        <li key={r.id} className="px-2 py-1.5 text-xs">
                                          <div className="flex items-center justify-between gap-2 text-muted">
                                            <span>{new Date(r.data).toLocaleDateString(locale)}</span>
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
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {paginaCliente === 'cardio' && <CardioPassi ruolo="TRAINER" clienteId={clienteVisto} nomeCliente={nomeCliente(clienteVisto)} />}
              {paginaCliente === 'diario' && <DiarioAlimentare ruolo="TRAINER" clienteId={clienteVisto} nomeCliente={nomeCliente(clienteVisto)} />}
              {paginaCliente === 'corpo' && <MisureCorporee ruolo="TRAINER" clienteId={clienteVisto} nomeCliente={nomeCliente(clienteVisto)} />}
              {paginaCliente === 'accesso' && clienteAperto && (
                <section className="card space-y-3">
                  <div>
                    <h3 className="text-lg font-bold">{tr('Accesso del cliente', 'Client sign-in')}</h3>
                    <p className="mt-1 text-sm text-muted">{tr('Correggi l’email, dai una password temporanea o sospendi l’account.', 'Fix the email, give a temporary password or suspend the account.')}</p>
                  </div>
                  <AccessoCliente
                    cliente={clienteAperto}
                    onEmailCambiata={(agg) => setClienti((prev) => prev.map((x) => (x.id === agg.id ? { ...x, ...agg } : x)))}
                  />
                </section>
              )}
            </div>
          )}
        </>
      )}

      {sezione === 'inviti' && <SezioneInviti />}

      {/* Solo l'amministratore: trainer in attesa, panoramica e inviti per nuovi trainer */}
      {sezione === 'trainer' && admin && (
        <>
          <TrainerInAttesa
            onCambio={(quanti, approvato) => {
              setTrainerInAttesa(quanti);
              if (approvato) setChiavePanoramica((k) => k + 1);
            }}
          />
          <PanoramicaTrainer key={chiavePanoramica} />
          <SezioneInviti tipo="TRAINER" />
        </>
      )}

      {progressiScheda && (
        <StoricoCliente
          key={`${progressiScheda.schedaId}-${progressiScheda.giorno ?? ''}`}
          schedaId={progressiScheda.schedaId}
          vistaIniziale={progressiScheda.giorno ? 'allenamenti' : 'esercizi'}
          giornoIniziale={progressiScheda.giorno}
          onChiudi={() => setProgressiScheda(null)}
        />
      )}
    </div>
  );
}
