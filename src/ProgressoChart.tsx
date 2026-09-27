import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RegistroAllenamento } from './api';

interface Props {
  storico: RegistroAllenamento[];
}

// Trasforma i dati grezzi dell'API (data ISO + pesoUsato) nel formato
// che Recharts si aspetta: un array di punti con un'etichetta leggibile.
export default function ProgressoChart({ storico }: Props) {
  if (storico.length < 2) {
    // Con 0 o 1 punto una linea non ha senso da disegnare (non c'è "progressione"
    // da mostrare) — meglio dirlo chiaramente che disegnare un grafico vuoto/piatto.
    return (
      <p className="px-1 py-2 text-sm text-neutral-500">
        Servono almeno due allenamenti registrati per vedere il grafico di progressione.
      </p>
    );
  }

  const dati = storico.map((r) => ({
    data: new Date(r.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    peso: r.pesoUsato,
  }));

  return (
    // ResponsiveContainer fa sì che il grafico si adatti sempre alla larghezza
    // dello schermo (fondamentale visto che l'app gira soprattutto da telefono).
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={dati} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="data" tick={{ fontSize: 12 }} stroke="#a3a3a3" />
        <YAxis tick={{ fontSize: 12 }} stroke="#a3a3a3" width={40} />
        <Tooltip
          formatter={(value: number) => [`${value}kg`, 'Peso']}
          contentStyle={{ borderRadius: 8, fontSize: 13 }}
        />
        <Line
          type="monotone"
          dataKey="peso"
          stroke="#facc15"
          strokeWidth={3}
          dot={{ fill: '#171717', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
