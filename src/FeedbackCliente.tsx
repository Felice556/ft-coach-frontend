import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getSessioni, SessioneAllenamento } from './api';
import { useColoriTema } from './tema';
import { locale, tr } from './lingua';

// Feedback dei clienti a fine allenamento: voto di fatica (1-10) e nota.

// Una parola per ogni voto, così il numero ha un significato chiaro per tutti.
export function testoFatica(n: number): string {
  if (n <= 2) return tr('Facile', 'Easy');
  if (n <= 4) return tr('Leggero', 'Light');
  if (n <= 6) return tr('Impegnativo', 'Challenging');
  if (n <= 8) return tr('Duro', 'Hard');
  if (n === 9) return tr('Durissimo', 'Very hard');
  return tr('Al limite', 'Maximal');
}

// Colore del voto: verde se leggero, giallo se impegnativo, rosso se al limite.
function coloreFatica(n: number): string {
  if (n <= 4) return 'bg-success-soft text-success';
  if (n <= 7) return 'bg-warning-soft text-warning';
  return 'bg-danger-soft text-danger';
}

export function ChipFatica({ fatica }: { fatica: number }) {
  return (
    <span className={`chip max-w-full tabular-nums ${coloreFatica(fatica)}`}>
      {tr('Fatica', 'Effort')} {fatica}/10 · {testoFatica(fatica)}
    </span>
  );
}

// Dieci bottoni grandi (due righe da 5): si sceglie col pollice. Toccare di nuovo lo stesso voto lo toglie.
export function SceltaFatica({ valore, onChange }: { valore: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={tr('Fatica da 1 a 10', 'Effort from 1 to 10')}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valore === n}
            aria-label={`${n}: ${testoFatica(n)}`}
            className={`min-h-12 rounded-xl border text-lg font-black tabular-nums transition ${
              valore === n ? 'border-accent-strong bg-accent text-accent-ink' : 'border-line bg-surface hover:border-accent-strong/60'
            }`}
            onClick={() => onChange(valore === n ? null : n)}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-2 flex justify-between text-xs text-muted">
        <span>{tr('1 = facilissimo', '1 = very easy')}</span>
        <span className="font-semibold text-ink">{valore ? testoFatica(valore) : ''}</span>
        <span>{tr('10 = al limite', '10 = maximal')}</span>
      </p>
    </div>
  );
}

function GraficoFatica({ sessioni }: { sessioni: SessioneAllenamento[] }) {
  const COLORI = useColoriTema();
  const dati = sessioni
    .filter((s) => s.fatica != null)
    .reverse() // dal più vecchio, come in ogni grafico nel tempo
    .map((s) => ({
      data: new Date(s.completataIl).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
      fatica: s.fatica as number,
      scheda: s.scheda.nome,
    }));
  if (dati.length < 2) {
    return (
      <p className="rounded-xl border border-line bg-surface-2 px-4 py-4 text-sm leading-relaxed text-muted">
        {tr('Il grafico compare dal secondo allenamento con un voto.', 'The chart appears from the second workout with a rating.')}
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-surface px-2 py-4 sm:px-4">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={dati} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COLORI.griglia} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="data" tick={{ fontSize: 12, fill: COLORI.testo }} stroke={COLORI.griglia} tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} />
          <YAxis
            tick={{ fontSize: 12, fill: COLORI.testo }}
            stroke={COLORI.griglia}
            tickLine={false}
            axisLine={false}
            width={32}
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
          />
          <Tooltip
            cursor={{ stroke: COLORI.testo, strokeDasharray: '3 3' }}
            separator=": "
            formatter={(value: number, _nome, item) => [`${value}/10 · ${testoFatica(value)}`, item.payload.scheda]}
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
            dataKey="fatica"
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

// Sezione del trainer, quando sceglie un cliente: andamento della fatica e ultime note.
export default function FeedbackCliente({ clienteId, nomeCliente }: { clienteId: number; nomeCliente: string }) {
  const [sessioni, setSessioni] = useState<SessioneAllenamento[] | null>(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    let attivo = true;
    getSessioni(clienteId)
      .then((dati) => attivo && setSessioni(dati))
      .catch((err) => attivo && setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento', 'Loading error')));
    return () => {
      attivo = false;
    };
  }, [clienteId]);

  const conFeedback = (sessioni ?? []).filter((s) => s.fatica != null || s.nota);

  return (
    <section className="card mt-4 space-y-4" aria-labelledby="feedback-titolo">
      <div>
        <p className="eyebrow mb-1">Feedback · {nomeCliente}</p>
        <h2 id="feedback-titolo" className="section-title">{tr('Come vanno gli allenamenti', 'How workouts are going')}</h2>
        <p className="mt-1 text-sm text-muted">{tr('Fatica e note che il cliente lascia a fine allenamento.', 'Effort and notes the client leaves at the end of a workout.')}</p>
      </div>
      {errore && <p className="alert-error">{errore}</p>}
      {sessioni === null && !errore && <p className="text-sm text-muted">{tr('Carico…', 'Loading…')}</p>}
      {sessioni !== null && conFeedback.length === 0 && (
        <p className="empty-state">{tr('Nessun feedback ancora: compare quando il cliente lo lascia a fine allenamento.', 'No feedback yet: it appears when the client leaves it at the end of a workout.')}</p>
      )}
      {conFeedback.length > 0 && (
        <>
          <GraficoFatica sessioni={conFeedback} />
          <ul className="divide-y divide-line">
            {conFeedback.slice(0, 5).map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted">
                    {new Date(s.completataIl).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' })} · {s.scheda.nome}
                  </span>
                  {s.fatica != null && <ChipFatica fatica={s.fatica} />}
                </div>
                {s.nota && <p className="mt-1 text-sm italic leading-snug text-soft break-words">“{s.nota}”</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
