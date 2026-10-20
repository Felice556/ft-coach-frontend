import type { ReactNode } from 'react';
import { Area, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RegistroAllenamento } from './api';
import { migliorePerGiorno, record, testoSerie, testoVariazione, variazione, Variazione } from './calcoloProgressi';

// I colori del grafico mantengono il contrasto sulle superfici scure dell'interfaccia.
import { useColoriTema } from './tema';

interface Props {
  storico: RegistroAllenamento[];
  titolo?: string; // es. "Progressi di Marco" nella vista del trainer
}

// Freccia della tendenza: su, giù, o stabile.
function Freccia({ tendenza }: { tendenza: Variazione['tendenza'] }) {
  const d = tendenza === 'su' ? 'M12 19V5m-6 6 6-6 6 6' : tendenza === 'giu' ? 'M12 5v14m6-6-6 6-6-6' : 'M5 12h14m-6-6 6 6-6 6';
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const coloreTendenza = (t: Variazione['tendenza']) =>
  t === 'su' ? 'bg-success-soft text-success' : t === 'giu' ? 'bg-warning-soft text-warning' : 'bg-surface text-soft';

// Mini grafico (solo la linea) per la striscia riassuntiva: niente assi né numeri.
function Sparkline({ valori, colore }: { valori: number[]; colore: string }) {
  const L = 84, A = 30, m = 4;
  const min = Math.min(...valori), max = Math.max(...valori);
  const y = (v: number) => (max === min ? A / 2 : A - m - ((v - min) / (max - min)) * (A - 2 * m));
  const x = (i: number) => m + (i / (valori.length - 1)) * (L - 2 * m);
  const punti = valori.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} aria-hidden="true" className="shrink-0">
      <polyline points={punti} fill="none" stroke={colore} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(valori.length - 1)} cy={y(valori[valori.length - 1])} r="3.5" fill={colore} />
    </svg>
  );
}

// Striscia sempre visibile nella card dell'esercizio: andamento, record e mini grafico.
// Toccandola si apre lo storico carichi completo. Compare solo con almeno 2 giorni di allenamento.
export function StrisciaProgressi({ storico, aperta, onApri }: { storico: RegistroAllenamento[]; aperta: boolean; onApri: () => void }) {
  const COLORI = useColoriTema();
  const giorni = migliorePerGiorno(storico);
  const v = variazione(giorni);
  const rec = record(giorni);
  if (!v || !rec) return null;
  return (
    <button
      type="button"
      onClick={onApri}
      aria-expanded={aperta}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left transition-colors hover:border-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold uppercase tracking-wide text-ink">Storico carichi</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold ${coloreTendenza(v.tendenza)}`}>
            <Freccia tendenza={v.tendenza} />
            {testoVariazione(v)}
          </span>
          <span className="text-muted">
            Record <span className="font-semibold text-soft">{testoSerie(rec)}</span>
          </span>
        </p>
      </div>
      <Sparkline valori={giorni.map((g) => g.peso)} colore={COLORI.principale} />
      <span className="text-xs text-muted" aria-hidden="true">{aperta ? '▲' : '▼'}</span>
    </button>
  );
}

function Dato({ etichetta, valore, sotto }: { etichetta: string; valore: ReactNode; sotto?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2 px-2.5 py-2.5">
      <p className="whitespace-nowrap text-xs font-semibold text-muted">{etichetta}</p>
      <p className="mt-0.5 whitespace-nowrap text-[15px] font-extrabold leading-tight tabular-nums">{valore}</p>
      {sotto && <p className="mt-0.5 text-xs text-muted">{sotto}</p>}
    </div>
  );
}

const kg = (n: number) => `${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })} kg`;

