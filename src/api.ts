// Se apri l'app dal telefono (es. http://192.168.1.20:5173), "localhost" nel .env
// indicherebbe il telefono stesso, non il PC dove gira il backend. In quel caso
// sostituiamo localhost con l'indirizzo da cui è stata aperta la pagina.
// In produzione VITE_API_URL sarà l'URL vero del backend e questo non scatta.
function risolviApiUrl(): string {
  const daEnv: string = import.meta.env.VITE_API_URL;
  if (daEnv.includes('localhost') && window.location.hostname !== 'localhost') {
    return daEnv.replace('localhost', window.location.hostname);
  }
  return daEnv;
}

const API_URL = risolviApiUrl();

export type Ruolo = 'TRAINER' | 'CLIENTE';

export interface Esercizio {
  id: number;
  nome: string;
  videoUrl?: string | null;
  descrizione?: string | null;
  serieTarget: number;
  repsTarget: number;
  recuperoSecondi: number;
  schedaId: number;
}

export interface Scheda {
  id: number;
  nome: string;
  clienteId: number;
  esercizi: Esercizio[];
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

  if (!risposta.ok) {
    const corpo = await risposta.json().catch(() => ({}));
    throw new Error(corpo.errore || `Errore ${risposta.status}`);
  }

  if (risposta.status === 204) {
    return undefined as T;
  }
  return risposta.json();
}

export function login(email: string, password: string) {
  return apiFetch<{ token: string; ruolo: Ruolo; nome: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(nome: string, email: string, password: string, ruolo: Ruolo) {
  return apiFetch<{ id: number; nome: string; ruolo: Ruolo }>('/register', {
    method: 'POST',
    body: JSON.stringify({ nome, email, password, ruolo }),
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

export function cancellaScheda(id: number) {
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

export function annullaCompletamento(id: number) {
  return apiFetch<void>(`/sessioni/${id}`, { method: 'DELETE' });
}

export function getStorico(esercizioId: number) {
  return apiFetch<RegistroAllenamento[]>(`/registro/${esercizioId}`);
}
