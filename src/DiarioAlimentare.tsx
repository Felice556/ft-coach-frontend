import { useEffect, useId, useState } from 'react';
import { commentaGiornataDiario, DatiDiario, getDiario, GiornoDiario, salvaConsensoDiario, salvaGiornataDiario } from './api';
import { aggiungiGiorni } from './cardio-calcoli';
import { cambiaQuantita, MAX_VOCI_EXTRA, NOMI_VOCI_EXTRA, nomePasto, PastoFisso, settimanaFinoA, TIPI_PASTO } from './diario-calcoli';
import { giornoDi, oggi } from './misure-formati';
import { locale, tr } from './lingua';

// Diario alimentare.
// - Il CLIENTE (dopo aver dato il consenso) scrive a parole cosa mangia, olio, acqua e come si sente.
// - Il TRAINER legge il diario dei suoi clienti e può commentare ogni giornata.
// Non è un piano alimentare: niente calorie né diete. Per quelle servono nutrizionista, dietista o medico.

type Ruolo = 'CLIENTE' | 'TRAINER';
const GIORNI_INDIETRO = 59; // il server conserva per la vista gli ultimi 60 giorni

const dataEstesa = (giorno: string) =>
  new Date(`${giorno}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const numero = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

const AVVISO_CLIENTE = () =>
  tr(
    'Il diario serve a te e al tuo trainer per vedere le tue abitudini. Non è un piano alimentare: per una dieta personalizzata rivolgiti a un nutrizionista, un dietista o un medico.',
    'The diary helps you and your trainer see your habits. It isn’t a meal plan: for a personalised diet, see a nutritionist, a dietitian or a doctor.',
  );

// Il commento del trainer a una giornata, come lo vede il cliente.
function Commento({ g }: { g: GiornoDiario }) {
  if (!g.commentoTrainer) return null;
  return (
    <div className="rounded-xl border border-success/40 bg-success-soft px-3 py-2.5">
      <p className="text-xs font-bold tracking-wide text-success uppercase">{tr('Commento del tuo trainer', 'Your trainer’s comment')}</p>
      <p className="mt-1 text-sm leading-relaxed text-soft break-words whitespace-pre-line">{g.commentoTrainer}</p>
    </div>
  );
}

// ---------- Cliente: consenso ----------

function Consenso({ onDato }: { onDato: () => void }) {
  const [aperto, setAperto] = useState(true);
  const [spuntato, setSpuntato] = useState(false);
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');

  if (!aperto) {
    return (
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-soft">{tr('Il diario alimentare è spento. Puoi attivarlo quando vuoi.', 'The food diary is off. You can turn it on whenever you like.')}</p>
        <button type="button" className="btn-secondary shrink-0" onClick={() => setAperto(true)}>{tr('Attiva il diario', 'Turn on the diary')}</button>
      </div>
    );
  }

  async function attiva() {
    if (!spuntato || inInvio) return;
    setInInvio(true);
    setErrore('');
    try {
      await salvaConsensoDiario(true);
      onDato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
      setInInvio(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h3 className="text-lg font-extrabold tracking-tight">{tr('Prima di iniziare il diario', 'Before you start the diary')}</h3>
      <p className="text-sm leading-relaxed text-soft">
        {tr(
          'Nel diario scrivi cosa mangi e bevi. Sono informazioni sulle tue abitudini che possono dire qualcosa sulla tua salute, quindi ti chiediamo il consenso.',
          'In the diary you write what you eat and drink. This is information about your habits that can say something about your health, so we ask for your consent.',
        )}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-soft">
        <li>{tr('Lo vedete solo tu e il tuo trainer, che può lasciare dei commenti.', 'Only you and your trainer can see it, and your trainer can leave comments.')}</li>
        <li>{tr('Non è un piano alimentare né un consiglio medico.', 'It isn’t a meal plan or medical advice.')}</li>
        <li>{tr('Puoi ritirare il consenso quando vuoi: il diario viene cancellato.', 'You can withdraw your consent at any time: the diary is deleted.')}</li>
      </ul>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-field p-3 text-sm leading-snug text-soft">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-accent-strong" checked={spuntato} onChange={(e) => setSpuntato(e.target.checked)} />
        {tr('Acconsento all’uso del mio diario alimentare per seguire le mie abitudini con il mio trainer.', 'I consent to my food diary being used to follow my habits with my trainer.')}
      </label>
      {errore && <p className="alert-error">{errore}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn-primary min-h-12" disabled={!spuntato || inInvio} onClick={attiva}>
          {inInvio ? tr('Un momento…', 'One moment…') : tr('Inizia il diario', 'Start the diary')}
        </button>
        <button type="button" className="btn-secondary min-h-12" onClick={() => setAperto(false)}>{tr('Non ora', 'Not now')}</button>
      </div>
    </div>
  );
}

// ---------- Cliente: una giornata ----------

type VoceExtra = { chiave: number; nome: string; testo: string; ora: string };
type Bozza = {
  pasti: Record<PastoFisso, { testo: string; ora: string }>;
  // Voci in più scelte dal cliente ("Post cena", "Pre allenamento"…), nel loro ordine.
  extra: VoceExtra[];
  olio: number | null;
  acqua: number | null;
  sensazioni: string;
};

let prossimaChiave = 1;

function bozzaDa(g: GiornoDiario | undefined): Bozza {
  const pasti = Object.fromEntries(TIPI_PASTO.map((t) => [t, { testo: '', ora: '' }])) as Bozza['pasti'];
  const extra: VoceExtra[] = [];
  for (const p of g?.pasti ?? []) {
    if (p.tipo === 'EXTRA') extra.push({ chiave: prossimaChiave++, nome: p.nome ?? '', testo: p.testo, ora: p.ora ?? '' });
    else pasti[p.tipo] = { testo: p.testo, ora: p.ora ?? '' };
  }
  return { pasti, extra, olio: g?.olioCucchiai ?? null, acqua: g?.acquaLitri ?? null, sensazioni: g?.sensazioni ?? '' };
}

// Uguali a parte le chiavi interne delle voci in più (servono solo a React).
const senzaChiavi = (b: Bozza) => ({ ...b, extra: b.extra.map(({ nome, testo, ora }) => ({ nome, testo, ora })) });
const stessaBozza = (a: Bozza, b: Bozza) => JSON.stringify(senzaChiavi(a)) === JSON.stringify(senzaChiavi(b));

function Contatore({ etichetta, valore, unita, passo, massimo, onChange }: { etichetta: string; valore: number | null; unita: string; passo: number; massimo: number; onChange: (v: number | null) => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-xs font-semibold text-muted">{etichetta}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button type="button" className="btn-ghost h-10 w-10 px-0 text-xl" aria-label={tr(`Meno ${etichetta.toLowerCase()}`, `Less ${etichetta.toLowerCase()}`)} onClick={() => onChange(cambiaQuantita(valore, -passo, massimo))}>−</button>
        <p className="text-xl font-black tabular-nums" aria-live="polite">
          {valore !== null ? numero(valore) : '0'} <span className="text-xs font-semibold text-muted">{unita}</span>
        </p>
        <button type="button" className="btn-ghost h-10 w-10 px-0 text-xl" aria-label={tr(`Più ${etichetta.toLowerCase()}`, `More ${etichetta.toLowerCase()}`)} onClick={() => onChange(cambiaQuantita(valore, passo, massimo))}>+</button>
      </div>
    </div>
  );
}

function DiarioCliente({ dati, onCambiati }: { dati: DatiDiario; onCambiati: (d: DatiDiario) => void }) {
  const id = useId();
  const oggiStr = oggi();
  const [giorno, setGiorno] = useState(oggiStr);
  const salvata = dati.giorni.find((g) => giornoDi(g.data) === giorno);
  const [bozza, setBozza] = useState<Bozza>(() => bozzaDa(salvata));
  // Pasto aperto per scriverlo: uno dei 5 fissi, oppure "extra-<chiave>" per una voce in più.
  const [aperto, setAperto] = useState<string | null>(null);
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const [fatto, setFatto] = useState(false);
  const [ritiro, setRitiro] = useState(false);
  const modificata = !stessaBozza(bozza, bozzaDa(salvata));
  const primo = aggiungiGiorni(oggiStr, -GIORNI_INDIETRO);

  function vaiA(nuovo: string) {
    if (modificata && !window.confirm(tr('Hai modifiche non salvate in questa giornata. Vuoi lasciarle?', 'You have unsaved changes on this day. Discard them?'))) return;
    setGiorno(nuovo);
    setBozza(bozzaDa(dati.giorni.find((g) => giornoDi(g.data) === nuovo)));
    setAperto(null);
    setErrore('');
  }

  async function salva() {
    if (inInvio) return;
    const extraPiene = bozza.extra.filter((x) => x.testo.trim());
    if (extraPiene.some((x) => !x.nome.trim())) {
      setErrore(tr('Dai un nome a ogni voce in più (es. “Post cena”)', 'Give every extra entry a name (e.g. “After dinner”)'));
      return;
    }
    setInInvio(true);
    setErrore('');
    try {
      const pasti = Object.fromEntries(
        TIPI_PASTO.filter((t) => bozza.pasti[t].testo.trim()).map((t) => [t, { testo: bozza.pasti[t].testo.trim(), ora: bozza.pasti[t].ora || null }]),
      );
      const extra = extraPiene.map((x) => ({ nome: x.nome.trim(), testo: x.testo.trim(), ora: x.ora || null }));
      const risposta = await salvaGiornataDiario(giorno, { pasti, extra, olioCucchiai: bozza.olio, acquaLitri: bozza.acqua, sensazioni: bozza.sensazioni.trim() });
      const altri = dati.giorni.filter((g) => giornoDi(g.data) !== giorno);
      onCambiati({ ...dati, giorni: (risposta ? [...altri, risposta] : altri).sort((a, b) => b.data.localeCompare(a.data)) });
      setBozza(bozzaDa(risposta ?? undefined));
      setAperto(null);
      setFatto(true);
      setTimeout(() => setFatto(false), 2500);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio, riprova', 'Error saving, try again'));
    } finally {
      setInInvio(false);
    }
  }

  async function ritira() {
    if (!ritiro) return setRitiro(true);
    try {
      await salvaConsensoDiario(false);
      onCambiati({ consenso: false, giorni: [] });
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
      setRitiro(false);
    }
  }

  const pasto = (t: PastoFisso) => bozza.pasti[t];
  const cambiaExtra = (chiave: number, campo: 'nome' | 'testo' | 'ora', valore: string) =>
    setBozza((b) => ({ ...b, extra: b.extra.map((x) => (x.chiave === chiave ? { ...x, [campo]: valore } : x)) }));
  function aggiungiExtra() {
    const chiave = prossimaChiave++;
    setBozza((b) => ({ ...b, extra: [...b.extra, { chiave, nome: '', testo: '', ora: '' }] }));
    setAperto(`extra-${chiave}`);
  }
  const togliExtra = (chiave: number) => {
    setBozza((b) => ({ ...b, extra: b.extra.filter((x) => x.chiave !== chiave) }));
    setAperto(null);
  };
  const cambiaPasto = (t: PastoFisso, campo: 'testo' | 'ora', valore: string) =>
    setBozza((b) => ({ ...b, pasti: { ...b.pasti, [t]: { ...b.pasti[t], [campo]: valore } } }));

  return (
    <div className="card space-y-4">
      {/* Giorno: frecce per gli altri giorni (non nel futuro) */}
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn-secondary h-11 w-11 shrink-0 px-0" aria-label={tr('Giorno prima', 'Previous day')} disabled={giorno <= primo} onClick={() => vaiA(aggiungiGiorni(giorno, -1))}>‹</button>
        <p className="text-center font-bold first-letter:uppercase">
          {giorno === oggiStr ? `${tr('Oggi', 'Today')} · ` : ''}
          {dataEstesa(giorno)}
        </p>
        <button type="button" className="btn-secondary h-11 w-11 shrink-0 px-0" aria-label={tr('Giorno dopo', 'Next day')} disabled={giorno >= oggiStr} onClick={() => vaiA(aggiungiGiorni(giorno, 1))}>›</button>
      </div>

      <ul className="divide-y divide-line rounded-xl border border-line bg-surface-2">
        {TIPI_PASTO.map((t) => {
          const p = pasto(t);
          const inModifica = aperto === t;
          return (
            <li key={t} className="px-3 py-3">
              {inModifica ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor={`${id}-${t}`} className="font-bold">{nomePasto(t)}</label>
                    <input type="time" className="input h-10 w-28 px-2 text-sm" aria-label={tr(`Ora: ${nomePasto(t)}`, `Time: ${nomePasto(t)}`)} value={p.ora} onChange={(e) => cambiaPasto(t, 'ora', e.target.value)} />
                  </div>
                  <textarea
                    id={`${id}-${t}`}
                    className="input min-h-20 resize-y"
                    maxLength={500}
                    autoFocus
                    placeholder={tr('es. Pasta al pomodoro, insalata, pane', 'e.g. Pasta with tomato sauce, salad, bread')}
                    value={p.testo}
                    onChange={(e) => cambiaPasto(t, 'testo', e.target.value)}
                  />
                  <button type="button" className="btn-secondary min-h-10 w-full text-sm" onClick={() => setAperto(null)}>{tr('Fatto', 'Done')}</button>
                </div>
              ) : (
                <button type="button" className="block w-full text-left" onClick={() => setAperto(t)} aria-label={tr(`Scrivi ${nomePasto(t)}`, `Write ${nomePasto(t)}`)}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{nomePasto(t)}</span>
                    {p.ora && <span className="text-sm text-muted tabular-nums">{p.ora}</span>}
                  </span>
                  {p.testo.trim() ? (
                    <span className="mt-0.5 block text-sm leading-relaxed text-soft break-words whitespace-pre-line">{p.testo}</span>
                  ) : (
                    <span className="mt-0.5 block text-sm font-semibold text-accent-strong">{tr('+ Aggiungi', '+ Add')}</span>
                  )}
                </button>
              )}
            </li>
          );
        })}
        {/* Voci in più, con il nome scelto dal cliente */}
        {bozza.extra.map((x) => {
          const inModifica = aperto === `extra-${x.chiave}`;
          return (
            <li key={x.chiave} className="px-3 py-3">
              {inModifica ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="input h-10 min-w-0 flex-1 px-3 text-sm font-bold"
                      list={`${id}-nomi-extra`}
                      maxLength={40}
                      aria-label={tr('Nome della voce', 'Entry name')}
                      placeholder={tr('Nome, es. Post cena', 'Name, e.g. After dinner')}
                      value={x.nome}
                      onChange={(e) => cambiaExtra(x.chiave, 'nome', e.target.value)}
                    />
                    <input type="time" className="input h-10 w-28 px-2 text-sm" aria-label={tr(`Ora: ${x.nome || 'voce in più'}`, `Time: ${x.nome || 'extra entry'}`)} value={x.ora} onChange={(e) => cambiaExtra(x.chiave, 'ora', e.target.value)} />
                  </div>
                  <textarea
                    className="input min-h-20 resize-y"
                    maxLength={500}
                    aria-label={tr(`Cosa hai mangiato: ${x.nome || 'voce in più'}`, `What you ate: ${x.nome || 'extra entry'}`)}
                    placeholder={tr('es. Una tisana e due biscotti', 'e.g. A herbal tea and two biscuits')}
                    value={x.testo}
                    onChange={(e) => cambiaExtra(x.chiave, 'testo', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="btn-ghost min-h-10 text-sm text-danger" onClick={() => togliExtra(x.chiave)}>{tr('Togli voce', 'Remove entry')}</button>
                    <button type="button" className="btn-secondary min-h-10 text-sm" onClick={() => setAperto(null)}>{tr('Fatto', 'Done')}</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="block w-full text-left" onClick={() => setAperto(`extra-${x.chiave}`)} aria-label={tr(`Scrivi ${x.nome || 'voce in più'}`, `Write ${x.nome || 'extra entry'}`)}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{x.nome || tr('Voce senza nome', 'Unnamed entry')}</span>
                    {x.ora && <span className="text-sm text-muted tabular-nums">{x.ora}</span>}
                  </span>
                  {x.testo.trim() ? (
                    <span className="mt-0.5 block text-sm leading-relaxed text-soft break-words whitespace-pre-line">{x.testo}</span>
                  ) : (
                    <span className="mt-0.5 block text-sm font-semibold text-accent-strong">{tr('+ Aggiungi', '+ Add')}</span>
                  )}
                </button>
              )}
            </li>
          );
        })}
        {bozza.extra.length < MAX_VOCI_EXTRA && (
          <li className="px-3 py-2">
            <button type="button" className="btn-link min-h-10 text-sm" onClick={aggiungiExtra}>
              {tr('+ Aggiungi un’altra voce (es. post cena)', '+ Add another entry (e.g. after dinner)')}
            </button>
          </li>
        )}
      </ul>
      <datalist id={`${id}-nomi-extra`}>
        {NOMI_VOCI_EXTRA().map((n) => <option key={n} value={n} />)}
      </datalist>

      <div className="grid grid-cols-2 gap-3">
        <Contatore etichetta={tr('Olio', 'Oil')} unita={tr('cucchiai', 'tbsp')} valore={bozza.olio} passo={0.5} massimo={20} onChange={(v) => setBozza((b) => ({ ...b, olio: v }))} />
        <Contatore etichetta={tr('Acqua', 'Water')} unita={tr('litri', 'litres')} valore={bozza.acqua} passo={0.25} massimo={10} onChange={(v) => setBozza((b) => ({ ...b, acqua: v }))} />
      </div>

      <div>
        <label htmlFor={`${id}-sensazioni`} className="label">{tr('Come ti sei sentito? (facoltativo)', 'How did you feel? (optional)')}</label>
        <input id={`${id}-sensazioni`} className="input" maxLength={300} placeholder={tr('es. molta fame nel pomeriggio, energia ok', 'e.g. very hungry in the afternoon, energy fine')} value={bozza.sensazioni} onChange={(e) => setBozza((b) => ({ ...b, sensazioni: e.target.value }))} />
      </div>

      {errore && <p className="alert-error">{errore}</p>}
      <button type="button" className="btn-primary min-h-12 w-full" disabled={inInvio || (!modificata && !fatto)} onClick={salva}>
        {inInvio ? tr('Salvo…', 'Saving…') : fatto && !modificata ? tr('Salvato ✓', 'Saved ✓') : tr('Salva la giornata', 'Save the day')}
      </button>

      {salvata && <Commento g={salvata} />}

      <p className="text-xs leading-relaxed text-muted">{AVVISO_CLIENTE()}</p>
      <div className="border-t border-line pt-3">
        <button type="button" className={`btn-link text-sm ${ritiro ? 'text-danger' : 'text-muted'}`} onClick={ritira} onBlur={() => setRitiro(false)}>
          {ritiro ? tr('Sicuro? Tocca di nuovo: il diario viene cancellato', 'Sure? Tap again: the diary will be deleted') : tr('Ritira il consenso e cancella il diario', 'Withdraw consent and delete the diary')}
        </button>
      </div>
    </div>
  );
}

// ---------- Trainer: settimana, giornata in lettura, commento ----------

function DiarioTrainer({ clienteId, nomeCliente, dati, onCambiati }: { clienteId: number; nomeCliente: string; dati: DatiDiario; onCambiati: (d: DatiDiario) => void }) {
  const id = useId();
  const oggiStr = oggi();
  const perGiorno = new Map(dati.giorni.map((g) => [giornoDi(g.data), g]));
  const [fine, setFine] = useState(oggiStr);
  const settimana = settimanaFinoA(fine);
  // Di base il giorno compilato più recente della settimana (o l'ultimo giorno).
  const [scelto, setScelto] = useState(() => [...settimanaFinoA(oggiStr)].reverse().find((g) => perGiorno.has(g)) ?? oggiStr);
  const g = perGiorno.get(scelto);
  const [testo, setTesto] = useState(g?.commentoTrainer ?? '');
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const [fatto, setFatto] = useState(false);
  const compilati = settimana.filter((x) => perGiorno.has(x)).length;

  function scegli(giorno: string) {
    setScelto(giorno);
    setTesto(perGiorno.get(giorno)?.commentoTrainer ?? '');
    setErrore('');
  }

  function spostaSettimana(delta: number) {
    const nuovaFine = aggiungiGiorni(fine, delta * 7);
    const limite = nuovaFine > oggiStr ? oggiStr : nuovaFine;
    setFine(limite);
    const giorni = settimanaFinoA(limite);
    scegli([...giorni].reverse().find((x) => perGiorno.has(x)) ?? limite);
  }

  async function invia(commento: string) {
    if (inInvio) return;
    setInInvio(true);
    setErrore('');
    try {
      const aggiornata = await commentaGiornataDiario(clienteId, scelto, commento);
      onCambiati({ ...dati, giorni: dati.giorni.map((x) => (x.id === aggiornata.id ? aggiornata : x)) });
      setTesto(aggiornata.commentoTrainer ?? '');
      setFatto(true);
      setTimeout(() => setFatto(false), 2500);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore nel salvataggio, riprova', 'Error saving, try again'));
    } finally {
      setInInvio(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary h-11 w-9 shrink-0 px-0" aria-label={tr('Settimana prima', 'Previous week')} disabled={settimana[0] <= aggiungiGiorni(oggiStr, -GIORNI_INDIETRO)} onClick={() => spostaSettimana(-1)}>‹</button>
        <div className="grid flex-1 grid-cols-7 gap-1" role="group" aria-label={tr('Giorni della settimana', 'Days of the week')}>
          {settimana.map((x) => {
            const attivo = x === scelto;
            const pieno = perGiorno.has(x);
            const d = new Date(`${x}T12:00:00Z`);
            return (
              <button
                key={x}
                type="button"
                aria-pressed={attivo}
                aria-label={`${dataEstesa(x)}${pieno ? '' : tr(' · non compilato', ' · not filled in')}`}
                onClick={() => scegli(x)}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-xs font-bold transition ${attivo ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted hover:text-ink'}`}
              >
                <span className="uppercase">{d.toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' })}</span>
                <span className={`text-sm ${attivo ? '' : 'text-ink'}`}>{d.getUTCDate()}</span>
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${pieno ? 'bg-success' : 'border border-line'}`} />
              </button>
            );
          })}
        </div>
        <button type="button" className="btn-secondary h-11 w-9 shrink-0 px-0" aria-label={tr('Settimana dopo', 'Next week')} disabled={fine >= oggiStr} onClick={() => spostaSettimana(1)}>›</button>
      </div>
      <p className="text-xs text-muted">{tr(`Puntino verde = giorno compilato · ${compilati} giorni su 7`, `Green dot = day filled in · ${compilati} of 7 days`)}</p>

      <p className="font-bold first-letter:uppercase">{dataEstesa(scelto)}</p>
      {!g ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{tr(`${nomeCliente} non ha compilato il diario di questo giorno.`, `${nomeCliente} hasn’t filled in the diary for this day.`)}</p>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface-2">
            {[
              ...TIPI_PASTO.flatMap((t) => g.pasti.filter((p) => p.tipo === t)),
              ...g.pasti.filter((p) => p.tipo === 'EXTRA'), // voci in più del cliente, dopo i pasti fissi
            ].map((p, i) => (
              <li key={`${p.tipo}-${i}`} className="px-3 py-2.5">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">{p.tipo === 'EXTRA' ? p.nome : nomePasto(p.tipo)}</span>
                  {p.ora && <span className="text-sm text-muted tabular-nums">{p.ora}</span>}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-soft break-words whitespace-pre-line">{p.testo}</p>
              </li>
            ))}
            {(g.olioCucchiai != null || g.acquaLitri != null) && (
              <li className="px-3 py-2.5 text-sm">
                <span className="font-bold">{tr('Olio · Acqua', 'Oil · Water')}</span>
                <p className="mt-0.5 text-soft">
                  {g.olioCucchiai != null ? `${numero(g.olioCucchiai)} ${tr('cucchiai', 'tbsp')}` : '—'} · {g.acquaLitri != null ? `${numero(g.acquaLitri)} ${tr('litri', 'litres')}` : '—'}
                </p>
              </li>
            )}
            {g.sensazioni && (
              <li className="px-3 py-2.5 text-sm">
                <span className="font-bold">{tr(`Note di ${nomeCliente}`, `${nomeCliente}’s notes`)}</span>
                <p className="mt-0.5 text-soft italic break-words">“{g.sensazioni}”</p>
              </li>
            )}
          </ul>
          <div>
            <label htmlFor={`${id}-commento`} className="label">{tr('Il tuo commento a questa giornata', 'Your comment on this day')}</label>
            <textarea id={`${id}-commento`} className="input min-h-20 resize-y" maxLength={1000} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={tr('es. Ottima costanza! Ricordati di bere anche in palestra.', 'e.g. Great consistency! Remember to drink at the gym too.')} />
          </div>
          {errore && <p className="alert-error">{errore}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary min-h-11 flex-1" disabled={inInvio || testo.trim() === (g.commentoTrainer ?? '') || !testo.trim()} onClick={() => invia(testo.trim())}>
              {inInvio ? tr('Invio…', 'Sending…') : fatto ? tr('Inviato ✓', 'Sent ✓') : g.commentoTrainer ? tr('Aggiorna commento', 'Update comment') : tr('Invia commento', 'Send comment')}
            </button>
            {g.commentoTrainer && (
              <button type="button" className="btn-ghost min-h-11" disabled={inInvio} onClick={() => invia('')}>{tr('Togli commento', 'Remove comment')}</button>
            )}
          </div>
        </>
      )}
      <p className="text-xs leading-relaxed text-muted">
        {tr(
          'Commenti generali su abitudini, costanza e benessere. Per indicazioni alimentari personalizzate (diete, calorie, integratori) indica al cliente un nutrizionista, un dietista o un medico.',
          'General comments on habits, consistency and wellbeing. For personalised food advice (diets, calories, supplements), refer the client to a nutritionist, a dietitian or a doctor.',
        )}
      </p>
    </div>
  );
}

export default function DiarioAlimentare({ ruolo, clienteId, nomeCliente }: { ruolo: Ruolo; clienteId?: number; nomeCliente?: string }) {
  const [dati, setDati] = useState<DatiDiario | null>(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    let annullato = false;
    setDati(null);
    setErrore('');
    getDiario(ruolo === 'TRAINER' ? clienteId : undefined)
      .then((d) => !annullato && setDati(d))
      .catch((err) => !annullato && setErrore(err instanceof Error ? err.message : tr('Errore nel caricamento del diario', 'Error loading the diary')));
    return () => {
      annullato = true;
    };
  }, [ruolo, clienteId]);

  return (
    <section id="diario" className="scroll-mt-24 space-y-4" aria-labelledby="diario-titolo">
      <div>
        <p className="eyebrow mb-1">{ruolo === 'TRAINER' ? `${tr('Diario', 'Diary')} · ${nomeCliente ?? ''}` : tr('Diario', 'Diary')}</p>
        <h2 id="diario-titolo" className={ruolo === 'TRAINER' ? 'section-title' : 'text-2xl font-black uppercase tracking-tight sm:text-3xl'}>
          {ruolo === 'TRAINER' ? tr('Diario alimentare', 'Food diary') : tr('Cosa hai mangiato', 'What you ate')}
        </h2>
      </div>
      {errore && <p className="alert-error">{errore}</p>}
      {!dati && !errore && <p className="py-6 text-center text-sm text-muted">{tr('Carico il diario…', 'Loading the diary…')}</p>}
      {dati && ruolo === 'CLIENTE' && !dati.consenso && <Consenso onDato={() => setDati({ consenso: true, giorni: [] })} />}
      {dati && ruolo === 'CLIENTE' && dati.consenso && <DiarioCliente dati={dati} onCambiati={setDati} />}
      {dati && ruolo === 'TRAINER' && !dati.consenso && (
        <p className="card text-sm text-muted">
          {tr(`${nomeCliente ?? 'Il cliente'} non ha ancora attivato il diario alimentare: può farlo dalla sua app.`, `${nomeCliente ?? 'The client'} hasn’t turned on the food diary yet: they can do it from their app.`)}
        </p>
      )}
      {dati && ruolo === 'TRAINER' && dati.consenso && clienteId !== undefined && (
        <DiarioTrainer clienteId={clienteId} nomeCliente={nomeCliente ?? ''} dati={dati} onCambiati={setDati} />
      )}
    </section>
  );
}
