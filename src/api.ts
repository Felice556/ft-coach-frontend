import { lingua, tr } from './lingua';

// Indirizzo del backend, dalla variabile VITE_API_URL (file .env o impostazioni di Cloudflare Pages).
function risolviApiUrl(): string {
  const daEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (!daEnv) {
    // Meglio un errore chiaro in console che un'app che non funziona senza motivo apparente.
    throw new Error('VITE_API_URL non impostata: aggiungila nel file .env (o su Cloudflare Pages) e riavvia');
  }
  // SOLO in sviluppo: se apri l'app dal telefono (es. http://192.168.1.20:5173),
  // "localhost" indicherebbe il telefono stesso, non il PC con il backend,
  // quindi usiamo l'indirizzo da cui è stata aperta la pagina.
  // In produzione (import.meta.env.DEV = false) l'indirizzo si usa così com'è.
  if (import.meta.env.DEV && daEnv.includes('localhost') && window.location.hostname !== 'localhost') {
    return daEnv.replace('localhost', window.location.hostname);
  }
  return daEnv;
}

const API_URL = risolviApiUrl();

export type Ruolo = 'TRAINER' | 'CLIENTE';

// Serie aggiunta dal trainer dopo le serie normali di un esercizio, con numeri propri.
// reps = null significa "Max" (a cedimento).
export interface SerieExtra {
  id?: number;
  reps: number | null;
  repsMax?: number | null; // per gli intervalli: "6-9" → reps 6, repsMax 9
  recuperoSecondi: number;
  nota?: string | null;
}

// Collegamento con l'esercizio SUCCESSIVO della scheda:
// SUPERSET = si passa subito al successivo; JUMPSET = si alterna con un recupero in mezzo.
export type TipoCollegamento = 'SUPERSET' | 'JUMPSET';

export interface Esercizio {
  id: number;
  nome: string;
  videoUrl?: string | null;
  descrizione?: string | null;
  serieTarget: number;
  repsTarget: number | null; // null = "Max"; negli intervalli è il minimo
  repsMax?: number | null; // per gli intervalli: "6-9" → repsTarget 6, repsMax 9
  recuperoSecondi: number;
  schedaId: number;
  serieExtra: SerieExtra[];
  collegamento?: TipoCollegamento | null; // null = esercizio singolo
}

export interface Scheda {
  id: number;
  nome: string;
  clienteId: number;
  archiviataIl?: string | null;
  creataIl: string; // data di creazione della scheda
  esercizi: Esercizio[];
  haStorico?: boolean; // solo nell'elenco archiviate: true = non eliminabile definitivamente
}

export interface RegistroAllenamento {
  id: number;
  pesoUsato: number;
  repsFatte: number;
  nota?: string | null;
  data: string;
  esercizioId: number;
  clienteId: number;
}

// Evento lanciato quando il server risponde 401 (sessione scaduta): lo ascolta App.
export const EVENTO_SESSIONE_SCADUTA = 'palestra:sessione-scaduta';
// Evento lanciato quando il server chiede di scegliere una nuova password (dopo un reset del trainer).
export const EVENTO_CAMBIO_PASSWORD = 'palestra:cambio-password';
// Evento lanciato quando il server dice che il trainer è ancora in attesa di approvazione.
export const EVENTO_IN_ATTESA = 'palestra:in-attesa';
// Evento lanciato quando l'account (o il suo trainer) è stato sospeso: App esce e mostra il motivo.
export const EVENTO_SOSPESO = 'palestra:sospeso';

// Nomi leggibili dei campi, per i messaggi di errore.
const NOMI_CAMPI: Record<string, string> = {
  nome: tr('nome', 'name'),
  clienteId: tr('cliente', 'client'),
  videoUrl: 'video',
  descrizione: tr('note', 'notes'),
  serieTarget: tr('serie', 'sets'),
  repsTarget: 'reps',
  repsMax: 'reps',
  reps: 'reps',
  recuperoSecondi: tr('recupero', 'rest'),
  nota: tr('nota', 'note'),
};

