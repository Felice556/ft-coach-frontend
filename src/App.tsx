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
      <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
        <h1>Palestra</h1>

        {!modalitaRegistrazione ? (
          <form onSubmit={handleLogin}>
            <h2>Accedi</h2>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Accedi</button>
            <p>
              Non hai un account?{' '}
              <button type="button" onClick={() => setModalitaRegistrazione(true)}>
                Registrati
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <h2>Registrati</h2>
            <input placeholder="Nome" value={nomeInput} onChange={(e) => setNomeInput(e.target.value)} />
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <select value={ruoloScelto} onChange={(e) => setRuoloScelto(e.target.value as Ruolo)}>
              <option value="CLIENTE">Cliente</option>
              <option value="TRAINER">Trainer</option>
            </select>
            <button type="submit">Registrati</button>
            <p>
              <button type="button" onClick={() => setModalitaRegistrazione(false)}>
                Torna al login
              </button>
            </p>
          </form>
        )}

        {errore && <p style={{ color: 'crimson' }}>{errore}</p>}
      </div>
    );
  }

  // Loggato: smistamento in base al ruolo. Il ruolo arriva dal token/localStorage,
  // non lo decidiamo noi lato frontend — il backend è la fonte di verità.
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Ciao, {nome}</h1>
        <button onClick={handleLogout}>Esci</button>
      </header>

      {ruolo === 'TRAINER' ? <TrainerDashboard /> : <ClienteDashboard />}
    </div>
  );
}
