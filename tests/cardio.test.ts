import { describe, expect, it } from 'vitest';
import type { CardioFatto, ObiettivoCardio } from '../src/api';
import { aggiungiGiorni, fatteQuestaSettimana, leggiKm, leggiPassi, lunediDi, mediaPassi, minutiQuestaSettimana, ultimi7Giorni } from '../src/cardio-calcoli';

const sessione = (giorno: string, extra: Partial<CardioFatto> = {}): CardioFatto => ({
  id: Math.random(),
  attivita: 'Camminata',
  minuti: 30,
  distanzaKm: null,
  nota: null,
  data: `${giorno}T00:00:00.000Z`,
  obiettivoId: 1,
  ...extra,
});
const camminata: ObiettivoCardio = { id: 1, attivita: 'Camminata', minuti: 30, volteSettimana: 3, nota: null };

describe('settimana', () => {
  it('va da lunedì a domenica, anche a cavallo di mese e anno', () => {
    expect(lunediDi('2026-10-21')).toBe('2026-10-19'); // mercoledì
    expect(lunediDi('2026-10-19')).toBe('2026-10-19'); // lunedì
    expect(lunediDi('2026-10-25')).toBe('2026-10-19'); // domenica
    expect(lunediDi('2027-01-01')).toBe('2026-12-28');
    expect(aggiungiGiorni('2026-10-31', 1)).toBe('2026-11-01');
    expect(aggiungiGiorni('2026-03-29', -1)).toBe('2026-03-28'); // cambio dell'ora
  });

  it('conta le sessioni della settimana per ogni attività del piano', () => {
    const sessioni = [
      sessione('2026-10-19'),
      sessione('2026-10-21'),
      sessione('2026-10-18'), // domenica scorsa: non conta
      sessione('2026-10-20', { obiettivoId: null, attivita: ' camminata ' }), // scritta a mano, stesso nome
      sessione('2026-10-20', { obiettivoId: null, attivita: 'Bici' }),
      sessione('2026-10-20', { obiettivoId: 2, attivita: 'Camminata' }), // altra attività del piano
    ];
    expect(fatteQuestaSettimana(sessioni, camminata, '2026-10-21')).toBe(3);
    expect(minutiQuestaSettimana(sessioni, '2026-10-21')).toBe(150);
  });
});

describe('passi', () => {
  it('ultimi 7 giorni fino a oggi, con i buchi, e media dei soli giorni inseriti', () => {
    const passi = [
      { id: 1, passi: 9000, data: '2026-10-21T00:00:00.000Z' },
      { id: 2, passi: 5000, data: '2026-10-19T00:00:00.000Z' },
      { id: 3, passi: 12000, data: '2026-10-10T00:00:00.000Z' }, // troppo vecchio
    ];
    const g = ultimi7Giorni(passi, '2026-10-21');
    expect(g.map((x) => x.giorno)).toEqual(['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']);
    expect(g.map((x) => x.passi)).toEqual([null, null, null, null, 5000, null, 9000]);
    expect(mediaPassi(g)).toBe(7000);
    expect(mediaPassi([{ passi: null }])).toBeNull();
  });

  it('legge i passi scritti con i separatori delle migliaia', () => {
    expect(leggiPassi('8.123')).toBe(8123);
    expect(leggiPassi('8,123')).toBe(8123);
    expect(leggiPassi(' 12 500 ')).toBe(12500);
    expect(leggiPassi('0')).toBe(0);
    expect(leggiPassi('')).toBeNull();
    expect(leggiPassi('abc')).toBeNull();
    expect(leggiPassi('150000')).toBeNull();
  });

  it('legge i km con virgola o punto', () => {
    expect(leggiKm('4,5')).toBe(4.5);
    expect(leggiKm('10.25')).toBe(10.25);
    expect(leggiKm('')).toBeNull();
    expect(leggiKm('4,555')).toBeUndefined();
    expect(leggiKm('500')).toBeUndefined();
  });
});