// Da { path: ['esercizi', 1, 'videoUrl'], message: '...' } a "Esercizio 2 → video: ..."
function descriviErrore(e: { path?: (string | number)[]; message?: string }): string {
  const path = e.path || [];
  const parti: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (p === 'esercizi' && typeof path[i + 1] === 'number') {
      parti.push(tr(`Esercizio ${(path[i + 1] as number) + 1}`, `Exercise ${(path[i + 1] as number) + 1}`));
      i++;
    } else if (p === 'serieExtra' && typeof path[i + 1] === 'number') {
      parti.push(tr(`serie aggiunta ${(path[i + 1] as number) + 1}`, `extra set ${(path[i + 1] as number) + 1}`));
      i++;
    } else if (typeof p === 'string') {
      parti.push(NOMI_CAMPI[p] || p);
    }
  }
  const dove = parti.length ? `${parti.join(' → ')}: ` : '';
  return `${dove}${e.message || tr('valore non valido', 'invalid value')}`;
}

// Wrapper unico per fetch: aggiunge automaticamente il token (se presente)
// e trasforma una risposta non-ok in un errore leggibile, invece di dover
// ripetere lo stesso if/else in ogni chiamata.
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const risposta = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Il server risponde con i messaggi (errori compresi) nella lingua dell'app.
      'Accept-Language': lingua,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Sessione che si rinnova da sola: ogni tanto il server manda un token nuovo (valido
  // altri 30 giorni). Lo salviamo solo se nel frattempo l'utente non è uscito o cambiato.
  const nuovoToken = risposta.headers.get('X-Nuovo-Token');
  if (nuovoToken && token && localStorage.getItem('token') === token) {
    localStorage.setItem('token', nuovoToken);
  }

  // Token scaduto o non più valido. NON ricarichiamo la pagina: si perderebbe quello che
  // l'utente sta scrivendo (kg/reps a metà serie, o un'intera scheda nel form del trainer).
  // Avvisiamo App, che mostra un piccolo login SOPRA la pagina: dopo l'accesso si riprova
  // la stessa azione e tutto quello che era scritto è ancora lì.
  // (/login escluso: lì un 401 vuol dire solo "email o password sbagliate".)
  if (risposta.status === 401 && token && path !== '/login') {
    window.dispatchEvent(new Event(EVENTO_SESSIONE_SCADUTA));
    throw new Error(tr('Sessione scaduta: accedi di nuovo qui sopra, poi riprova', 'Session expired: sign in again above, then try again'));
  }

  if (!risposta.ok) {
    const corpo = await risposta.json().catch(() => ({}));
    // Password temporanea impostata dal trainer: App mostra la schermata "Scegli una nuova password".
    if (risposta.status === 403 && corpo.codice === 'CAMBIO_PASSWORD') {
      window.dispatchEvent(new Event(EVENTO_CAMBIO_PASSWORD));
    }
    // Trainer non ancora approvato dall'amministratore: App mostra la schermata d'attesa.
    if (risposta.status === 403 && corpo.codice === 'IN_ATTESA') {
      window.dispatchEvent(new Event(EVENTO_IN_ATTESA));
    }
    // Account sospeso mentre era dentro: App esce e mostra il motivo nella schermata di accesso.
    // (Al login il motivo arriva già come messaggio d'errore normale.)
    if (risposta.status === 403 && corpo.codice === 'SOSPESO' && path !== '/login') {
      window.dispatchEvent(new CustomEvent(EVENTO_SOSPESO, { detail: corpo.errore }));
    }
    if (corpo.errore) throw new Error(corpo.errore);
    // Errori di validazione (zod): il backend manda un elenco "errori" con il percorso del campo.
    // Li traduciamo in qualcosa di leggibile, es. "Esercizio 2 → video: link non valido".
    if (Array.isArray(corpo.errori) && corpo.errori.length > 0) {
      throw new Error(corpo.errori.map(descriviErrore).join(' · '));
    }
    throw new Error(tr(`Errore ${risposta.status}`, `Error ${risposta.status}`));
  }

  if (risposta.status === 204) {
    return undefined as T;
  }
  return risposta.json();
}

