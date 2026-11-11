import type { ReactNode } from 'react';
import { locale, tr } from './lingua';
import { testoReps, type GruppoSerie } from './serie';

// Pezzi grafici per leggere le serie a colpo d'occhio, nello stile di Liftio:
// - la barra del programma (Serie · Ripetizioni · Recupero) in cima a ogni esercizio;
// - la tabella delle serie fatte (# · Peso · Reps), con la stella sulle serie record;
// - l'intestazione di un giorno di allenamento (data, volume, record).

const Icona = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Stella = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="currentColor" aria-hidden="true">
    <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
  </svg>
);

// ---------- Barra del programma ----------

// Recupero in grande: 120 → "2" min, 90 → "1:30" min, 45 → "45" s, 0 → "No".
export function recuperoInGrande(secondi: number): { valore: string; unita: string } {
  if (secondi <= 0) return { valore: tr('No', 'No'), unita: '' };
  if (secondi < 60) return { valore: String(secondi), unita: 's' };
  const m = Math.floor(secondi / 60);
  const s = secondi % 60;
  return { valore: s ? `${m}:${String(s).padStart(2, '0')}` : String(m), unita: 'min' };
}

// "6-9 + rp 15s" → numero "6-9" in grande e la tecnica "+ rp 15s" piccola sotto (cluster: "5+5+5+5" e "+ pausa 10s").
function dividiTecnica(ripetizioni: string): { base: string; tecnica: string | null } {
  const i = ripetizioni.indexOf(' + ');
  return i < 0 ? { base: ripetizioni, tecnica: null } : { base: ripetizioni.slice(0, i), tecnica: ripetizioni.slice(i + 1) };
}

export function TessereEsercizio({
  serie,
  ripetizioni,
  recuperoSecondi,
  senzaRecupero = false,
}: {
  serie: number;
  ripetizioni: string;
  recuperoSecondi: number;
  senzaRecupero?: boolean; // superset: si passa subito al prossimo esercizio
}) {
  const rec = recuperoInGrande(recuperoSecondi);
  const { base, tecnica } = dividiTecnica(ripetizioni);
  const parte = (icona: ReactNode, etichetta: string, valore: ReactNode, sotto?: ReactNode, piccolo = false) => (
    <div className="min-w-0 flex-1 px-3.5 py-3">
      <p className="flex items-center gap-1 text-[0.66rem] font-bold tracking-[0.14em] text-accent-strong uppercase">
        {icona}
        {etichetta}
      </p>
      <p className={`mt-1 leading-none font-black tracking-tight text-ink tabular-nums ${piccolo ? 'text-lg' : 'text-[1.65rem]'}`}>{valore}</p>
      {sotto && <p className="mt-1 truncate text-xs font-semibold text-soft">{sotto}</p>}
    </div>
  );
  return (
    <div className="flex divide-x divide-line overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-surface-2 shadow-sm">
      {parte(
        <Icona>
          <path d="M4 7h11M4 12h11M4 17h11" />
          <path d="m18 15 2 2 3-4" />
        </Icona>,
        tr('Serie', 'Sets'),
        serie,
      )}
      {parte(
        <Icona>
          <path d="M5 8v8M19 8v8M2.5 10v4M21.5 10v4M5 12h14" />
        </Icona>,
        tr('Reps', 'Reps'),
        base,
        tecnica,
        base.length > 7, // cluster lunghi ("5+5+5+5+5"): più piccoli, così stanno nella tessera
      )}
      {parte(
        <Icona>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5M9.5 2.5h5" />
        </Icona>,
        tr('Recupero', 'Rest'),
        senzaRecupero ? (
          <span className="text-lg">{tr('subito', 'none')}</span>
        ) : (
          <>
            {rec.valore}
            {rec.unita && <span className="ml-0.5 text-sm font-bold text-muted">{rec.unita}</span>}
          </>
        ),
        senzaRecupero ? tr('superset', 'superset') : undefined,
      )}
    </div>
  );
}

