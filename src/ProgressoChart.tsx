import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RegistroAllenamento } from './api';

// I colori del grafico mantengono il contrasto sulle superfici scure dell'interfaccia.
import { useColoriTema } from './tema';

interface Props {
  storico: RegistroAllenamento[];
}

export default function ProgressoChart({ storico }: Props) {
  // Colori letti dal tema attuale: il grafico cambia insieme a chiaro/scuro.
  const COLORI = useColoriTema();
  // Ora il cliente registra ogni serie: in un giorno ci sono più righe.
  // Per il grafico teniamo la serie più pesante di ogni giorno ("miglior serie"),
  // altrimenti la linea farebbe su e giù dentro la stessa giornata.
  const perGiorno = new Map<string, { data: string; peso: number; reps: number }>();
  for (const r of storico) {
    const giorno = new Date(r.data);
    const chiave = giorno.toDateString();
    const attuale = perGiorno.get(chiave);
    if (!attuale || r.pesoUsato > attuale.peso) {
      perGiorno.set(chiave, {
        data: giorno.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        peso: r.pesoUsato,
        reps: r.repsFatte,
      });
    }
  }
  const dati = [...perGiorno.values()];

  // Asse Y calcolato da noi: limiti e tacche a multipli "tondi" (5 kg, o 10 se
  // l'intervallo è ampio), così le etichette sono corte e leggibili sul telefono.
  const pesi = dati.map((d) => d.peso);
  const passo = Math.max(...pesi) - Math.min(...pesi) > 40 ? 10 : 5;
  const minimoY = Math.max(0, Math.floor((Math.min(...pesi) - 1) / passo) * passo);
  const massimoY = Math.ceil((Math.max(...pesi) + 1) / passo) * passo;
  const tacche: number[] = [];
  for (let v = minimoY; v <= massimoY; v += passo) tacche.push(v);

  if (dati.length < 2) {
    // Con un solo giorno non c'è una "progressione" da disegnare.
    return (
      <p className="rounded-xl border border-line bg-surface-2 px-4 py-4 text-sm leading-relaxed text-muted">
        Il grafico compare dopo almeno due giorni di allenamento su questo esercizio.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface px-2 py-4 sm:px-4">
      <div className="mb-5 px-2">
        <p className="text-sm font-extrabold uppercase tracking-wide text-ink">I tuoi progressi</p>
        <p className="mt-1 text-xs text-muted">Miglior serie del giorno, in kg</p>
      </div>
      {/* ResponsiveContainer: il grafico prende sempre tutta la larghezza del telefono */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dati} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLORI.griglia} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="data" tick={{ fontSize: 12, fill: COLORI.testo }} stroke={COLORI.griglia} tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} />
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
            formatter={(value: number, _name, item) => [
              `${value.toLocaleString('it-IT')} kg × ${item.payload.reps}`,
              'Miglior serie',
            ]}
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
          <Line
            type="monotone"
            dataKey="peso"
            isAnimationActive={false}
            stroke={COLORI.linea}
            strokeWidth={3}
            dot={{ r: 4, fill: COLORI.linea, stroke: COLORI.sfondo, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: COLORI.linea, stroke: COLORI.sfondo, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