export function login(email: string, password: string) {
  // passwordTemporanea = true: il trainer ha reimpostato la password, va scelta una nuova.
  // inAttesa = true: trainer registrato da solo, non ancora approvato dall'amministratore.
  return apiFetch<{ token: string; ruolo: Ruolo; nome: string; passwordTemporanea?: boolean; inAttesa?: boolean }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// codiceInvito: l'invito personale. Per un CLIENTE lo dà il suo trainer (obbligatorio se il server
// lo richiede); per un TRAINER è l'invito trainer creato dall'amministratore. Un TRAINER senza invito
// si presenta in due righe (presentazione) e resta in attesa finché l'amministratore non lo approva.
// Fasce di clienti seguiti: le chiediamo ai trainer che si registrano senza invito.
export const FASCE_CLIENTI = [
  { valore: '1-10', testo: tr('Da 1 a 10', '1 to 10') },
  { valore: '11-30', testo: tr('Da 11 a 30', '11 to 30') },
  { valore: '31-50', testo: tr('Da 31 a 50', '31 to 50') },
  { valore: '50+', testo: tr('Più di 50', 'More than 50') },
] as const;

export function register(
  nome: string,
  email: string,
  password: string,
  ruolo: Ruolo,
  codiceInvito?: string,
  presentazione?: string,
  fasciaClienti?: string,
) {
  return apiFetch<{ id: number; nome: string; ruolo: Ruolo; inAttesa?: boolean }>('/register', {
    method: 'POST',
    body: JSON.stringify({
      nome,
      email,
      password,
      ruolo,
      codiceInvito: codiceInvito?.trim() || undefined,
      presentazione: presentazione?.trim() || undefined,
      fasciaClienti: fasciaClienti || undefined,
    }),
  });
}

// Dice alla schermata di registrazione se il codice invito è obbligatorio.
export function getInfoRegistrazione() {
  return apiFetch<{ invitoObbligatorio: boolean }>('/registrazione/info');
}

// Chi sono: serve, ad esempio, a sapere se mostrare la sezione dell'amministratore.
export function getMe() {
  return apiFetch<{ id: number; nome: string; ruolo: Ruolo; admin: boolean; inAttesa?: boolean }>('/me');
}

// ---------- Inviti ----------
// CLIENTE: ogni trainer crea gli inviti per i suoi clienti.
// TRAINER: inviti per i nuovi trainer, li crea SOLO l'amministratore.
export type StatoInvito = 'attivo' | 'usato' | 'scaduto' | 'annullato';
export type TipoInvito = 'CLIENTE' | 'TRAINER';

export interface Invito {
  id: number;
  codice: string;
  nota: string | null;
  ruolo: TipoInvito;
  creatoIl: string;
  scadeIl: string;
  usatoIl: string | null;
  annullatoIl: string | null;
  stato: StatoInvito;
  usatoDa: { nome: string; email: string } | null;
}

const percorsoInviti = (tipo: TipoInvito) => (tipo === 'TRAINER' ? '/admin/inviti-trainer' : '/inviti');

export function getInviti(tipo: TipoInvito = 'CLIENTE') {
  return apiFetch<Invito[]>(percorsoInviti(tipo));
}

export function creaInvito(nota: string, giorni: number, tipo: TipoInvito = 'CLIENTE') {
  return apiFetch<Invito>(percorsoInviti(tipo), {
    method: 'POST',
    body: JSON.stringify({ nota: nota.trim() || undefined, giorni }),
  });
}

export function annullaInvito(id: number, tipo: TipoInvito = 'CLIENTE') {
  return apiFetch<void>(`${percorsoInviti(tipo)}/${id}/annulla`, { method: 'POST' });
}

// Link di registrazione già con il codice: chi lo apre trova il campo compilato
// (e, per un invito trainer, "Sono un trainer" già scelto).
export function linkInvito(codice: string, tipo: TipoInvito = 'CLIENTE') {
  const ruolo = tipo === 'TRAINER' ? '&ruolo=trainer' : '';
  return `${window.location.origin}/?invito=${encodeURIComponent(codice)}${ruolo}`;
}

// ---------- Panoramica trainer (solo amministratore) ----------
// Solo numeri: nessun dato dei clienti degli altri trainer.
export interface RigaTrainer {
  id: number;
  nome: string;
  email: string;
  admin: boolean;
  sospeso: boolean;
  registratoIl: string | null;
  clienti: number;
  clientiAttivi: number; // con almeno un allenamento negli ultimi 30 giorni
  schedeAttive: number;
  allenamenti30: number;
  ultimoAllenamento: string | null;
}

export interface PanoramicaTrainer {
  totali: { trainer: number; clienti: number; clientiAttivi: number; allenamenti30: number };
  trainer: RigaTrainer[];
}

export function getPanoramicaTrainer() {
  return apiFetch<PanoramicaTrainer>('/admin/trainer');
}

// Solo amministratore: sospendere o riattivare un trainer (anche i suoi clienti restano fuori).
export function sospendiTrainer(id: number) {
  return apiFetch<void>(`/admin/trainer/${id}/sospendi`, { method: 'POST' });
}
export function riattivaTrainer(id: number) {
  return apiFetch<void>(`/admin/trainer/${id}/riattiva`, { method: 'POST' });
}

// Solo amministratore: trainer registrati da soli, in attesa di approvazione.
export interface TrainerInAttesa {
  id: number;
  nome: string;
  email: string;
  presentazione: string | null;
  fasciaClienti: string | null;
  richiestaIl: string | null;
}

export function getTrainerInAttesa() {
  return apiFetch<TrainerInAttesa[]>('/admin/trainer-in-attesa');
}

export function approvaTrainer(id: number) {
  return apiFetch<void>(`/admin/trainer/${id}/approva`, { method: 'POST' });
}

export function rifiutaTrainer(id: number) {
  return apiFetch<void>(`/admin/trainer/${id}/rifiuta`, { method: 'POST' });
}

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  sospeso?: boolean; // sospeso dal trainer: non può accedere, i dati restano
}

