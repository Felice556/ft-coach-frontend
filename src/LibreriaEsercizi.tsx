import { useId, useState } from 'react';
import type { EsercizioPreset, GruppoMuscolare } from './api';
import { cercaEsercizi, GRUPPI, nomeGruppo, perGruppo } from './libreria';

// ---------- Nome esercizio con suggerimenti dalla libreria ----------
// Scrivi qualche lettera ("pan pi") e sotto compaiono gli esercizi salvati che corrispondono.
// Toccandone uno si riempiono nome, video e note (se erano vuoti).

export function CampoNomeEsercizio({
  valore,
  preset,
  onChange,
  onScegli,
}: {
  valore: string;
  preset: EsercizioPreset[];
  onChange: (v: string) => void;
  onScegli: (p: EsercizioPreset) => void;
}) {
  const id = useId();
  const [aperto, setAperto] = useState(false);
  const [attivo, setAttivo] = useState(0);
  const suggerimenti = cercaEsercizi(preset, valore).filter((p) => p.nome !== valore.trim());
  const mostra = aperto && suggerimenti.length > 0;

  function scegli(p: EsercizioPreset) {
    onScegli(p);
    setAperto(false);
  }

  return (
    <div className="relative">
      <input
        className="input"
        placeholder="Nome esercizio"
        maxLength={100}
        required
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={mostra}
        aria-controls={`${id}-lista`}
        autoComplete="off"
        value={valore}
        onChange={(e) => {
          onChange(e.target.value);
          setAperto(true);
          setAttivo(0);
        }}
        onFocus={() => setAperto(true)}
        // piccolo ritardo: lascia arrivare il tocco sul suggerimento prima di chiudere
        onBlur={() => setTimeout(() => setAperto(false), 120)}
        onKeyDown={(e) => {
          if (!mostra) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAttivo((a) => (a + 1) % suggerimenti.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAttivo((a) => (a - 1 + suggerimenti.length) % suggerimenti.length);
          } else if (e.key === 'Enter') {
            e.preventDefault(); // Invio sceglie il suggerimento, non invia la scheda
            scegli(suggerimenti[attivo]);
          } else if (e.key === 'Escape') {
            setAperto(false);
          }
        }}
      />
      {mostra && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          aria-label="Esercizi salvati"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          {suggerimenti.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === attivo}>
              <button
                type="button"
                className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                  i === attivo ? 'bg-accent-soft' : 'hover:bg-surface-2'
                }`}
                // mousedown invece di click: arriva prima che il campo perda il focus
                onMouseDown={(e) => {
                  e.preventDefault();
                  scegli(p);
                }}
              >
                <span className="min-w-0 truncate font-medium">{p.nome}</span>
                <span className="shrink-0 text-xs text-muted">{nomeGruppo(p.gruppo)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Scelta del gruppo muscolare (quando si salva un esercizio in libreria) ----------

export function SceltaGruppo({ onScegli, onAnnulla }: { onScegli: (g: GruppoMuscolare) => void; onAnnulla: () => void }) {
  return (
    <div className="mb-3 rounded-xl border border-accent-strong/50 bg-accent-soft p-3">
      <p className="mb-2 text-sm font-semibold">In che gruppo muscolare lo salvo?</p>
      <div className="flex flex-wrap gap-2">
        {GRUPPI.map((g) => (
          <button key={g.valore} type="button" className="btn-secondary min-h-10 px-3 text-sm" onClick={() => onScegli(g.valore)}>
            {g.nome}
          </button>
        ))}
        <button type="button" className="btn-ghost min-h-10 px-3 text-sm text-muted" onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </div>
  );
}

// ---------- Libreria laterale, divisa per gruppi muscolari ----------

export function PannelloLibreria({
  preset,
  onAggiungi,
  onCambiaGruppo,
  onElimina,
}: {
  preset: EsercizioPreset[];
  onAggiungi: (p: EsercizioPreset) => void;
  onCambiaGruppo: (p: EsercizioPreset, g: GruppoMuscolare | null) => void;
  onElimina: (p: EsercizioPreset) => void;
}) {
  const [cerca, setCerca] = useState('');
  const [gestisci, setGestisci] = useState(false);
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  const filtrati = cerca.trim() ? cercaEsercizi(preset, cerca, 100) : preset;
  const sezioni = perGruppo(filtrati);

  const apriChiudi = (nome: string) =>
    setChiusi((prev) => {
      const nuovo = new Set(prev);
      if (nuovo.has(nome)) nuovo.delete(nome);
      else nuovo.add(nome);
      return nuovo;
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">Libreria esercizi</p>
        {preset.length > 0 && (
          <button type="button" className="btn-ghost min-h-9 px-2 text-xs" aria-pressed={gestisci} onClick={() => setGestisci(!gestisci)}>
            {gestisci ? 'Fatto' : 'Gestisci'}
          </button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted">{gestisci ? 'Cambia gruppo o togli un esercizio.' : 'Tocca un esercizio per aggiungerlo alla scheda.'}</p>
      {preset.length > 0 && (
        <input
          className="input mt-3"
          type="search"
          placeholder="Cerca…"
          aria-label="Cerca nella libreria"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
      )}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {preset.length === 0 ? (
          <p className="text-sm text-muted">
            Vuota. Scrivi un esercizio nella scheda e premi “Salva esercizio” per riusarlo le prossime volte.
          </p>
        ) : sezioni.length === 0 ? (
          <p className="text-sm text-muted">Nessun esercizio trovato.</p>
        ) : (
          sezioni.map((s) => {
            const chiuso = chiusi.has(s.nome) && !cerca.trim();
            return (
              <section key={s.nome} className="mb-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-1.5 text-left text-xs font-bold tracking-wide text-accent-strong uppercase"
                  aria-expanded={!chiuso}
                  onClick={() => apriChiudi(s.nome)}
                >
                  <span>
                    {s.nome} <span className="font-medium text-muted">({s.esercizi.length})</span>
                  </span>
                  <span aria-hidden>{chiuso ? '▸' : '▾'}</span>
                </button>
                {!chiuso && (
                  <ul className="space-y-1">
                    {s.esercizi.map((p) => (
                      <li key={p.id}>
                        {gestisci ? (
                          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 p-1.5">
                            <span className="min-w-0 flex-1 truncate px-1 text-sm">{p.nome}</span>
                            <select
                              className="min-h-9 shrink-0 rounded-md border border-line bg-surface px-1 text-xs"
                              aria-label={`Gruppo di ${p.nome}`}
                              value={p.gruppo ?? ''}
                              onChange={(e) => onCambiaGruppo(p, (e.target.value || null) as GruppoMuscolare | null)}
                            >
                              <option value="">Senza gruppo</option>
                              {GRUPPI.map((g) => (
                                <option key={g.valore} value={g.valore}>
                                  {g.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              aria-label={`Togli ${p.nome} dalla libreria`}
                              className="min-h-9 w-9 shrink-0 rounded-md text-muted transition hover:bg-danger-soft hover:text-danger"
                              onClick={() => onElimina(p)}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-accent hover:text-accent-ink"
                            onClick={() => onAggiungi(p)}
                          >
                            <span aria-hidden className="text-accent-strong">+</span>
                            <span className="min-w-0 truncate">{p.nome}</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
