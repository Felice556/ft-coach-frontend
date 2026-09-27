import { useState } from 'react';
import { login, register, Ruolo } from './api';
import TrainerDashboard from './TrainerDashboard';
import ClienteDashboard from './ClienteDashboard';

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
  const [errore, setErrore] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrore('');
    try {
      const dati = await login(email, password);
      localStorage.setItem('token', dati.token);
      localStorage.setItem('ruolo', dati.ruolo);
      localStorage.setItem('nome', dati.nome);
      setToken(dati.token);
      setRuolo(dati.ruolo);
      setNome(dati.nome);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore di login');
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrore('');
    try {
      await register(nomeInput, email, password, ruoloScelto);
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
    setToken('');
    setRuolo('');
    setNome('');
  }

  // Non ancora loggato: form di login/registrazione
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Palestra<span className="text-accent">.</span>
            </h1>
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-accent" />
          </div>

          <div className="card border-t-4 border-t-accent p-6 sm:p-8">
            {!modalitaRegistrazione ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-xl font-bold">Accedi</h2>
                <div>
                  <label className="label">Email</label>
                  <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
                <p className="text-center text-sm text-neutral-600">
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
                  <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-lg font-extrabold tracking-tight">
              Palestra<span className="text-accent">.</span>
            </span>
            <span className="hidden rounded-full border border-accent px-2 py-0.5 text-xs font-semibold uppercase sm:inline">
              {ruolo === 'TRAINER' ? 'Trainer' : 'Cliente'}
            </span>
          </div>
          <button className="btn-secondary" onClick={handleLogout}>
            Esci
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Ciao, <span className="underline decoration-accent decoration-4 underline-offset-4">{nome}</span>
        </h1>

        {ruolo === 'TRAINER' ? <TrainerDashboard /> : <ClienteDashboard />}
      </main>
    </div>
  );
}
