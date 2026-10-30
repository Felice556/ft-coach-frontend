import { useId, useState } from 'react';
import type { EsercizioPreset, GruppoMuscolare } from './api';
import { cercaConGenerali, cercaEsercizi, GRUPPI, nomeGruppo, perGruppo } from './libreria';
import IconaGruppo from './IconaGruppo';
import { tr } from './lingua';

// ---------- Nome esercizio con suggerimenti dalla libreria ----------
// Scrivi qualche lettera ("pan pi") e sotto compaiono gli esercizi salvati che corrispondono
// (prima i tuoi, poi quelli della libreria generale di Liftio).
// Toccandone uno si riempiono nome, video e note (se erano vuoti).

export function CampoNomeEsercizio({
  valore,
  preset,
  generali = [],
  onChange,
  onScegli,
  idCampo,
  placeholder = tr('Nome esercizio', 'Exercise name'),
}: {
  valore: string;
  preset: EsercizioPreset[];
  generali?: EsercizioPreset[];
  onChange: (v: string) => void;
  onScegli: (p: EsercizioPreset) => void;
  idCampo?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [aperto, setAperto] = useState(false);
  const [attivo, setAttivo] = useState(0);
  const suggerimenti = cercaConGenerali(preset, generali, valore).filter((p) => p.nome !== valore.trim());
  const mostra = aperto && suggerimenti.length > 0;

  function scegli(p: EsercizioPreset) {
    onScegli(p);
    setAperto(false);
  }

  return (
    <div className="relative">
      <input
        id={idCampo}
        className="input"
        placeholder={placeholder}
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
          aria-label={tr('Esercizi salvati', 'Saved exercises')}
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
                <span className="flex min-w-0 items-center gap-2">
                  <IconaGruppo gruppo={p.gruppo} className="h-5 w-5 text-accent-strong" />
                  <span className="min-w-0 truncate font-medium">{p.nome}</span>
                </span>
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
      <p className="mb-2 text-sm font-semibold">{tr('In che gruppo muscolare lo salvo?', 'Which muscle group should I save it in?')}</p>
      <div className="flex flex-wrap gap-2">
        {GRUPPI.map((g) => (
          <button key={g.valore} type="button" className="btn-secondary min-h-10 gap-1.5 px-3 text-sm" onClick={() => onScegli(g.valore)}>
            <IconaGruppo gruppo={g.valore} className="h-5 w-5 text-accent-strong" />
            {g.nome}
          </button>
        ))}
        <button type="button" className="btn-ghost min-h-10 px-3 text-sm text-muted" onClick={onAnnulla}>
          {tr('Annulla', 'Cancel')}
        </button>
      </div>
    </div>
  );
}

// ---------- Libreria laterale, divisa per gruppi muscolari ----------

// Con "generali": due schede, "I miei" (la libreria del trainer) e "Liftio" (quella generale).
// Senza onCambiaGruppo/onElimina (chi si allena da solo) c'è solo la libreria generale, da sfogliare.
export function PannelloLibreria({
  preset,
  generali,
  onAggiungi,
  onCambiaGruppo,
  onElimina,
}: {
  preset: EsercizioPreset[];
  generali?: EsercizioPreset[];
  onAggiungi: (p: EsercizioPreset) => void;
  onCambiaGruppo?: (p: EsercizioPreset, g: GruppoMuscolare | null) => void;
  onElimina?: (p: EsercizioPreset) => void;
}) {
  const [cerca, setCerca] = useState('');
  const [gestisci, setGestisci] = useState(false);
  const [chiusi, setChiusi] = useState<Set<string>>(new Set());
  const conGenerali = !!generali && generali.length > 0;
  const soloGenerale = !onCambiaGruppo || !onElimina;
  // Si parte dai propri esercizi se ce ne sono, altrimenti dalla libreria generale.
  const [vista, setVista] = useState<'miei' | 'generale'>(soloGenerale || preset.length === 0 ? 'generale' : 'miei');
  const suGenerale = conGenerali && (soloGenerale || vista === 'generale');
  const elenco = suGenerale ? generali! : preset;
  const gestibile = !suGenerale && !soloGenerale;
  const filtrati = cerca.trim() ? cercaEsercizi(elenco, cerca, 200) : elenco;
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
        <p className="font-bold">{tr('Libreria esercizi', 'Exercise library')}</p>
        {gestibile && preset.length > 0 && (
          <button type="button" className="btn-ghost min-h-9 px-2 text-xs" aria-pressed={gestisci} onClick={() => setGestisci(!gestisci)}>
            {gestisci ? tr('Fatto', 'Done') : tr('Gestisci', 'Manage')}
          </button>
        )}
      </div>
      {conGenerali && !soloGenerale && (
        <div className="mt-2 flex gap-1.5" role="tablist">
          {(
            [
              ['miei', tr(`I miei (${preset.length})`, `Mine (${preset.length})`)],
              ['generale', `Liftio (${generali!.length})`],
            ] as const
          ).map(([v, testo]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={vista === v}
              className={`min-h-9 flex-1 rounded-lg border px-2 text-xs font-bold transition ${
                vista === v ? 'border-accent-strong bg-accent text-accent-ink' : 'border-line bg-field text-ink hover:border-accent-strong'
              }`}
              onClick={() => {
                setVista(v);
                setGestisci(false);
              }}
            >
              {testo}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-xs text-muted">
        {gestisci
          ? tr('Cambia gruppo o togli un esercizio.', 'Change the group or remove an exercise.')
          : suGenerale
            ? tr('Esercizi comuni, già pronti. Tocca un esercizio per aggiungerlo alla scheda.', 'Common exercises, ready to use. Tap one to add it to the programme.')
            : tr('Tocca un esercizio per aggiungerlo alla scheda.', 'Tap an exercise to add it to the programme.')}
      </p>
      {elenco.length > 0 && (
        <input
          className="input mt-3"
          type="search"
          placeholder={tr('Cerca…', 'Search…')}
          aria-label={tr('Cerca nella libreria', 'Search the library')}
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
      )}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {elenco.length === 0 ? (
          <p className="text-sm text-muted">
            {tr('Vuota. Scrivi un esercizio nella scheda e premi “Salva esercizio” per riusarlo le prossime volte.', 'Empty. Type an exercise in the programme and press “Save exercise” to reuse it next time.')}
          </p>
        ) : sezioni.length === 0 ? (
          <p className="text-sm text-muted">{tr('Nessun esercizio trovato.', 'No exercises found.')}</p>
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
                  <span className="flex items-center gap-2">
                    <IconaGruppo gruppo={s.valore} className="h-5 w-5" />
                    <span>
                      {s.nome} <span className="font-medium text-muted">({s.esercizi.length})</span>
                    </span>
                  </span>
                  <span aria-hidden>{chiuso ? '▸' : '▾'}</span>
                </button>
                {!chiuso && (
                  <ul className="space-y-1">
                    {s.esercizi.map((p) => (
                      <li key={p.id}>
                        {gestisci && gestibile ? (
                          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 p-1.5">
                            <span className="min-w-0 flex-1 truncate px-1 text-sm">{p.nome}</span>
                            <select
                              className="min-h-9 shrink-0 rounded-md border border-line bg-surface px-1 text-xs"
                              aria-label={tr(`Gruppo di ${p.nome}`, `Group of ${p.nome}`)}
                              value={p.gruppo ?? ''}
                              onChange={(e) => onCambiaGruppo!(p, (e.target.value || null) as GruppoMuscolare | null)}
                            >
                              <option value="">{tr('Senza gruppo', 'No group')}</option>
                              {/* Il vecchio "Braccia" compare solo per gli esercizi che sono ancora lì */}
                              {p.gruppo === 'BRACCIA' && <option value="BRACCIA">{nomeGruppo('BRACCIA')}</option>}
                              {GRUPPI.map((g) => (
                                <option key={g.valore} value={g.valore}>
                                  {g.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              aria-label={tr(`Togli ${p.nome} dalla libreria`, `Remove ${p.nome} from the library`)}
                              className="min-h-9 w-9 shrink-0 rounded-md text-muted transition hover:bg-danger-soft hover:text-danger"
                              onClick={() => onElimina!(p)}
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
