// Indirizzo del backend, dalla variabile VITE_API_URL (file .env o impostazioni di Vercel).
function risolviApiUrl(): string {
  const daEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (!daEnv) {
    // Meglio un errore chiaro in console che un'app che non funziona senza motivo apparente.
    throw new Error('VITE_API_URL non impostata: aggiungila nel file .env (o su Vercel) e riavvia');
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

// Nomi leggibili dei campi, per i messaggi di errore.
const NOMI_CAMPI: Record<string, string> = {
  nome: 'nome',
  clienteId: 'cliente',
  videoUrl: 'video',
  descrizione: 'note',
  serieTarget: 'serie',
  repsTarget: 'reps',
  repsMax: 'reps',
  reps: 'reps',
  recuperoSecondi: 'recupero',
  nota: 'nota',
};

// Da { path: ['esercizi', 1, 'videoUrl'], message: '...' } a "Esercizio 2 → video: ..."
function descriviErrore(e: { path?: (string | number)[]; message?: string }): string {
  const path = e.path || [];
  const parti: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (p === 'esercizi' && typeof path[i + 1] === 'number') {
      parti.push(`Esercizio ${(path[i + 1] as number) + 1}`);
      i++;
    } else if (p === 'serieExtra' && typeof path[i + 1] === 'number') {
      parti.push(`serie aggiunta ${(path[i + 1] as number) + 1}`);
      i++;
    } else if (typeof p === 'string') {
      parti.push(NOMI_CAMPI[p] || p);
    }
  }
  const dove = parti.length ? `${parti.join(' → ')}: ` : '';
  return `${dove}${e.message || 'valore non valido'}`;
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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Token scaduto o non più valido. NON ricarichiamo la pagina: si perderebbe quello che
  // l'utente sta scrivendo (kg/reps a metà serie, o un'intera scheda nel form del trainer).
  // Avvisiamo App, che mostra un piccolo login SOPRA la pagina: dopo l'accesso si riprova
  // la stessa azione e tutto quello che era scritto è ancora lì.
  // (/login escluso: lì un 401 vuol dire solo "email o password sbagliate".)
  if (risposta.status === 401 && token && path !== '/login') {
    window.dispatchEvent(new Event(EVENTO_SESSIONE_SCADUTA));
    throw new Error('Sessione scaduta: accedi di nuovo qui sopra, poi riprova');
  }

  if (!risposta.ok) {
    const corpo = await risposta.json().catch(() => ({}));
    // Password temporanea impostata dal trainer: App mostra la schermata "Scegli una nuova password".
    if (risposta.status === 403 && corpo.codice === 'CAMBIO_PASSWORD') {
      window.dispatchEvent(new Event(EVENTO_CAMBIO_PASSWORD));
    }
    if (corpo.errore) throw new Error(corpo.errore);
    // Errori di validazione (zod): il backend manda un elenco "errori" con il percorso del campo.
    // Li traduciamo in qualcosa di leggibile, es. "Esercizio 2 → video: link non valido".
    if (Array.isArray(corpo.errori) && corpo.errori.length > 0) {
      throw new Error(corpo.errori.map(descriviErrore).join(' · '));
    }
    throw new Error(`Errore ${risposta.status}`);
  }

  if (risposta.status === 204) {
    return undefined as T;
  }
  return risposta.json();
}

export function login(email: string, password: string) {
  // passwordTemporanea = true: il trainer ha reimpostato la password, va scelta una nuova.
  return apiFetch<{ token: string; ruolo: Ruolo; nome: string; passwordTemporanea?: boolean }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// codiceTrainer serve solo per creare un account TRAINER (deve coincidere con CODICE_TRAINER del backend).
// codiceInvito: l'invito personale che il trainer dà al cliente (obbligatorio se il server lo richiede).
export function register(
  nome: string,
  email: string,
  password: string,
  ruolo: Ruolo,
  codiceTrainer?: string,
  codiceInvito?: string
) {
  return apiFetch<{ id: number; nome: string; ruolo: Ruolo }>('/register', {
    method: 'POST',
    body: JSON.stringify({
      nome,
      email,
      password,
      ruolo,
      codiceTrainer: codiceTrainer || undefined,
      codiceInvito: codiceInvito?.trim() || undefined,
    }),
  });
}

// Dice alla schermata di registrazione se il codice invito è obbligatorio.
export function getInfoRegistrazione() {
  return apiFetch<{ invitoObbligatorio: boolean }>('/registrazione/info');
}

// ---------- Inviti (solo trainer) ----------
export type StatoInvito = 'attivo' | 'usato' | 'scaduto' | 'annullato';

export interface Invito {
  id: number;
  codice: string;
  nota: string | null;
  creatoIl: string;
  scadeIl: string;
  usatoIl: string | null;
  annullatoIl: string | null;
  stato: StatoInvito;
  usatoDa: { nome: string; email: string } | null;
}

export function getInviti() {
  return apiFetch<Invito[]>('/inviti');
}

export function creaInvito(nota: string, giorni: number) {
  return apiFetch<Invito>('/inviti', {
    method: 'POST',
    body: JSON.stringify({ nota: nota.trim() || undefined, giorni }),
  });
}

export function annullaInvito(id: number) {
  return apiFetch<void>(`/inviti/${id}/annulla`, { method: 'POST' });
}

// Link di registrazione già con il codice: il cliente lo apre e trova il campo compilato.
export function linkInvito(codice: string) {
  return `${window.location.origin}/?invito=${encodeURIComponent(codice)}`;
}

export interface Cliente {
  id: number;
  nome: string;
  email: string;
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

export interface EsercizioPreset {
  id: number;
  nome: string;
  videoUrl?: string | null;
  descrizione?: string | null;
}

export function getPreset() {
  return apiFetch<EsercizioPreset[]>('/preset-esercizi');
}

export function creaPreset(nome: string, videoUrl?: string, descrizione?: string) {
  return apiFetch<EsercizioPreset>('/preset-esercizi', {
    method: 'POST',
    body: JSON.stringify({ nome, videoUrl: videoUrl || undefined, descrizione: descrizione || undefined }),
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
