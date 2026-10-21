// Lingua dell'app: di base quella del telefono (italiano solo se il telefono è in italiano),
// a meno che l'utente non l'abbia scelta a mano.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { linguaIniziale } from '../src/lingua';

function telefonoIn(lingue: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(lingue);
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(lingue[0] ?? '');
}

describe('linguaIniziale', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('lingua', 'it'); // come in tests/setup.ts
  });

  it('segue il telefono: italiano se è in italiano, inglese per tutte le altre lingue', () => {
    localStorage.removeItem('lingua');
    telefonoIn(['it-IT', 'en']);
    expect(linguaIniziale()).toBe('it');
    telefonoIn(['en-GB']);
    expect(linguaIniziale()).toBe('en');
    telefonoIn(['de-DE', 'it']);
    expect(linguaIniziale()).toBe('en');
  });

  it('la scelta fatta nelle impostazioni vince sulla lingua del telefono', () => {
    telefonoIn(['it-IT']);
    localStorage.setItem('lingua', 'en');
    expect(linguaIniziale()).toBe('en');
    telefonoIn(['en-US']);
    localStorage.setItem('lingua', 'it');
    expect(linguaIniziale()).toBe('it');
  });

  it('un valore strano salvato viene ignorato', () => {
    telefonoIn(['fr-FR']);
    localStorage.setItem('lingua', 'xx');
    expect(linguaIniziale()).toBe('en');
  });
});