export default function ProgressoChart({ storico, titolo = 'Storico carichi' }: Props) {
  // Colori letti dal tema attuale: il grafico cambia insieme a chiaro/scuro.
  const COLORI = useColoriTema();
  // Il cliente registra ogni serie: in un giorno ci sono più righe.
  // Per il grafico teniamo la serie migliore di ogni giorno (più peso, a parità più reps),
  // altrimenti la linea farebbe su e giù dentro la stessa giornata.
  const dati = migliorePerGiorno(storico);
  const rec = record(dati);
  const v = variazione(dati);

  if (!rec || !v) {
    // Con un solo giorno non c'è una "progressione" da disegnare.
    return (
      <p className="rounded-xl border border-line bg-surface-2 px-4 py-4 text-sm leading-relaxed text-muted">
        Lo storico carichi compare dopo almeno due giorni di allenamento su questo esercizio.
      </p>
    );
  }
  const ultimo = dati[dati.length - 1];

  // Asse Y calcolato da noi: limiti e tacche a multipli "tondi" (5 kg, o 10 se
  // l'intervallo è ampio), così le etichette sono corte e leggibili sul telefono.
  const pesi = dati.map((d) => d.peso);
  const passo = Math.max(...pesi) - Math.min(...pesi) > 40 ? 10 : 5;
  const minimoY = Math.max(0, Math.floor((Math.min(...pesi) - 1) / passo) * passo);
  const massimoY = Math.ceil((Math.max(...pesi) + 2) / passo) * passo;
  const tacche: number[] = [];
  for (let t = minimoY; t <= massimoY; t += passo) tacche.push(t);

  // Con pochi punti scriviamo il peso sopra ogni punto: si legge senza toccare il grafico.
  const mostraValori = dati.length <= 8;
  const iRecord = dati.indexOf(rec);
  const idGradiente = `area-progressi-${titolo.replace(/\W/g, '')}`;
  const testoAndamento =
    v.kg !== 0 ? `${v.kg > 0 ? '+' : '−'}${kg(Math.abs(v.kg))}` : v.reps !== 0 ? `${v.reps > 0 ? '+' : '−'}${Math.abs(v.reps)} rip.` : 'Stabile';

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface px-3 py-4 sm:px-4">
      <div className="px-1">
        <p className="text-sm font-extrabold uppercase tracking-wide text-ink">{titolo}</p>
        <p className="mt-1 text-xs text-muted">Ogni punto è la serie più pesante di quel giorno.</p>
      </div>

      {/* I tre numeri che contano, prima del grafico */}
      <div className="grid grid-cols-3 gap-2">
        <Dato etichetta="Record" valore={kg(rec.peso)} sotto={`× ${rec.reps} · ${rec.etichetta}`} />
        <Dato etichetta="Ultima volta" valore={kg(ultimo.peso)} sotto={`× ${ultimo.reps} · ${ultimo.etichetta}`} />
        <Dato
          etichetta="Andamento"
          valore={
            <span className={`inline-flex items-center gap-1 ${v.tendenza === 'su' ? 'text-success' : v.tendenza === 'giu' ? 'text-warning' : ''}`}>
              {testoAndamento}
            </span>
          }
          sotto={`dal ${v.dal}`}
        />
      </div>

      {/* ResponsiveContainer: il grafico prende sempre tutta la larghezza del telefono */}
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={dati} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORI.principale} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORI.principale} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={COLORI.griglia} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="etichetta" tick={{ fontSize: 12, fill: COLORI.testo }} stroke={COLORI.griglia} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
          <YAxis
            tick={{ fontSize: 12, fill: COLORI.testo }}
            stroke={COLORI.griglia}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[minimoY, massimoY]}
            ticks={tacche}
          />
          <Tooltip
            cursor={{ stroke: COLORI.testo, strokeDasharray: '3 3' }}
            separator=": "
            formatter={(value: number, _name, item) => [`${value.toLocaleString('it-IT')} kg × ${item.payload.reps}`, 'Serie migliore']}
            contentStyle={{
              background: COLORI.tooltip,
              border: `1px solid ${COLORI.griglia}`,
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              padding: '10px 14px',
              fontSize: 13,
              color: COLORI.inchiostro,
            }}
            labelStyle={{ color: COLORI.testo }}
            itemStyle={{ color: COLORI.inchiostro }}
          />
          <Area tooltipType="none" type="monotone" dataKey="peso" stroke="none" fill={`url(#${idGradiente})`} isAnimationActive={false} activeDot={false} />
          <Line
            type="monotone"
            dataKey="peso"
            isAnimationActive={false}
            stroke={COLORI.principale}
            strokeWidth={3}
            // Il record ha un punto più grande, con l'anello colorato
            dot={(p: { cx?: number; cy?: number; index?: number }) => (
              <circle
                key={`punto-${p.index}`}
                cx={p.cx}
                cy={p.cy}
                r={p.index === iRecord ? 7 : 4}
                fill={p.index === iRecord ? COLORI.successo : COLORI.principale}
                stroke={COLORI.sfondo}
                strokeWidth={2}
              />
            )}
            activeDot={{ r: 6, fill: COLORI.principale, stroke: COLORI.sfondo, strokeWidth: 2 }}
          >
            {mostraValori && (
              <LabelList
                dataKey="peso"
                position="top"
                offset={12}
                formatter={(val: number) => val.toLocaleString('it-IT')}
                style={{ fontSize: 12, fontWeight: 700, fill: COLORI.inchiostro }}
              />
            )}
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
      <p className="flex items-center gap-2 px-1 text-xs text-muted">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLORI.successo }} />
        Il punto verde è il tuo record.
      </p>
    </div>
  );
}
