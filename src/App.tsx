import { useEffect, useState } from 'react';
import { EVENTO_CAMBIO_PASSWORD, EVENTO_SESSIONE_SCADUTA, login, register, Ruolo } from './api';
import TrainerDashboard from './TrainerDashboard';
import ClienteDashboard from './ClienteDashboard';
import CambioPassword from './CambioPassword';

export default function App() {
  // Stato di sessione: se c'è un token, siamo "loggati". Persistito in localStorage
  // così il refresh della pagina non ci disconnette (stesso pattern del task manager).
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [ruolo, setRuolo] = useState<Ruolo | ''>((localStorage.getItem('ruolo') as Ruolo) || '');
  const [nome, setNome] = useState(localStorage.getItem('nome') || '');

  const [modalitaRegistrazione, setModalitaRegistrazione] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeInput, setNomeInput] = useState('');
  const [ruoloScelto, setRuoloScelto] = useState<Ruolo>('CLIENTE');
  // Codice segreto per creare un account trainer (quello di CODICE_TRAINER nel .env del backend).
  const [codiceTrainer, setCodiceTrainer] = useState('');
  const [errore, setErrore] = useState('');

  // Sessione scaduta mentre l'app è aperta: invece di buttare fuori l'utente (e fargli
  // perdere quello che stava scrivendo) mostriamo un login in sovrimpressione.
  // Le schermate sotto restano montate, con tutti i dati inseriti.
  const [sessioneScaduta, setSessioneScaduta] = useState(false);
  // Cambia solo se nel riquadro accede una persona DIVERSA: allora le schermate
  // ripartono da zero, per non mostrare a lei i dati dell'altro utente.
  const [chiaveUtente, setChiaveUtente] = useState(0);

  // Password temporanea (reimpostata dal trainer): finché non se ne sceglie una nuova,
  // al posto dell'app c'è solo la schermata di cambio. Salvato anche nel telefono,
  // così ricaricando la pagina non si salta il passaggio.
  const [devoCambiarePassword, setDevoCambiarePassword] = useState(localStorage.getItem('passwordTemporanea') === '1');
  // Finestra "Cambia password" aperta dal bottone in alto (cambio volontario).
  const [cambioPasswordAperto, setCambioPasswordAperto] = useState(false);

  useEffect(() => {
    const quandoScade = () => setSessioneScaduta(true);
    const quandoServeCambio = () => {
      localStorage.setItem('passwordTemporanea', '1');
      setDevoCambiarePassword(true);
    };
    window.addEventListener(EVENTO_SESSIONE_SCADUTA, quandoScade);
    window.addEventListener(EVENTO_CAMBIO_PASSWORD, quandoServeCambio);
    return () => {
      window.removeEventListener(EVENTO_SESSIONE_SCADUTA, quandoScade);
      window.removeEventListener(EVENTO_CAMBIO_PASSWORD, quandoServeCambio);
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrore('');
    try {
      const dati = await login(email, password);
      if (sessioneScaduta && (dati.nome !== nome || dati.ruolo !== ruolo)) setChiaveUtente((k) => k + 1);
      localStorage.setItem('token', dati.token);
      localStorage.setItem('ruolo', dati.ruolo);
      localStorage.setItem('nome', dati.nome);
      setToken(dati.token);
      setRuolo(dati.ruolo);
      setNome(dati.nome);
      setSessioneScaduta(false);
      setPassword('');
      if (dati.passwordTemporanea) {
        localStorage.setItem('passwordTemporanea', '1');
        setDevoCambiarePassword(true);
      }
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore di login');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrore('');
    try {
      await register(nomeInput, email, password, ruoloScelto, ruoloScelto === 'TRAINER' ? codiceTrainer : undefined);
      setModalitaRegistrazione(false);
      setErrore('Registrazione completata, ora accedi');
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore di registrazione');
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('ruolo');
    localStorage.removeItem('nome');
    localStorage.removeItem('passwordTemporanea');
    setToken('');
    setRuolo('');
    setNome('');
    setSessioneScaduta(false);
    setDevoCambiarePassword(false);
    setCambioPasswordAperto(false);
  }

  // Password cambiata dopo un reset: le schermate ripartono da zero e ricaricano i dati.
  function passwordTemporaneaCambiata() {
    setToken(localStorage.getItem('token') || '');
    setDevoCambiarePassword(false);
    setChiaveUtente((k) => k + 1);
  }

  function passwordCambiata() {
    setToken(localStorage.getItem('token') || '');
    setCambioPasswordAperto(false);
  }

  // Non ancora loggato: form di login/registrazione
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">
              FT Coach<span className="text-accent">.</span>
            </h1>
            <div className="mx-auto mt-3 h-1 w-12 bg-accent" />
          </div>

          <div className="card border-t-4 border-t-accent p-6 sm:p-8">
            {!modalitaRegistrazione ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-xl font-bold">Accedi</h2>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" autoComplete="email" autoCapitalize="none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    className="input"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full py-2.5">
                  Accedi
                </button>
                <p className="text-center text-sm text-muted">
                  Non hai un account?{' '}
                  <button type="button" className="btn-link" onClick={() => setModalitaRegistrazione(true)}>
                    Registrati
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <h2 className="text-xl font-bold">Registrati</h2>
                <div>
                  <label className="label">Nome</label>
                  <input className="input" placeholder="Nome" value={nomeInput} onChange={(e) => setNomeInput(e.target.value)} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" autoComplete="email" autoCapitalize="none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    className="input"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Ruolo</label>
                  <select
                    className="input"
                    value={ruoloScelto}
                    onChange={(e) => setRuoloScelto(e.target.value as Ruolo)}
                  >
                    <option value="CLIENTE">Cliente</option>
                    <option value="TRAINER">Trainer</option>
                  </select>
                </div>
                {ruoloScelto === 'TRAINER' && (
                  <div>
                    <label className="label">Codice trainer</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Codice segreto"
                      value={codiceTrainer}
                      onChange={(e) => setCodiceTrainer(e.target.value)}
                    />
                  </div>
                )}
                <button type="submit" className="btn-primary w-full py-2.5">
                  Registrati
                </button>
                <p className="text-center text-sm">
                  <button type="button" className="btn-link" onClick={() => setModalitaRegistrazione(false)}>
                    Torna al login
                  </button>
                </p>
              </form>
            )}

            {errore && (
              <p
                className={`mt-4 ${
                  errore.startsWith('Registrazione completata') ? 'alert-success' : 'alert-error'
                }`}
              >
                {errore}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loggato: smistamento in base al ruolo. Il ruolo arriva dal token/localStorage,
  // non lo decidiamo noi lato frontend — il backend è la fonte di verità.
  return (
    <div className="min-h-screen">
      {/* pt con safe-area: se l'app è aggiunta alla schermata Home, non finisce sotto l'orologio */}
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-lg font-extrabold tracking-tight">
              FT Coach<span className="text-accent">.</span>
            </span>
            <span className="hidden rounded-md border border-accent px-2 py-0.5 text-xs font-semibold uppercase sm:inline">
              {ruolo === 'TRAINER' ? 'Trainer' : 'Cliente'}
            </span>
          </div>
          <div className="flex shrink-0 gap-2">
            {!devoCambiarePassword && (
              <button className="btn-ghost" onClick={() => setCambioPasswordAperto(true)}>
                Password
              </button>
            )}
            <button className="btn-secondary" onClick={handleLogout}>
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-6 text-xl font-extrabold tracking-tight text-soft sm:text-3xl sm:text-ink">
          Ciao, <span className="underline decoration-accent decoration-4 underline-offset-4">{nome}</span>
        </h1>

        {devoCambiarePassword ? (
          // Dopo un reset del trainer: prima la nuova password, poi l'app.
          <div className="flex justify-center">
            <CambioPassword obbligatorio onFatto={passwordTemporaneaCambiata} />
          </div>
        ) : ruolo === 'TRAINER' ? (
          <TrainerDashboard key={chiaveUtente} />
        ) : (
          <ClienteDashboard key={chiaveUtente} />
        )}
      </main>

      {cambioPasswordAperto && !devoCambiarePassword && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <CambioPassword
            obbligatorio={false}
            onFatto={passwordCambiata}
            onAnnulla={() => setCambioPasswordAperto(false)}
          />
        </div>
      )}

      {sessioneScaduta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <form onSubmit={handleLogin} className="card w-full max-w-sm space-y-4 border-t-4 border-t-accent p-6">
            <div>
              <h2 className="text-lg font-bold">Sessione scaduta</h2>
              <p className="mt-1 text-sm text-soft">
                Accedi di nuovo: quello che stavi scrivendo è ancora lì sotto, non si è perso nulla.
              </p>
            </div>
            <input className="input" type="email" autoComplete="email" autoCapitalize="none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" className="btn-primary w-full py-2.5">Accedi</button>
            <button type="button" className="btn-link w-full text-sm" onClick={handleLogout}>Esci</button>
            {errore && <p className="alert-error">{errore}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
