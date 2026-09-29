import { useState } from 'react';
import { cambiaMiaPassword } from './api';

interface Props {
  // true = dopo un reset del trainer: niente "Annulla", la nuova password va scelta per forza.
  obbligatorio: boolean;
  onFatto: () => void;
  onAnnulla?: () => void;
}

// Schermata per cambiare la propria password (trainer e clienti).
export default function CambioPassword({ obbligatorio, onFatto, onAnnulla }: Props) {
  const [attuale, setAttuale] = useState('');
  const [nuova, setNuova] = useState('');
  const [conferma, setConferma] = useState('');
  const [mostra, setMostra] = useState(false);
  const [errore, setErrore] = useState('');
  const [inInvio, setInInvio] = useState(false);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setErrore('');
    if (nuova.length < 8) {
      setErrore('La nuova password deve avere almeno 8 caratteri');
      return;
    }
    if (nuova !== conferma) {
      setErrore('Le due password nuove non coincidono');
      return;
    }
    setInInvio(true);
    try {
      const { token } = await cambiaMiaPassword(attuale, nuova);
      // Token nuovo: questo dispositivo resta collegato, gli altri vengono disconnessi.
      localStorage.setItem('token', token);
      localStorage.removeItem('passwordTemporanea');
      onFatto();
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel cambio password');
    } finally {
      setInInvio(false);
    }
  }

  const tipo = mostra ? 'text' : 'password';

  return (
    <form onSubmit={salva} className="card w-full max-w-sm space-y-4 border-t-4 border-t-accent p-6">
      <div>
        <h2 className="text-lg font-bold">{obbligatorio ? 'Scegli una nuova password' : 'Cambia password'}</h2>
        <p className="mt-1 text-sm text-soft">
          {obbligatorio
            ? 'Il tuo trainer ti ha dato una password temporanea. Scegline una tua: la saprai solo tu.'
            : 'Dopo il cambio, gli altri telefoni o computer collegati dovranno accedere di nuovo.'}
        </p>
      </div>
      <div>
        <label className="label">{obbligatorio ? 'Password temporanea' : 'Password attuale'}</label>
        <input className="input" type={tipo} autoComplete="current-password" value={attuale} onChange={(e) => setAttuale(e.target.value)} required />
      </div>
      <div>
        <label className="label">Nuova password (almeno 8 caratteri)</label>
        <input className="input" type={tipo} autoComplete="new-password" maxLength={72} value={nuova} onChange={(e) => setNuova(e.target.value)} required />
      </div>
      <div>
        <label className="label">Ripeti la nuova password</label>
        <input className="input" type={tipo} autoComplete="new-password" maxLength={72} value={conferma} onChange={(e) => setConferma(e.target.value)} required />
      </div>
      <label className="flex items-center gap-2 text-sm text-soft">
        <input type="checkbox" checked={mostra} onChange={(e) => setMostra(e.target.checked)} />
        Mostra le password
      </label>
      {errore && <p className="alert-error">{errore}</p>}
      <button type="submit" className="btn-primary w-full py-2.5" disabled={inInvio}>
        {inInvio ? 'Salvo…' : 'Salva nuova password'}
      </button>
      {!obbligatorio && onAnnulla && (
        <button type="button" className="btn-link w-full text-sm" onClick={onAnnulla}>
          Annulla
        </button>
      )}
    </form>
  );
}
