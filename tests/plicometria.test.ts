import { describe, expect, it } from 'vitest';
import { calcolaPliche, densitaCorporea, percentualeSiri, sitiRichiesti } from '../src/plicometria';

describe('Plicometria (Jackson & Pollock + Siri)', () => {
  it('pliche richieste: 7 uguali per tutti, 3 diverse tra uomo e donna', () => {
    expect(sitiRichiesti(7, 'M')).toHaveLength(7);
    expect(sitiRichiesti(7, 'F')).toEqual(sitiRichiesti(7, 'M'));
    expect(sitiRichiesti(3, 'M')).toEqual(['pettorale', 'addome', 'coscia']);
    expect(sitiRichiesti(3, 'F')).toEqual(['tricipite', 'sovrailiaca', 'coscia']);
  });

  it.each([
    [7, 'M', 100, 30, 14.6],
    [3, 'M', 50, 25, 14.5],
    [3, 'F', 60, 30, 24.1],
    [7, 'F', 120, 35, 24.0],
  ] as const)('%i pliche, %s, somma %i mm, %i anni → %d%%', (siti, sesso, somma, eta, atteso) => {
    expect(percentualeSiri(densitaCorporea(siti, sesso, somma, eta))).toBeCloseTo(atteso, 0);
  });

  it('più pliche (più grasso sottocutaneo) = percentuale più alta; a parità di pliche, più anni = più grasso', () => {
    const p = (somma: number, eta: number) => percentualeSiri(densitaCorporea(7, 'M', somma, eta));
    expect(p(120, 30)).toBeGreaterThan(p(80, 30));
    expect(p(100, 50)).toBeGreaterThan(p(100, 25));
  });

  it('somma solo le pliche richieste, arrotonda a un decimale e calcola i kg col peso', () => {
    const r = calcolaPliche(
      3,
      'M',
      25,
      { pettorale: 15, addome: 20, coscia: 15, tricipite: 99 }, // il tricipite non conta per l'uomo a 3 pliche
      80
    );
    expect(r.somma).toBe(50);
    expect(r.grasso).toBe(14.5);
    expect(r.kgGrasso).toBe(11.6);
    expect(r.kgMagra).toBe(68.4);
  });

  it('senza peso: solo la percentuale', () => {
    const r = calcolaPliche(7, 'F', 35, { pettorale: 10, addome: 25, coscia: 25, tricipite: 18, sovrailiaca: 17, sottoscapolare: 15, ascellare: 10 }, null);
    expect(r.somma).toBe(120);
    expect(r.grasso).toBe(24);
    expect(r.kgGrasso).toBeNull();
  });
});
