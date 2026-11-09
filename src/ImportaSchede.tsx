import { useRef, useState } from 'react';
import { creaScheda } from './api';
import { leggiFileSchede, type SchedaDaCreare } from './fileSchede';
import { riassuntoSerie } from './serie';
import { tr } from './lingua';

// Pulsante "Importa schede" nella pagina di un cliente: legge il file (es. da Schedario),
// mostra l'anteprima e, solo dopo la conferma, CREA le schede nuove. Le schede esistenti non vengono toccate.
export default function ImportaSchede({ clienteId, nomeCliente, onFatto }: { clienteId: number; nomeCliente: string; onFatto: () => void | Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [schede, setSchede] = useState<SchedaDaCreare[] | null>(null);
  const [scelte, setScelte] = useState<boolean[]>([]);
  const [nomeNelFile, setNomeNelFile] = useState<string | null>(null);
  const [errore, setErrore] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [create, setCreate] = useState(0);

  const chiudi = () => { setSchede(null); setErrore(''); setCreate(0); setNomeNelFile(null); };
  const leggi = async (f: File) => {
    setErrore(''); setCreate(0);
    try {
      const r = leggiFileSchede(await f.text());
      setSchede(r.schede); setScelte(r.schede.map(() => true)); setNomeNelFile(r.cliente);
    } catch (e) {
      setSchede([]); setErrore(e instanceof Error ? e.message : tr('File non valido.', 'Invalid file.'));
    }
  };
  const importa = async () => {
    if (!schede) return;
    setInCorso(true); setErrore('');
    let fatte = 0;
    try {
      // una alla volta, nell'ordine del file: se una fallisce ci si ferma e si dice quante sono già state create
      for (let i = 0; i < schede.length; i++) {
        if (!scelte[i]) continue;
        await creaScheda(schede[i].nome, clienteId, schede[i].esercizi);
        fatte++; setCreate(fatte);
      }
      await onFatto();
      chiudi();
    } catch (e) {
      setErrore(tr(
        `Importazione interrotta dopo ${fatte} schede create: ${e instanceof Error ? e.message : 'errore'}. Le schede già create restano, controlla prima di riprovare.`,
        `Import stopped after ${fatte} programmes created: ${e instanceof Error ? e.message : 'error'}. The ones already created stay, check before retrying.`,
      ));
      await onFatto();
    } finally {
      setInCorso(false);
    }
  };
  const quante = scelte.filter(Boolean).length;
  const nomeDiverso = nomeNelFile && nomeNelFile.trim().toLowerCase() !== nomeCliente.trim().toLowerCase();

  return (
    <>
      <button type="button" className="btn-secondary shrink-0" onClick={() => fileRef.current?.click()}>
        {tr('Importa schede', 'Import programmes')}
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) leggi(f); e.target.value = ''; }} />
      {schede && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={tr('Importa schede', 'Import programmes')}>
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-b-none sm:rounded-b-2xl">
            <h2 className="section-title mb-1">{tr(`Importa schede per ${nomeCliente}`, `Import programmes for ${nomeCliente}`)}</h2>
            <p className="mb-4 text-sm text-muted">{tr('Vengono create schede nuove. Quelle che il cliente ha già non vengono toccate.', 'New programmes are created. The client’s existing ones are not touched.')}</p>
            {nomeDiverso && (
              <p className="mb-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
                {tr(`Attenzione: il file è stato preparato per "${nomeNelFile}". Controlla di essere nel cliente giusto.`, `Note: the file was prepared for "${nomeNelFile}". Check you are on the right client.`)}
              </p>
            )}
            {errore && <p className="alert-error mb-3">{errore}</p>}
            <ul className="space-y-2">
              {schede.map((s, i) => (
                <li key={i} className="rounded-xl border border-line p-3">
                  <label className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1 h-5 w-5" checked={scelte[i]} disabled={inCorso} onChange={(e) => setScelte(scelte.map((x, j) => (j === i ? e.target.checked : x)))} />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{s.nome}</span>
                      <span className="block text-sm text-muted">
                        {s.esercizi.map((e) => `${e.nome} ${riassuntoSerie({ ...e, id: 0, schedaId: 0 })}`).join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={chiudi} disabled={inCorso}>{tr('Annulla', 'Cancel')}</button>
              {schede.length > 0 && (
                <button type="button" className="btn-primary" onClick={importa} disabled={inCorso || quante === 0}>
                  {inCorso ? tr(`Creo… ${create}/${quante}`, `Creating… ${create}/${quante}`) : tr(`Crea ${quante} ${quante === 1 ? 'scheda' : 'schede'}`, `Create ${quante} programme${quante === 1 ? '' : 's'}`)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