// Il trainer sospende o riattiva l'accesso di un suo cliente (nessun dato viene cancellato).
export function sospendiCliente(clienteId: number) {
  return apiFetch<Cliente>(`/clienti/${clienteId}/sospendi`, { method: 'POST' });
}
export function riattivaCliente(clienteId: number) {
  return apiFetch<Cliente>(`/clienti/${clienteId}/riattiva`, { method: 'POST' });
}

// Elenco clienti per il menu a tendina del trainer.
export function getClienti() {
  return apiFetch<Cliente[]>('/clienti');
}

// Cambio della propria password: restituisce un token nuovo (gli altri dispositivi vengono disconnessi).
export function cambiaMiaPassword(passwordAttuale: string, nuovaPassword: string) {
  return apiFetch<{ token: string }>('/me/password', {
    method: 'PUT',
    body: JSON.stringify({ passwordAttuale, nuovaPassword }),
  });
}

// Elimina il PROPRIO account (definitivo): servono la password e la parola "ELIMINA".
export function eliminaMioAccount(password: string, conferma: string) {
  return apiFetch<void>('/me', {
    method: 'DELETE',
    body: JSON.stringify({ password, conferma }),
  });
}

// Solo trainer: imposta una password temporanea per un cliente (lui dovrà cambiarla al primo accesso).
export function reimpostaPasswordCliente(clienteId: number, nuovaPassword: string) {
  return apiFetch<void>(`/clienti/${clienteId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ nuovaPassword }),
  });
}

// Solo trainer: corregge l'email (cioè il nome utente per accedere) di un cliente.
export function cambiaEmailCliente(clienteId: number, email: string) {
  return apiFetch<Cliente>(`/clienti/${clienteId}/email`, {
    method: 'PUT',
    body: JSON.stringify({ email }),
  });
}

export function getSchede(clienteId?: number) {
  const query = clienteId ? `?clienteId=${clienteId}` : '';
  return apiFetch<Scheda[]>(`/schede${query}`);
}

export function creaScheda(nome: string, clienteId: number, esercizi: Omit<Esercizio, 'id' | 'schedaId'>[]) {
  return apiFetch<Scheda>('/schede', {
    method: 'POST',
    body: JSON.stringify({ nome, clienteId, esercizi }),
  });
}

// In modifica: gli esercizi con `id` vengono aggiornati (storico conservato),
// quelli senza `id` creati, quelli mancanti rispetto a prima cancellati.
export function aggiornaScheda(
  id: number,
  nome: string,
  clienteId: number,
  esercizi: (Omit<Esercizio, 'id' | 'schedaId'> & { id?: number })[]
) {
  return apiFetch<Scheda>(`/schede/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ nome, clienteId, esercizi }),
  });
}

