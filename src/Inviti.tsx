import { useEffect, useState } from 'react';
import { annullaInvito, creaInvito, getInviti, Invito, linkInvito } from './api';

// Sezione del trainer: inviti personali per far registrare i clienti.
// Ogni codice vale UNA volta sola e fino alla scadenza; si può annullare finché non è usato.

const dataBreve = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

const ETICHETTA_STATO: Record<Invito['stato'], { testo: string; classe: string }> = {
  attivo: { testo: 'Attivo', classe: 'bg-success-soft text-success' },
  usato: { testo: 'Usato', classe: 'bg-surface-2 text-soft' },
  scaduto: { testo: 'Scaduto', classe: 'bg-warning-soft text-warning' },
  annullato: { testo: 'Annullato', classe: 'bg-danger-soft text-danger' },
};

function testoDaCondividere(inv: Invito) {
  const saluto = inv.nota ? `Ciao ${inv.nota}! ` : 'Ciao! ';
  return `${saluto}Ecco il tuo invito per FT Coach, l’app dei tuoi allenamenti. Apri il link e registrati (vale una volta sola, fino al ${dataBreve(inv.scadeIl)}): ${linkInvito(inv.codice)}\nCodice: ${inv.codice}`;
}

// Riga di un invito, con le azioni: copia, condividi, annulla (con conferma).
function RigaInvito({ invito, evidenziato, onAnnullato }: { invito: Invito; evidenziato: boolean; onAnnullato: () => void }) {
  const [copiato, setCopiato] = useState<'link' | 'codice' | null>(null);
  const [conferma, setConferma] = useState(false);
  const [errore, setErrore] = useState('');
  const stato = ETICHETTA_STATO[invito.stato];

  useEffect(() => {
    if (!conferma) return;
    const t = setTimeout(() => setConferma(false), 4000);
    return () => clearTimeout(t);
  }, [conferma]);

  async function copia(cosa: 'link' | 'codice') {
    try {
      await navigator.clipboard.writeText(cosa === 'link' ? linkInvito(invito.codice) : invito.codice);
      setCopiato(cosa);
      setTimeout(() => setCopiato(null), 2000);
    } catch {
      setErrore('Copia non riuscita: tieni premuto sul codice per copiarlo a mano');
    }
  }

  async function condividi() {
    // Sul telefono si apre il menu di condivisione (WhatsApp, SMS…); sul computer copiamo il messaggio.
    const testo = testoDaCondividere(invito);
    try {
      if (navigator.share) await navigator.share({ text: testo });
      else {
        await navigator.clipboard.writeText(testo);
        setCopiato('link');
        setTimeout(() => setCopiato(null), 2000);
      }
    } catch {
      // l'utente ha chiuso il menu di condivisione: niente da fare
    }
  }

  async function annulla() {
    if (!conferma) {
      setConferma(true);
      return;
    }
    try {
      await annullaInvito(invito.id);
      onAnnullato();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore, riprova');
    } finally {
      setConferma(false);
    }
  }

  return (
    <li className={`space-y-3 rounded-xl border p-4 ${evidenziato ? 'border-accent-strong bg-accent-soft' : 'border-line bg-field'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xl font-bold tracking-wider select-all">{invito.codice}</p>
          {invito.nota && <p className="mt-0.5 truncate text-sm font-semibold">{invito.nota}</p>}
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${stato.classe}`}>{stato.testo}</span>
      </div>
      <p className="text-xs text-muted">
        {invito.stato === 'usato' && invito.usatoDa
          ? `Usato da ${invito.usatoDa.nome} (${invito.usatoDa.email}) il ${dataBreve(invito.usatoIl!)}`
          : invito.stato === 'annullato'
            ? `Annullato il ${dataBreve(invito.annullatoIl!)}`
            : invito.stato === 'scaduto'
              ? `Scaduto il ${dataBreve(invito.scadeIl)}`
              : `Valido fino al ${dataBreve(invito.scadeIl)} · creato il ${dataBreve(invito.creatoIl)}`}
      </p>
      {invito.stato === 'attivo' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" className="btn-primary col-span-2 sm:col-span-1" onClick={condividi}>
            Invia
          </button>
          <button type="button" className="btn-secondary" onClick={() => copia('link')}>
            {copiato === 'link' ? 'Copiato ✓' : 'Copia link'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => copia('codice')}>
            {copiato === 'codice' ? 'Copiato ✓' : 'Copia codice'}
          </button>
          <button type="button" className={conferma ? 'btn-danger col-span-2 sm:col-span-1' : 'btn-ghost col-span-2 sm:col-span-1'} onClick={annulla}>
            {conferma ? 'Sicuro? Annulla' : 'Annulla invito'}
          </button>
        </div>
      )}
      {errore && <p className="alert-error">{errore}</p>}
    </li>
  );
}

