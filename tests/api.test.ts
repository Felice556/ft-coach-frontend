import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENTO_SESSIONE_SCADUTA, getSchede, salvaMisura } from '../src/api';

function risposta(stato: number, corpo: unknown, intestazioni: Record<string, string> = {}) {
  return new Response(stato === 204 ? null : JSON.stringify(corpo), {
    status: stato,
    headers: { 'Content-Type': 'application/json', ...intestazioni },
  });
}

let fetchFinto: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  fetchFinto = vi.fn();
  vi.stubGlobal('fetch', fetchFinto);
});

afterEach(() => vi.unstubAllGlobals());

describe('Chiamate al backend', () => {
  it('manda il token e usa l’indirizzo del backend', async () => {
    localStorage.setItem('token', 'tok-1');
    fetchFinto.mockResolvedValue(risposta(200, []));
    await getSchede();
    const [url, opzioni] = fetchFinto.mock.calls[0];
    expect(url).toBe('https://api.esempio.test/schede');
    expect(opzioni.headers.Authorization).toBe('Bearer tok-1');
  });

  it('salva il token rinnovato dal server', async () => {
    localStorage.setItem('token', 'tok-vecchio');
    fetchFinto.mockResolvedValue(risposta(200, [], { 'X-Nuovo-Token': 'tok-nuovo' }));
    await getSchede();
    expect(localStorage.getItem('token')).toBe('tok-nuovo');
  });

  it('NON lo salva se nel frattempo l’utente è uscito (niente accessi "fantasma")', async () => {
    localStorage.setItem('token', 'tok-vecchio');
    fetchFinto.mockImplementation(async () => {
      localStorage.removeItem('token'); // l'utente preme "Esci" mentre la richiesta è in viaggio
      return risposta(200, [], { 'X-Nuovo-Token': 'tok-nuovo' });
    });
    await getSchede();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('sessione scaduta: avvisa l’app (che mostra il login sopra la pagina) invece di ricaricare', async () => {
    localStorage.setItem('token', 'tok-scaduto');
    fetchFinto.mockResolvedValue(risposta(401, { errore: 'Token non valido o scaduto' }));
    const avviso = vi.fn();
    window.addEventListener(EVENTO_SESSIONE_SCADUTA, avviso);
    await expect(getSchede()).rejects.toThrow(/Sessione scaduta/);
    expect(avviso).toHaveBeenCalledOnce();
    window.removeEventListener(EVENTO_SESSIONE_SCADUTA, avviso);
  });

  it('gli errori del server diventano messaggi leggibili', async () => {
    localStorage.setItem('token', 't');
    fetchFinto.mockResolvedValue(risposta(400, { errore: 'Il peso deve essere tra 20 e 350 kg' }));
    await expect(salvaMisura('PESO', 725, '2026-09-29')).rejects.toThrow('Il peso deve essere tra 20 e 350 kg');
  });
});
