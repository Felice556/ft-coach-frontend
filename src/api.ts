const API_URL = import.meta.env.VITE_API_URL;

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

export function getStorico(esercizioId: number) {
  return apiFetch<RegistroAllenamento[]>(`/registro/${esercizioId}`);
}
