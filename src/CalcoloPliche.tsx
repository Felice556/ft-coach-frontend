import { useEffect, useId, useRef, useState } from 'react';
import { leggiNumero, numero } from './misure-formati';
import { calcolaPliche, NOMI_SITI, NumeroSiti, Sesso, sitiRichiesti } from './plicometria';

// Finestra per calcolare la % di massa grassa dalle pliche (Jackson & Pollock + Siri)
// e inserirla con un tocco nella massa grassa del cliente.

interface Preferenze {
  sesso: Sesso;
  eta: string;
  siti: NumeroSiti;
}

// Sesso, età e numero di pliche restano salvati su questo dispositivo, cliente per cliente:
// la volta dopo non serve riscriverli.
function leggiPreferenze(clienteId: number): Preferenze {
  try {
    const salvate = JSON.parse(localStorage.getItem(`plicometria-${clienteId}`) || 'null');
    if (salvate && (salvate.sesso === 'M' || salvate.sesso === 'F') && (salvate.siti === 3 || salvate.siti === 7)) {
      return { sesso: salvate.sesso, eta: String(salvate.eta ?? ''), siti: salvate.siti };
    }
  } catch {
    // niente preferenze salvate: si parte dai valori predefiniti
  }
  return { sesso: 'M', eta: '', siti: 7 };
}

function salvaPreferenze(clienteId: number, p: Preferenze) {
  try {
    localStorage.setItem(`plicometria-${clienteId}`, JSON.stringify(p));
  } catch {
    // se non si può salvare, pazienza: vale solo per questa volta
  }
}

