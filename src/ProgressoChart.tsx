import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RegistroAllenamento } from './api';

// Recharts disegna in SVG e non legge le classi Tailwind: ripetiamo qui
// gli stessi valori dei token definiti in index.css.
const COLORI = {
  linea: '#facc15', // accent
  sfondo: '#17171a', // surface (anello attorno ai punti)
  griglia: '#2e2e33', // line
  testo: '#a1a1aa', // muted
  tooltip: '#222226', // surface-2
  inchiostro: '#f5f5f4', // ink
};

interface Props {
  storico: RegistroAllenamento[];
}

export default function ProgressoChart({ storico }: Props) {
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
      <p className="rounded-xl bg-surface-2 px-3 py-3 text-sm text-muted">
        Il grafico compare dopo almeno due giorni di allenamento su questo esercizio.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Miglior serie del giorno (kg)</p>
      {/* ResponsiveContainer: il grafico prende sempre tutta la larghezza del telefono */}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={dati} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLORI.griglia} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="data" tick={{ fontSize: 12, fill: COLORI.testo }} stroke={COLORI.griglia} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: COLORI.testo }}
            stroke={COLORI.griglia}
            tickLine={false}
            axisLine={false}
            width={36}
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
              borderRadius: 10,
              fontSize: 13,
              color: COLORI.inchiostro,
            }}
            labelStyle={{ color: COLORI.testo }}
            itemStyle={{ color: COLORI.inchiostro }}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke={COLORI.linea}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORI.linea, stroke: COLORI.sfondo, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: COLORI.linea, stroke: COLORI.sfondo, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