// Programma con serie diverse (top set + back-off, piramidali, serie aggiunte): una riga per ogni
// gruppo di serie uguali, con ripetizioni e recupero di quel gruppo. La riga della serie da fare ora
// è evidenziata, quelle già fatte hanno la spunta.
export function ProgrammaSerie({ gruppi, fatte, senzaRecupero = false }: { gruppi: GruppoSerie[]; fatte: number; senzaRecupero?: boolean }) {
  const titolo = 'text-[0.66rem] font-bold tracking-[0.14em] text-accent-strong uppercase';
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-accent-soft to-surface-2 shadow-sm">
      <div className={`grid grid-cols-[4.5rem_1fr_6rem] border-b border-line ${titolo}`}>
        <span className="px-3.5 py-2">{tr('Serie', 'Sets')}</span>
        <span className="px-3.5 py-2">{tr('Reps', 'Reps')}</span>
        <span className="px-3.5 py-2">{tr('Recupero', 'Rest')}</span>
      </div>
      <ul className="divide-y divide-line">
        {gruppi.map((gr) => {
          const s = gr.serie;
          const { base, tecnica } = dividiTecnica(testoReps(s.reps, s.repsMax, s.piuMax, s.rpSecondi, s.cluster));
          const finito = fatte >= gr.da + gr.quante;
          const ora = !finito && fatte >= gr.da;
          const rec = recuperoInGrande(s.recuperoSecondi);
          return (
            <li key={gr.da} className={ora ? 'bg-accent-soft shadow-[inset_4px_0_0_var(--color-accent)]' : ''} aria-current={ora ? 'step' : undefined}>
              <div className={`grid grid-cols-[4.5rem_1fr_6rem] items-baseline ${finito ? 'opacity-55' : ''}`}>
                <span className="flex items-baseline gap-1 px-3.5 py-2.5 text-xl font-black text-ink tabular-nums">
                  {gr.quante}
                  <span className="text-xs font-bold text-muted">×</span>
                  {finito && <span className="ml-0.5 text-sm text-success">✓</span>}
                </span>
                <span className="min-w-0 px-3.5 py-2.5">
                  <span className="text-xl font-black text-ink tabular-nums">{base}</span>
                  {tecnica && <span className="ml-1.5 text-xs font-semibold text-soft">{tecnica}</span>}
                  {ora && <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 align-middle text-[0.62rem] font-bold tracking-wider text-accent-ink uppercase">{tr('ora', 'now')}</span>}
                </span>
                <span className="px-3.5 py-2.5 text-xl font-black text-ink tabular-nums">
                  {senzaRecupero ? (
                    <span className="text-base">{tr('subito', 'none')}</span>
                  ) : (
                    <>
                      {rec.valore}
                      {rec.unita && <span className="ml-0.5 text-xs font-bold text-muted">{rec.unita}</span>}
                    </>
                  )}
                </span>
              </div>
              {s.nota && <p className={`px-3.5 pb-2 -mt-1 text-xs text-soft italic ${finito ? 'opacity-55' : ''}`}>{s.nota}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Tabella delle serie fatte ----------

// Colonne: # · Peso · Reps · (azioni, se si possono correggere)
export const colonneSerie = (conAzioni: boolean) => (conAzioni ? 'grid-cols-[2.75rem_1.15fr_1fr_4.75rem]' : 'grid-cols-[2.75rem_1.15fr_1fr]');

export function TabellaSerie({
  children,
  primaColonna = '#',
  conAzioni = false,
}: {
  children: ReactNode;
  primaColonna?: string;
  conAzioni?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div
        className={`grid ${colonneSerie(conAzioni)} border-b border-line bg-surface-2/60 text-[0.66rem] font-bold tracking-[0.14em] text-muted uppercase`}
        aria-hidden="true"
      >
        <span className="py-2 text-center">{primaColonna}</span>
        <span className="py-2 pl-1">{tr('Peso', 'Weight')}</span>
        <span className="py-2 pl-1">{tr('Reps', 'Reps')}</span>
        {conAzioni && <span />}
      </div>
      <ul className="divide-y divide-line">{children}</ul>
    </div>
  );
}

// Le tre celle di una riga (numero, peso, ripetizioni): uguali per le righe correggibili e per quelle solo da leggere.
// Le serie record hanno il numero dorato e la stella accanto al peso.
export function CelleSerie({ prima, kg, reps, record = false }: { prima: string; kg: string; reps: number; record?: boolean }) {
  return (
    <>
      <span className="flex justify-center py-2.5">
        <span
          className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-bold tabular-nums ${
            record ? 'bg-oro text-oro-ink' : 'bg-accent-soft text-accent'
          }`}
        >
          {prima}
        </span>
      </span>
      <span className="flex items-baseline gap-1 py-2.5 pl-1 text-lg font-extrabold text-ink tabular-nums">
        {kg}
        <span className="text-xs font-bold text-muted">kg</span>
        {record && (
          <span className="self-center text-accent-strong" title={tr('Nuovo record', 'New best')}>
            <Stella />
          </span>
        )}
      </span>
      <span className="py-2.5 pl-1 text-lg font-extrabold text-ink tabular-nums">
        <span className="mr-0.5 text-xs font-bold text-muted">×</span>
        {reps}
      </span>
    </>
  );
}

// Riga solo da leggere (storico del trainer, storico pesi generale).
export function RigaSerie({ prima, kg, reps, nota, record }: { prima: string; kg: string; reps: number; nota?: string | null; record?: boolean }) {
  return (
    <li className={record ? 'bg-accent-soft/40' : ''}>
      <div className={`grid ${colonneSerie(false)} items-center`}>
        <CelleSerie prima={prima} kg={kg} reps={reps} record={record} />
      </div>
      {nota && <p className="border-t border-line px-3 py-2 text-xs text-muted italic">“{nota}”</p>}
    </li>
  );
}

// ---------- Intestazione di un giorno ----------

const numero = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });

// "giovedì 29 ottobre" · 2 serie · 937,5 kg di volume · ★ nuovo record
export function IntestazioneGiorno({ titolo, sottotitolo, serie, volumeKg, record }: { titolo: string; sottotitolo?: string; serie: number; volumeKg: number; record: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 px-1">
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-ink first-letter:uppercase">{titolo}</p>
        <p className="text-xs text-muted">
          {sottotitolo && <>{sottotitolo} · </>}
          {serie === 1 ? tr('1 serie', '1 set') : tr(`${serie} serie`, `${serie} sets`)}
          {volumeKg > 0 && <> · {tr(`${numero(volumeKg)} kg di volume`, `${numero(volumeKg)} kg volume`)}</>}
        </p>
      </div>
      <MedagliaRecord quanti={record} />
    </div>
  );
}

// Stellina con "nuovo record" (o "2 nuovi record") per un giorno in cui si è battuto il proprio meglio.
export function MedagliaRecord({ quanti }: { quanti: number }) {
  if (quanti <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent-strong/40 px-2 py-0.5 text-xs font-bold text-accent-strong">
      <Stella />
      {quanti === 1 ? tr('nuovo record', 'new best') : tr(`${quanti} nuovi record`, `${quanti} new bests`)}
    </span>
  );
}
