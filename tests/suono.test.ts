import { beforeEach, describe, expect, it } from 'vitest';
import { impostaSuono, impostaVolume, leggiVolume, suonoAttivo } from '../src/suono';

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