// Le schede non si cancellano: si archiviano (spariscono dalle viste, lo storico resta).
export function archiviaScheda(id: number) {
  return apiFetch<void>(`/schede/${id}/archivia`, { method: 'POST' });
}

export function ripristinaScheda(id: number) {
  return apiFetch<void>(`/schede/${id}/ripristina`, { method: 'POST' });
}

export function getSchedeArchiviate() {
  return apiFetch<Scheda[]>('/schede?archiviate=1');
}

// Solo per schede archiviate SENZA storico: il server rifiuta negli altri casi.
export function eliminaSchedaDefinitivamente(id: number) {
  return apiFetch<void>(`/schede/${id}`, { method: 'DELETE' });
}

export function registraAllenamento(
  esercizioId: number,
  pesoUsato: number,
  repsFatte: number,
  nota?: string
) {
  return apiFetch<RegistroAllenamento>('/registro', {
    method: 'POST',
    body: JSON.stringify({ esercizioId, pesoUsato, repsFatte, nota: nota || undefined }),
  });
}

export type GruppoMuscolare = 'PETTO' | 'DORSO' | 'SPALLE' | 'BRACCIA' | 'GAMBE' | 'ADDOME' | 'CARDIO' | 'ALTRO';

export interface EsercizioPreset {
  id: number;
  nome: string;
  videoUrl?: string | null;
  descrizione?: string | null;
  gruppo?: GruppoMuscolare | null; // null = non ancora assegnato
}

export function getPreset() {
  return apiFetch<EsercizioPreset[]>('/preset-esercizi');
}

export function creaPreset(nome: string, videoUrl?: string, descrizione?: string, gruppo?: GruppoMuscolare | null) {
  return apiFetch<EsercizioPreset>('/preset-esercizi', {
    method: 'POST',
    body: JSON.stringify({ nome, videoUrl: videoUrl || undefined, descrizione: descrizione || undefined, gruppo: gruppo ?? null }),
  });
}

// Sposta un esercizio della libreria in un altro gruppo muscolare.
export function cambiaGruppoPreset(id: number, gruppo: GruppoMuscolare | null) {
  return apiFetch<EsercizioPreset>(`/preset-esercizi/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ gruppo }),
  });
}

export function cancellaPreset(id: number) {
  return apiFetch<void>(`/preset-esercizi/${id}`, { method: 'DELETE' });
}

// Nota/tecnica salvata dal trainer, riutilizzabile su qualsiasi esercizio.
export interface NotaPreset {
  id: number;
  testo: string;
}

export function getNotePreset() {
  return apiFetch<NotaPreset[]>('/preset-note');
}

export function creaNotaPreset(testo: string) {
  return apiFetch<NotaPreset>('/preset-note', { method: 'POST', body: JSON.stringify({ testo }) });
}

export function cancellaNotaPreset(id: number) {
  return apiFetch<void>(`/preset-note/${id}`, { method: 'DELETE' });
}

export function modificaSerie(id: number, pesoUsato: number, repsFatte: number, nota?: string) {
  return apiFetch<RegistroAllenamento>(`/registro/serie/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ pesoUsato, repsFatte, nota: nota || undefined }),
  });
}

export function eliminaSerie(id: number) {
  return apiFetch<void>(`/registro/serie/${id}`, { method: 'DELETE' });
}

export interface SessioneAllenamento {
  id: number;
  completataIl: string;
  serieFatte: number;
  serieTotali: number;
  volume: number;
  schedaId: number;
  clienteId: number;
  scheda: { nome: string };
  cliente: { nome: string };
  // Feedback del cliente a fine allenamento (facoltativi)
  nota?: string | null;
  fatica?: number | null; // da 1 a 10
}

// Il cliente salva com'è andato l'allenamento: nota e voto di fatica (null = toglie).
export function salvaFeedback(sessioneId: number, nota: string | null, fatica: number | null) {
  return apiFetch<SessioneAllenamento>(`/sessioni/${sessioneId}/feedback`, {
    method: 'PUT',
    body: JSON.stringify({ nota, fatica }),
  });
}