export default function CalcoloPliche({
  clienteId,
  nomeCliente,
  pesoAttuale,
  onUsa,
  onChiudi,
}: {
  clienteId: number;
  nomeCliente?: string;
  pesoAttuale: number | null;
  onUsa: (grasso: number) => void;
  onChiudi: () => void;
}) {
  const id = useId();
  const finestra = useRef<HTMLDivElement>(null);
  const iniziali = leggiPreferenze(clienteId);
  const [sesso, setSesso] = useState<Sesso>(iniziali.sesso);
  const [eta, setEta] = useState(iniziali.eta);
  const [siti, setSiti] = useState<NumeroSiti>(iniziali.siti);
  const [peso, setPeso] = useState(pesoAttuale ? numero(pesoAttuale) : '');
  const [pliche, setPliche] = useState<Record<string, string>>({});

  // Esc chiude; all'apertura il focus va sul primo bottone (solo una volta, non a ogni tasto).
  const chiudi = useRef(onChiudi);
  chiudi.current = onChiudi;
  useEffect(() => {
    const prima = document.activeElement as HTMLElement | null;
    finestra.current?.querySelector<HTMLElement>('button')?.focus();
    const tasto = (e: KeyboardEvent) => e.key === 'Escape' && chiudi.current();
    window.addEventListener('keydown', tasto);
    return () => {
      window.removeEventListener('keydown', tasto);
      prima?.focus();
    };
  }, []);

  const elenco = sitiRichiesti(siti, sesso);
  const valori = Object.fromEntries(elenco.map((s) => [s, leggiNumero(pliche[s] ?? '')]));
  const plicheOk = elenco.every((s) => valori[s] !== null && (valori[s] as number) >= 1 && (valori[s] as number) <= 80);
  const etaNum = Number(eta);
  const etaOk = Number.isInteger(etaNum) && etaNum >= 15 && etaNum <= 90;
  const pesoNum = leggiNumero(peso);
  const pesoOk = peso.trim() === '' || (pesoNum !== null && pesoNum >= 20 && pesoNum <= 350);
  const risultato = plicheOk && etaOk ? calcolaPliche(siti, sesso, etaNum, valori as Record<string, number>, pesoOk ? pesoNum : null) : null;
  const valido = risultato !== null && risultato.grasso >= 2 && risultato.grasso <= 70;

  function usa() {
    if (!risultato || !valido) return;
    salvaPreferenze(clienteId, { sesso, eta, siti });
    onUsa(risultato.grasso);
  }

  const scelta = (attivo: boolean) =>
    `min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition ${attivo ? 'bg-accent text-accent-ink' : 'text-soft hover:text-ink'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onChiudi}>
      <div
        ref={finestra}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titolo`}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-1">Plicometria{nomeCliente ? ` · ${nomeCliente}` : ''}</p>
            <h2 id={`${id}-titolo`} className="section-title">Calcola la massa grassa</h2>
            <p className="mt-1 text-xs text-muted">Formule di Jackson &amp; Pollock e Siri. Pliche in millimetri.</p>
          </div>
          <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={onChiudi}>
            Chiudi
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label">Sesso</p>
              <div className="flex gap-1 rounded-xl border border-line p-1" role="group" aria-label="Sesso">
                <button type="button" aria-pressed={sesso === 'M'} className={scelta(sesso === 'M')} onClick={() => setSesso('M')}>
                  Uomo
                </button>
                <button type="button" aria-pressed={sesso === 'F'} className={scelta(sesso === 'F')} onClick={() => setSesso('F')}>
                  Donna
                </button>
              </div>
            </div>
            <div>
              <p className="label">Numero di pliche</p>
              <div className="flex gap-1 rounded-xl border border-line p-1" role="group" aria-label="Numero di pliche">
                <button type="button" aria-pressed={siti === 7} className={scelta(siti === 7)} onClick={() => setSiti(7)}>
                  7
                </button>
                <button type="button" aria-pressed={siti === 3} className={scelta(siti === 3)} onClick={() => setSiti(3)}>
                  3
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor={`${id}-eta`}>Età (anni)</label>
              <input id={`${id}-eta`} className="input tabular-nums" inputMode="numeric" maxLength={2} value={eta} onChange={(e) => setEta(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor={`${id}-peso`}>Peso (kg)</label>
              <input id={`${id}-peso`} className="input tabular-nums" inputMode="decimal" maxLength={6} placeholder="facoltativo" value={peso} onChange={(e) => setPeso(e.target.value)} />
            </div>
          </div>

          <div>
            <p className="label">Pliche (mm)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {elenco.map((s) => (
                <div key={s}>
                  <label className="mb-1 block text-xs font-semibold text-soft" htmlFor={`${id}-${s}`}>
                    {NOMI_SITI[s]}
                  </label>
                  <input
                    id={`${id}-${s}`}
                    className="input tabular-nums"
                    inputMode="decimal"
                    maxLength={5}
                    value={pliche[s] ?? ''}
                    onChange={(e) => setPliche((p) => ({ ...p, [s]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {eta.trim() !== '' && !etaOk && <p className="alert-error">Età tra 15 e 90 anni.</p>}
          {!pesoOk && <p className="alert-error">Peso tra 20 e 350 kg (oppure lascialo vuoto).</p>}
          {elenco.some((s) => (pliche[s] ?? '').trim() !== '' && (valori[s] === null || (valori[s] as number) < 1 || (valori[s] as number) > 80)) && (
            <p className="alert-error">Ogni plica tra 1 e 80 mm (es. 12,5).</p>
          )}

          {risultato ? (
            <div className="rounded-2xl border border-accent-strong/50 bg-accent-soft p-4" aria-live="polite">
              <p className="text-xs font-semibold tracking-wide text-accent-strong uppercase">Massa grassa</p>
              <p className="text-4xl font-black tabular-nums text-accent-strong">{numero(risultato.grasso)} %</p>
              <p className="mt-1 text-sm text-soft">
                Somma pliche {numero(risultato.somma)} mm
                {risultato.kgGrasso !== null && risultato.kgMagra !== null && (
                  <>
                    {' '}· {numero(risultato.kgGrasso)} kg di grasso · {numero(risultato.kgMagra)} kg di massa magra
                  </>
                )}
              </p>
              {!valido && <p className="alert-error mt-2">Risultato fuori scala: ricontrolla le pliche.</p>}
            </div>
          ) : (
            <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
              Inserisci età e tutte le {elenco.length} pliche: il risultato compare qui.
            </p>
          )}

          <button type="button" className="btn-primary min-h-12 w-full" disabled={!valido} onClick={usa}>
            {valido && risultato ? `Inserisci ${numero(risultato.grasso)}% nella massa grassa` : 'Inserisci nella massa grassa'}
          </button>
        </div>
      </div>
    </div>
  );
}