export default function SezioneInviti() {
  const [inviti, setInviti] = useState<Invito[]>([]);
  const [nota, setNota] = useState('');
  const [giorni, setGiorni] = useState(14);
  const [appenaCreato, setAppenaCreato] = useState<number | null>(null);
  const [mostraVecchi, setMostraVecchi] = useState(false);
  const [inInvio, setInInvio] = useState(false);
  const [errore, setErrore] = useState('');

  async function carica() {
    try {
      setInviti(await getInviti());
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel caricamento degli inviti');
    }
  }

  useEffect(() => {
    carica();
  }, []);

  async function crea(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setInInvio(true);
    setErrore('');
    try {
      const nuovo = await creaInvito(nota, giorni);
      setInviti((prev) => [nuovo, ...prev]);
      setAppenaCreato(nuovo.id);
      setNota('');
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nella creazione dell’invito');
    } finally {
      setInInvio(false);
    }
  }

  const attivi = inviti.filter((i) => i.stato === 'attivo');
  const vecchi = inviti.filter((i) => i.stato !== 'attivo');

  return (
    <section id="inviti" className="card scroll-mt-24 space-y-5">
      <div>
        <p className="eyebrow mb-1">Nuovi clienti</p>
        <h2 className="section-title">Inviti</h2>
        <p className="mt-1 text-sm text-muted">
          Crea un codice per ogni nuovo cliente e mandaglielo: vale una volta sola e scade da solo.
        </p>
      </div>

      <form onSubmit={crea} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="invito-nota" className="label">Per chi è (facoltativo)</label>
          <input id="invito-nota" className="input" maxLength={80} placeholder="Es. Marco Rossi" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
        <div>
          <label htmlFor="invito-giorni" className="label">Valido per</label>
          <select id="invito-giorni" className="input" value={giorni} onChange={(e) => setGiorni(Number(e.target.value))}>
            <option value={3}>3 giorni</option>
            <option value={7}>7 giorni</option>
            <option value={14}>14 giorni</option>
            <option value={30}>30 giorni</option>
          </select>
        </div>
        <button type="submit" className="btn-primary min-h-12" disabled={inInvio}>
          {inInvio ? 'Creo…' : '+ Crea invito'}
        </button>
      </form>

      {errore && <p className="alert-error">{errore}</p>}

      {attivi.length === 0 ? (
        <p className="empty-state">Nessun invito attivo.</p>
      ) : (
        <ul className="space-y-3">
          {attivi.map((i) => (
            <RigaInvito key={i.id} invito={i} evidenziato={i.id === appenaCreato} onAnnullato={carica} />
          ))}
        </ul>
      )}

      {vecchi.length > 0 && (
        <div>
          <button type="button" className="btn-link text-sm" onClick={() => setMostraVecchi(!mostraVecchi)}>
            {mostraVecchi ? 'Nascondi' : 'Mostra'} usati, scaduti e annullati ({vecchi.length})
          </button>
          {mostraVecchi && (
            <ul className="mt-3 space-y-3">
              {vecchi.map((i) => (
                <RigaInvito key={i.id} invito={i} evidenziato={false} onAnnullato={carica} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