// Storico completo di una scheda (solo trainer): esercizi, anche quelli tolti, con tutte le serie del cliente.
export interface EsercizioConStorico extends Esercizio {
  archiviatoIl: string | null;
  registri: RegistroAllenamento[];
}

export interface StoricoScheda {
  id: number;
  nome: string;
  clienteId: number;
  archiviataIl: string | null;
  creataIl: string;
  cliente: { nome: string };
  esercizi: EsercizioConStorico[];
}

export function getStoricoScheda(schedaId: number) {
  return apiFetch<StoricoScheda>(`/schede/${schedaId}/storico`);
}

export function getSessioni(clienteId?: number) {
  const query = clienteId ? `?clienteId=${clienteId}` : '';
  return apiFetch<SessioneAllenamento[]>(`/sessioni${query}`);
}

export function completaAllenamento(schedaId: number) {
  // Mezzanotte di oggi secondo il telefono: il server conta le serie da qui in poi.
  const inizio = new Date();
  inizio.setHours(0, 0, 0, 0);
  return apiFetch<SessioneAllenamento>('/sessioni', {
    method: 'POST',
    body: JSON.stringify({ schedaId, inizioGiornata: inizio.toISOString() }),
  });
}

// Esercizi tolti da una scheda: restano salvati (con lo storico) e si possono rimettere.
export interface EsercizioArchiviato extends Esercizio {
  archiviatoIl: string;
  _count: { registri: number }; // quante serie ha registrato il cliente su questo esercizio
}

export function getEserciziArchiviati(schedaId: number) {
  return apiFetch<EsercizioArchiviato[]>(`/schede/${schedaId}/esercizi-archiviati`);
}

export function ripristinaEsercizio(id: number) {
  return apiFetch<void>(`/esercizi/${id}/ripristina`, { method: 'POST' });
}

export function getStorico(esercizioId: number) {
  return apiFetch<RegistroAllenamento[]>(`/registro/${esercizioId}`);
}

// ---------- Misure del corpo: peso (lo scrive il cliente) e % massa grassa (la scrive il trainer) ----------

export type TipoMisura = 'PESO' | 'MASSA_GRASSA';

export interface MisuraCorporea {
  id: number;
  tipo: TipoMisura;
  valore: number;
  data: string; // "2026-09-29T00:00:00.000Z": conta solo il giorno
  clienteId: number;
}

// Cliente: le proprie. Trainer: quelle del cliente indicato.
export function getMisure(clienteId?: number) {
  return apiFetch<MisuraCorporea[]>(`/misure${clienteId ? `?clienteId=${clienteId}` : ''}`);
}

// Salva o corregge (se quel giorno c'è già) una misura. data = "AAAA-MM-GG".
export function salvaMisura(tipo: TipoMisura, valore: number, data: string, clienteId?: number) {
  return apiFetch<MisuraCorporea>('/misure', {
    method: 'PUT',
    body: JSON.stringify({ tipo, valore, data, clienteId }),
  });
}

export function eliminaMisura(id: number) {
  return apiFetch<void>(`/misure/${id}`, { method: 'DELETE' });
}

// ---------- Cardio e passi ----------
// Il trainer decide il piano cardio e l'obiettivo di passi; il cliente segna cardio fatto e passi.

export interface ObiettivoCardio {
  id: number;
  attivita: string;
  minuti: number;
  volteSettimana: number;
  nota: string | null;
}

export interface CardioFatto {
  id: number;
  attivita: string;
  minuti: number;
  distanzaKm: number | null;
  nota: string | null;
  data: string; // "2026-10-21T00:00:00.000Z": conta solo il giorno
  obiettivoId: number | null;
}

export interface PassiGiorno {
  id: number;
  passi: number;
  data: string;
}

export interface DatiCardio {
  obiettivoPassi: number | null;
  obiettivi: ObiettivoCardio[];
  sessioni: CardioFatto[]; // dalla più recente
  passi: PassiGiorno[]; // dal giorno più vecchio
}

export type NuovoObiettivoCardio = { attivita: string; minuti: number; volteSettimana: number; nota?: string };

