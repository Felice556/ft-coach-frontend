import { useEffect, useState } from 'react';
import { AnnuncioProgramma, getAvvisiProgrammi, salvaAvvisoProgramma, segnaAnnunciVisti } from './api';
import { locale, tr } from './lingua';

// Programmi Liftio "in arrivo", per chi si allena da solo. Una sezione a sé: nessun popup,
// nessun prezzo, nessun acquisto. "Avvisami" salva solo che il programma interessa.
// Le chiavi devono coincidere con quelle del backend (src/routes/programmi.ts).
export interface ProgrammaInArrivo {
  chiave: string;
  nome: string;
  descrizione: string;
  dettagli: string[];
}

// Tre livelli: principiante, intermedio, avanzato.
export const PROGRAMMI = (): ProgrammaInArrivo[] => [
  {
    chiave: 'principiante',
    nome: tr('Principiante', 'Beginner'),
    descrizione: tr('Per chi ha appena iniziato ad andare in palestra.', 'For anyone who has just started going to the gym.'),
    dettagli: [tr('Da 4 a 12 mesi', '4 to 12 months')],
  },
  {
    chiave: 'intermedio',
    nome: tr('Intermedio', 'Intermediate'),
    descrizione: tr(
      'Per chi va in palestra già da un po’, ma non ha ancora imparato ad allenarsi bene.',
      'For anyone who has been going to the gym for a while but hasn’t yet learned to train properly.',
    ),
    dettagli: [tr('Da 4 a 12 mesi', '4 to 12 months')],
  },
  {
    chiave: 'avanzato',
    nome: tr('Avanzato', 'Advanced'),
    descrizione: tr(
      'Per chi sa già allenarsi e sa arrivare al vero cedimento.',
      'For anyone who already knows how to train and how to reach true failure.',
    ),
    dettagli: [tr('Da 6 a 12 mesi', '6 to 12 months')],
  },
];

// onAnnunciVisti: il cliente ha letto i messaggi nuovi (la barra spegne il pallino su "Programmi").
export default function ProgrammiInArrivo({ onAnnunciVisti }: { onAnnunciVisti?: () => void }) {
  const [avvisi, setAvvisi] = useState<Set<string> | null>(null);
  const [annunci, setAnnunci] = useState<AnnuncioProgramma[]>([]);
  const [inInvio, setInInvio] = useState<string | null>(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    getAvvisiProgrammi()
      .then((r) => {
        setAvvisi(new Set(r.avvisi));
        setAnnunci(r.annunci ?? []);
      })
      .catch(() => setAvvisi(new Set())); // se non arriva, i bottoni partono spenti
  }, []);

  async function visti() {
    setAnnunci([]);
    onAnnunciVisti?.();
    try {
      await segnaAnnunciVisti();
    } catch {
      // non importa: al massimo il messaggio ricompare la prossima volta
    }
  }
  const nomeDi = (chiave: string) => PROGRAMMI().find((p) => p.chiave === chiave)?.nome ?? chiave;

  async function cambia(chiave: string) {
    if (!avvisi || inInvio) return;
    const attivo = !avvisi.has(chiave);
    setInInvio(chiave);
    setErrore('');
    try {
      await salvaAvvisoProgramma(chiave, attivo);
      const nuovi = new Set(avvisi);
      if (attivo) nuovi.add(chiave);
      else nuovi.delete(chiave);
      setAvvisi(nuovi);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore, riprova', 'Error, try again'));
    } finally {
      setInInvio(null);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="programmi-titolo">
      <div>
        <p className="eyebrow mb-1">{tr('Programmi Liftio · in arrivo', 'Liftio plans · coming soon')}</p>
        <h2 id="programmi-titolo" className="text-2xl font-black uppercase tracking-tight sm:text-3xl">{tr('Programmi pronti', 'Ready-made plans')}</h2>
        <p className="mt-1 text-sm text-muted">
          {tr(
            'Programmi completi da seguire mese dopo mese, direttamente nell’app. Non sono ancora disponibili: tocca “Avvisami” su quelli che ti interessano.',
            'Complete plans to follow month by month, right in the app. They aren’t available yet: tap “Notify me” on the ones you like.',
          )}
        </p>
      </div>
      {/* Messaggi nuovi dell'amministratore sui programmi che aspetti */}
      {annunci.length > 0 && (
        <div className="card space-y-3 border-accent-strong/50 bg-accent-soft" role="status">
          {annunci.map((a) => (
            <div key={a.id}>
              <p className="text-xs font-bold tracking-wide text-accent-strong uppercase">
                {nomeDi(a.programma)} · {new Date(a.creatoIl).toLocaleDateString(locale, { day: 'numeric', month: 'long' })}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed break-words whitespace-pre-line">{a.messaggio}</p>
            </div>
          ))}
          <button type="button" className="btn-secondary min-h-10 px-4 text-sm" onClick={visti}>{tr('Ok, visto', 'Ok, got it')}</button>
        </div>
      )}
      {errore && <p className="alert-error">{errore}</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {PROGRAMMI().map((p) => {
          const attivo = avvisi?.has(p.chiave) ?? false;
          return (
            <li key={p.chiave} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-extrabold tracking-tight">{p.nome}</h3>
                <span className="chip shrink-0 bg-surface-2 text-muted">{tr('In arrivo', 'Coming soon')}</span>
              </div>
              <p className="text-sm leading-relaxed text-soft">{p.descrizione}</p>
              <ul className="flex flex-wrap gap-1.5" aria-label={tr('Dettagli', 'Details')}>
                {p.dettagli.map((d) => (
                  <li key={d} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{d}</li>
                ))}
              </ul>
              <button
                type="button"
                aria-pressed={attivo}
                disabled={avvisi === null || inInvio === p.chiave}
                onClick={() => cambia(p.chiave)}
                className={`mt-auto min-h-11 ${attivo ? 'btn-secondary' : 'btn-primary'}`}
              >
                {inInvio === p.chiave ? '…' : attivo ? tr('✓ Ti avviseremo · annulla', '✓ We’ll let you know · undo') : tr('Avvisami', 'Notify me')}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">
        {tr('Quando un programma sarà pronto lo troverai qui e te lo segnaleremo nell’app. Puoi togliere l’avviso quando vuoi.', 'When a plan is ready you’ll find it here and we’ll flag it in the app. You can remove the alert whenever you like.')}
      </p>
    </section>
  );
}
