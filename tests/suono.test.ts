import { beforeEach, describe, expect, it } from 'vitest';
import { impostaSuono, impostaVolume, leggiVolume, sbloccaAudio, suonoAttivo, suonoFine } from '../src/suono';

beforeEach(() => localStorage.clear());

describe('Suono del timer', () => {
  it('di base il suono è attivo, all’80%', () => {
    expect(suonoAttivo()).toBe(true);
    expect(leggiVolume()).toBe(80);
  });

  it('silenzioso e volume restano salvati sul telefono', () => {
    impostaSuono(false);
    impostaVolume(35);
    expect(suonoAttivo()).toBe(false);
    expect(leggiVolume()).toBe(35);
  });

  it('il volume resta sempre tra 0 e 100', () => {
    impostaVolume(250);
    expect(leggiVolume()).toBe(100);
    impostaVolume(-5);
    expect(leggiVolume()).toBe(0);
    localStorage.setItem('volumeTimer', 'rotto');
    expect(leggiVolume()).toBe(80);
  });
});

// Finto audio del browser: conta quanti ne vengono creati e quanti bip partono.
class FintoAudio {
  static creati: FintoAudio[] = [];
  state: string = 'running';
  chiuso = false;
  bip = 0;
  currentTime = 0;
  destination = {};
  constructor() {
    FintoAudio.creati.push(this);
  }
  resume() { return Promise.resolve(); }
  close() { this.chiuso = true; return Promise.resolve(); }
  createBuffer() { return {}; }
  createBufferSource() { return { buffer: null, connect: () => undefined, start: () => undefined }; }
  createGain() {
    const g = { gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined }, connect: (x: unknown) => x };
    return g;
  }
  createOscillator() {
    const self = this;
    return { type: '', frequency: { value: 0 }, connect: (x: unknown) => x, start() { self.bip++; }, stop: () => undefined };
  }
}

function standby(nascosta: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => nascosta });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('Audio dopo lo standby (iPhone)', () => {
  it('tornando dallo standby, al primo tocco l’audio viene rifatto e il timer suona di nuovo', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FintoAudio;
    sbloccaAudio();
    const primo = FintoAudio.creati.at(-1)!;
    sbloccaAudio(); // senza standby si riusa lo stesso
    expect(FintoAudio.creati.at(-1)).toBe(primo);

    standby(true);
    primo.state = 'interrupted'; // quello che fa Safari su iPhone
    standby(false);
    sbloccaAudio(); // "Registra serie"
    const nuovo = FintoAudio.creati.at(-1)!;
    expect(nuovo).not.toBe(primo);
    expect(primo.chiuso).toBe(true);

    suonoFine();
    expect(nuovo.bip).toBe(3);
  });

  it('anche se dopo lo standby dice "running" (ma è muto), viene rifatto lo stesso', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = FintoAudio;
    sbloccaAudio();
    const prima = FintoAudio.creati.at(-1)!;
    standby(true);
    standby(false);
    sbloccaAudio();
    expect(FintoAudio.creati.at(-1)).not.toBe(prima);
  });
});