// Cliente: i propri. Trainer: quelli del cliente indicato.
export function getCardio(clienteId?: number) {
  return apiFetch<DatiCardio>(`/cardio${clienteId ? `?clienteId=${clienteId}` : ''}`);
}

export function creaObiettivoCardio(clienteId: number, dati: NuovoObiettivoCardio) {
  return apiFetch<ObiettivoCardio>('/cardio/obiettivi', { method: 'POST', body: JSON.stringify({ clienteId, ...dati }) });
}

export function modificaObiettivoCardio(id: number, dati: NuovoObiettivoCardio) {
  return apiFetch<ObiettivoCardio>(`/cardio/obiettivi/${id}`, { method: 'PUT', body: JSON.stringify(dati) });
}

export function eliminaObiettivoCardio(id: number) {
  return apiFetch<void>(`/cardio/obiettivi/${id}`, { method: 'DELETE' });
}

// passi = null toglie l'obiettivo.
export function salvaObiettivoPassi(clienteId: number, passi: number | null) {
  return apiFetch<{ obiettivoPassi: number | null }>('/cardio/obiettivo-passi', {
    method: 'PUT',
    body: JSON.stringify({ clienteId, passi }),
  });
}

export function segnaCardio(dati: {
  attivita: string;
  minuti: number;
  data: string; // "AAAA-MM-GG"
  distanzaKm?: number | null;
  nota?: string;
  obiettivoId?: number | null;
}) {
  return apiFetch<CardioFatto>('/cardio/sessioni', { method: 'POST', body: JSON.stringify(dati) });
}

export function eliminaCardio(id: number) {
  return apiFetch<void>(`/cardio/sessioni/${id}`, { method: 'DELETE' });
}

// Salva o corregge (se quel giorno ci sono già) i passi di un giorno.
export function salvaPassi(data: string, passi: number) {
  return apiFetch<PassiGiorno>('/cardio/passi', { method: 'PUT', body: JSON.stringify({ data, passi }) });
}

// ---------- Diario alimentare ----------
// Il cliente scrive i pasti di ogni giorno (con il suo consenso); il trainer legge e commenta.

export type TipoPasto = 'COLAZIONE' | 'SPUNTINO_MATTINA' | 'PRANZO' | 'SPUNTINO_POMERIGGIO' | 'CENA';

export interface PastoDiario {
  tipo: TipoPasto;
  testo: string;
  ora: string | null; // "13:15"
}

export interface GiornoDiario {
  id: number;
  data: string; // "2026-10-21T00:00:00.000Z": conta solo il giorno
  olioCucchiai: number | null;
  acquaLitri: number | null;
  sensazioni: string | null;
  commentoTrainer: string | null;
  commentatoIl: string | null;
  pasti: PastoDiario[];
}

export interface DatiDiario {
  consenso: boolean;
  giorni: GiornoDiario[]; // dal più recente
}

export type GiornataDaSalvare = {
  pasti: Partial<Record<TipoPasto, { testo: string; ora?: string | null }>>;
  olioCucchiai: number | null;
  acquaLitri: number | null;
  sensazioni: string;
};

// Cliente: il proprio. Trainer: quello del cliente indicato.
export function getDiario(clienteId?: number) {
  return apiFetch<DatiDiario>(`/diario${clienteId ? `?clienteId=${clienteId}` : ''}`);
}

// false = ritira il consenso: il diario viene cancellato.
export function salvaConsensoDiario(consenso: boolean) {
  return apiFetch<{ consenso: boolean }>('/diario/consenso', { method: 'PUT', body: JSON.stringify({ consenso }) });
}

// Salva tutta la giornata (data = "AAAA-MM-GG"). Risposta null = giornata vuota, tolta.
export function salvaGiornataDiario(data: string, giornata: GiornataDaSalvare) {
  return apiFetch<GiornoDiario | null>(`/diario/${data}`, { method: 'PUT', body: JSON.stringify(giornata) });
}

// Il trainer commenta una giornata (commento vuoto = tolto).
export function commentaGiornataDiario(clienteId: number, data: string, commento: string) {
  return apiFetch<GiornoDiario>(`/diario/${data}/commento`, { method: 'PUT', body: JSON.stringify({ clienteId, commento }) });
}
