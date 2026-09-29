import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { eliminaMisura, getMisure, MisuraCorporea, salvaMisura, TipoMisura } from './api';
import { useColoriTema } from './tema';
import { dataCorta, dataLunga, giornoDi, leggiNumero, numero, oggi } from './misure-formati';

// Sezione "Il tuo corpo": peso corporeo e % di massa grassa, con grafico.
// - Il CLIENTE scrive il proprio peso e vede la massa grassa (la misura il trainer).
// - Il TRAINER scrive la massa grassa del cliente e vede il suo peso.

type Ruolo = 'CLIENTE' | 'TRAINER';

interface InfoTipo {
  titolo: string;
  unita: string;
  chiScrive: Ruolo;
  min: number;
  max: number;
  esempio: string;
}

const TIPI: Record<TipoMisura, InfoTipo> = {
  PESO: { titolo: 'Peso corporeo', unita: 'kg', chiScrive: 'CLIENTE', min: 20, max: 350, esempio: 'es. 72,5' },
  MASSA_GRASSA: { titolo: 'Massa grassa', unita: '%', chiScrive: 'TRAINER', min: 2, max: 70, esempio: 'es. 18,5' },
};

function Grafico({ misure, info }: { misure: MisuraCorporea[]; info: InfoTipo }) {
  const COLORI = useColoriTema();
  if (misure.length < 2) {
    return (
      <p className="rounded-xl border border-line bg-surface-2 px-4 py-4 text-sm leading-relaxed text-muted">
        Il grafico compare dalla seconda misura.
      </p>
    );
  }
  const dati = misure.map((m) => ({ data: dataCorta(giornoDi(m.data)), valore: m.valore }));
  // Asse Y con un po' di margine e tacche "tonde", così piccole variazioni si vedono.
  const valori = dati.map((d) => d.valore);
  const escursione = Math.max(...valori) - Math.min(...valori);
  const passo = escursione > 20 ? 5 : escursione > 6 ? 2 : 1;
  const minimoY = Math.max(0, Math.floor((Math.min(...valori) - passo) / passo) * passo);
  const massimoY = Math.ceil((Math.max(...valori) + passo) / passo) * passo;
  const tacche: number[] = [];
  for (let v = minimoY; v <= massimoY; v += passo) tacche.push(v);

  return (
    <div className="rounded-xl border border-line bg-surface px-2 py-4 sm:px-4">
      <ResponsiveContainer width="100%" height={200}>
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
            formatter={(value: number) => [`${numero(value)} ${info.unita}`, info.titolo]}
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
            dataKey="valore"
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

// Riga dello storico, con "Elimina" che chiede conferma (secondo tocco) prima di cancellare.
function RigaMisura({ misura, info, modificabile, onElimina }: { misura: MisuraCorporea; info: InfoTipo; modificabile: boolean; onElimina: () => Promise<void> }) {
  const [conferma, setConferma] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  useEffect(() => {
    if (!conferma) return;
    const t = setTimeout(() => setConferma(false), 4000);
    return () => clearTimeout(t);
  }, [conferma]);

  return (
    <li className="flex min-h-12 items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted tabular-nums">{dataLunga(giornoDi(misura.data))}</span>
      <span className="flex items-center gap-3">
        <span className="font-bold tabular-nums">
          {numero(misura.valore)} {info.unita}
        </span>
        {modificabile && (
          <button
            type="button"
            disabled={inCorso}
            className={conferma ? 'btn-danger min-h-10 px-3 text-xs' : 'btn-ghost min-h-10 px-3 text-xs'}
            aria-label={conferma ? 'Conferma eliminazione' : `Elimina la misura del ${dataLunga(giornoDi(misura.data))}`}
            onClick={async () => {
              if (!conferma) return setConferma(true);
              setInCorso(true);
              try {
                await onElimina();
              } finally {
                setInCorso(false);
                setConferma(false);
              }
            }}
          >
            {conferma ? 'Sicuro?' : 'Elimina'}
          </button>
        )}
      </span>
    </li>
  );
}

function SchedaMisura({
  tipo,
  misure,
  ruolo,
  clienteId,
  nomeCliente,
  onCambiate,
}: {
  tipo: TipoMisura;
  misure: MisuraCorporea[];
  ruolo: Ruolo;
  clienteId?: number;
  nomeCliente?: string;
  onCambiate: (nuove: MisuraCorporea[]) => void;
}) {
  const info = TIPI[tipo];
  const modificabile = ruolo === info.chiScrive;
  const [valore, setValore] = useState('');
  const [giorno, setGiorno] = useState(oggi);
  const [errore, setErrore] = useState('');
  const [salvato, setSalvato] = useState(false);
  const [inInvio, setInInvio] = useState(false);
  const [tutte, setTutte] = useState(false);

  const ultima = misure[misure.length - 1];
  const prima = misure[0];
  const differenza = ultima && prima && ultima !== prima ? ultima.valore - prima.valore : null;
  const giaPresente = misure.find((m) => giornoDi(m.data) === giorno);
  const recenti = [...misure].reverse();
  const mostrate = tutte ? recenti : recenti.slice(0, 5);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setErrore('');
    setSalvato(false);
    const n = leggiNumero(valore);
    if (n === null || n < info.min || n > info.max) {
      setErrore(`Scrivi un valore tra ${info.min} e ${info.max} ${info.unita} (${info.esempio})`);
      return;
    }
    if (!giorno || giorno > oggi()) {
      setErrore('Scegli una data non nel futuro');
      return;
    }
    setInInvio(true);
    try {
      const salvata = await salvaMisura(tipo, n, giorno, ruolo === 'TRAINER' ? clienteId : undefined);
      const altre = misure.filter((m) => m.id !== salvata.id);
      onCambiate([...altre, salvata].sort((a, b) => a.data.localeCompare(b.data)));
      setValore('');
      setGiorno(oggi());
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2500);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio, riprova');
    } finally {
      setInInvio(false);
    }
  }

  const idCampo = `misura-${tipo}`;
  return (
    <article className="card space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight">{info.titolo}</h3>
          {ultima ? (
            <p className="mt-1 text-3xl font-black tabular-nums text-accent-strong">
              {numero(ultima.valore)}
              <span className="text-lg font-bold"> {info.unita}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Nessuna misura ancora.</p>
          )}
        </div>
        {ultima && (
          <div className="text-right text-xs text-muted">
            <p>ultima: {dataLunga(giornoDi(ultima.data))}</p>
            {differenza !== null && (
              <p className="mt-0.5 font-semibold text-soft tabular-nums">
                {differenza > 0 ? '+' : differenza < 0 ? '−' : '±'}
                {numero(Math.abs(differenza))} {info.unita} dal {dataCorta(giornoDi(prima.data))}
              </p>
            )}
          </div>
        )}
      </header>

      <Grafico misure={misure} info={info} />

      {modificabile ? (
        <form onSubmit={salva} className="space-y-3" noValidate>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3">
            <div>
              <label htmlFor={idCampo} className="label">
                {tipo === 'PESO' ? 'Peso (kg)' : 'Grasso (%)'}
              </label>
              <input
                id={idCampo}
                className="input tabular-nums"
                inputMode="decimal"
                autoComplete="off"
                placeholder={info.esempio}
                value={valore}
                maxLength={6}
                onChange={(e) => {
                  setValore(e.target.value);
                  setErrore('');
                }}
              />
            </div>
            <div>
              <label htmlFor={`${idCampo}-data`} className="label">Giorno</label>
              <input
                id={`${idCampo}-data`}
                type="date"
                className="input min-w-0 px-3"
                value={giorno}
                max={oggi()}
                onChange={(e) => setGiorno(e.target.value)}
              />
            </div>
          </div>
          {giaPresente && (
            <p className="text-xs text-muted">
              Il {dataLunga(giorno)} c’è già {numero(giaPresente.valore)} {info.unita}: salvando lo correggi.
            </p>
          )}
          {errore && <p className="alert-error">{errore}</p>}
          <button type="submit" className="btn-primary min-h-12 w-full" disabled={inInvio}>
            {inInvio ? 'Salvo…' : salvato ? 'Salvato ✓' : giaPresente ? 'Correggi' : 'Salva'}
          </button>
        </form>
      ) : (
        <p className="text-xs text-muted">
          {tipo === 'PESO'
            ? `Il peso lo inserisce ${nomeCliente ?? 'il cliente'} dalla sua app.`
            : 'La misura il tuo trainer.'}
        </p>
      )}

      {misure.length > 0 && (
        <div>
          <p className="label">Storico</p>
          <ul className="divide-y divide-line">
            {mostrate.map((m) => (
              <RigaMisura
                key={m.id}
                misura={m}
                info={info}
                modificabile={modificabile}
                onElimina={async () => {
                  try {
                    await eliminaMisura(m.id);
                    onCambiate(misure.filter((x) => x.id !== m.id));
                  } catch (err) {
                    setErrore(err instanceof Error ? err.message : 'Errore, riprova');
                  }
                }}
              />
            ))}
          </ul>
          {recenti.length > 5 && (
            <button type="button" className="btn-link mt-2 text-sm" onClick={() => setTutte(!tutte)}>
              {tutte ? 'Mostra meno' : `Mostra tutte (${recenti.length})`}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function MisureCorporee({ ruolo, clienteId, nomeCliente }: { ruolo: Ruolo; clienteId?: number; nomeCliente?: string }) {
  const [misure, setMisure] = useState<MisuraCorporea[] | null>(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    let annullato = false;
    setMisure(null);
    setErrore('');
    getMisure(ruolo === 'TRAINER' ? clienteId : undefined)
      .then((m) => !annullato && setMisure(m))
      .catch((err) => !annullato && setErrore(err instanceof Error ? err.message : 'Errore nel caricamento delle misure'));
    return () => {
      annullato = true;
    };
  }, [ruolo, clienteId]);

  const perTipo = (tipo: TipoMisura) => (misure ?? []).filter((m) => m.tipo === tipo);
  const aggiorna = (tipo: TipoMisura) => (nuove: MisuraCorporea[]) =>
    setMisure((prima) => [...(prima ?? []).filter((m) => m.tipo !== tipo), ...nuove]);

  return (
    <section id="corpo" className="scroll-mt-24 space-y-4" aria-labelledby="corpo-titolo">
      <div>
        <p className="eyebrow mb-1">{ruolo === 'TRAINER' ? `Corpo · ${nomeCliente ?? ''}` : 'Composizione corporea'}</p>
        <h2 id="corpo-titolo" className={ruolo === 'TRAINER' ? 'section-title' : 'text-2xl font-black uppercase tracking-tight sm:text-3xl'}>
          {ruolo === 'TRAINER' ? 'Peso e massa grassa' : 'Il tuo corpo'}
        </h2>
      </div>
      {errore && <p className="alert-error">{errore}</p>}
      {!misure && !errore && <p className="py-6 text-center text-sm text-muted">Carico le misure…</p>}
      {misure && (
        <div className="grid gap-4 md:grid-cols-2">
          {(['PESO', 'MASSA_GRASSA'] as TipoMisura[]).map((tipo) => (
            <SchedaMisura
              key={tipo}
              tipo={tipo}
              misure={perTipo(tipo)}
              ruolo={ruolo}
              clienteId={clienteId}
              nomeCliente={nomeCliente}
              onCambiate={aggiorna(tipo)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
