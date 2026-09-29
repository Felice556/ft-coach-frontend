import { ReactNode, useEffect, useRef, useState } from 'react';
import { EVENTO_CAMBIO_PASSWORD, EVENTO_SESSIONE_SCADUTA, getInfoRegistrazione, login, register, Ruolo } from './api';
import TrainerDashboard from './TrainerDashboard';
import ClienteDashboard from './ClienteDashboard';
import CambioPassword from './CambioPassword';
import InformativaPrivacy from './Privacy';
import { leggiSceltaTema, salvaSceltaTema, SceltaTema } from './tema';

// Impostazioni: tema dell'app (salvato su questo telefono) e cambio password.
function Impostazioni({ onCambiaPassword, onPrivacy, onChiudi }: { onCambiaPassword: () => void; onPrivacy: () => void; onChiudi: () => void }) {
  const [tema, setTema] = useState<SceltaTema>(leggiSceltaTema);
  const opzioni: { valore: SceltaTema; nome: string; descrizione: string }[] = [
    { valore: 'automatico', nome: 'Automatico', descrizione: 'Come il telefono' },
    { valore: 'chiaro', nome: 'Chiaro', descrizione: 'Sempre chiaro' },
    { valore: 'scuro', nome: 'Scuro', descrizione: 'Sempre scuro' },
  ];
  function scegli(valore: SceltaTema) {
    setTema(valore);
    salvaSceltaTema(valore);
  }
  return (
    <div className="card w-full space-y-6 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h2 id="settings-title" className="text-2xl font-bold tracking-tight">Impostazioni</h2>
        <button type="button" className="btn-secondary px-3" onClick={onChiudi}>Chiudi</button>
      </div>
      <fieldset>
        <legend className="label">Tema</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {opzioni.map((o) => (
            <button
              key={o.valore}
              type="button"
              role="radio"
              aria-checked={tema === o.valore}
              onClick={() => scegli(o.valore)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${
                tema === o.valore ? 'border-accent-strong bg-accent text-accent-ink' : 'border-line bg-field text-ink hover:border-accent-strong'
              }`}
            >
              {o.nome}
              <span className={`text-xs font-normal ${tema === o.valore ? 'opacity-80' : 'text-muted'}`}>{o.descrizione}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">La scelta vale per questo telefono o computer.</p>
      </fieldset>
      <div>
        <p className="label">Account</p>
        <button type="button" className="btn-secondary w-full" onClick={onCambiaPassword}>Cambia password</button>
        <button type="button" className="btn-link mt-3 w-full text-sm" onClick={onPrivacy}>Informativa privacy</button>
      </div>
    </div>
  );
}


function Brand({ compact = false, suFoto = false }: { compact?: boolean; suFoto?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2 sm:gap-3" : "flex items-center gap-3"}>
      <span className={`flex shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink ${compact ? "h-7 w-7 sm:h-10 sm:w-10" : "h-10 w-10"}`} aria-hidden="true">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 9v6m10-6v6M4 10v4m16-4v4M7 12h10M7 8H5v8h2m10-8h2v8h-2" />
        </svg>
      </span>
      <div>
        <span className={`block whitespace-nowrap font-black uppercase tracking-[-0.05em] ${suFoto ? 'text-white' : 'text-ink'} ${compact ? "text-base sm:text-xl" : "text-xl"}`}>FT COACH<span className={suFoto ? 'text-accent' : 'text-accent-strong'}>.</span></span>
        {!compact && <span className={`block text-[10px] font-bold uppercase tracking-[0.15em] ${suFoto ? 'text-white/70' : 'text-muted'}`}>Forza. Metodo. Progressi.</span>}
      </div>
    </div>
  );
}

function Modal({ children, titleId, onClose }: { children: ReactNode; titleId: string; onClose?: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const focusable = () => Array.from(element?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]') || []);
    focusable()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && onClose) onClose();
      if (event.key !== 'Tab') return;
      const fields = focusable();
      const first = fields[0];
      const last = fields[fields.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    element?.addEventListener('keydown', handleKey);
    return () => {
      element?.removeEventListener('keydown', handleKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} className="my-auto w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  // Stato di sessione: se c'è un token, siamo "loggati". Persistito in localStorage
  // così il refresh della pagina non ci disconnette (stesso pattern del task manager).
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [ruolo, setRuolo] = useState<Ruolo | ''>((localStorage.getItem('ruolo') as Ruolo) || '');
  const [nome, setNome] = useState(localStorage.getItem('nome') || '');

  // Link d'invito (…/?invito=K7M3-Q9TX): si apre direttamente la registrazione con il codice già scritto.
  const invitoDalLink = new URLSearchParams(window.location.search).get('invito') || '';
  const [modalitaRegistrazione, setModalitaRegistrazione] = useState(invitoDalLink !== '');
  const [codiceInvito, setCodiceInvito] = useState(invitoDalLink);
  const [invitoObbligatorio, setInvitoObbligatorio] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeInput, setNomeInput] = useState('');
  const [ruoloScelto, setRuoloScelto] = useState<Ruolo>('CLIENTE');
  // Codice segreto per creare un account trainer (quello di CODICE_TRAINER nel .env del backend).
  const [codiceTrainer, setCodiceTrainer] = useState('');
  const [errore, setErrore] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const [mostraPassword, setMostraPassword] = useState(false);
  // Informativa privacy aperta, e consenso dato in registrazione (serve per peso e massa grassa).
  const [privacyAperta, setPrivacyAperta] = useState(false);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);

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
  const [impostazioniAperte, setImpostazioniAperte] = useState(false);

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
    if (inInvio) return;
    setErrore('');
    setInInvio(true);
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
      setMostraPassword(false);
      if (dati.passwordTemporanea) {
        localStorage.setItem('passwordTemporanea', '1');
        setDevoCambiarePassword(true);
      }
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore di login');
    } finally {
      setInInvio(false);
    }
  }

  // Quando si apre la registrazione chiediamo al server se serve l'invito (per il campo obbligatorio).
  useEffect(() => {
    if (!modalitaRegistrazione) return;
    getInfoRegistrazione()
      .then((info) => setInvitoObbligatorio(info.invitoObbligatorio))
      .catch(() => setInvitoObbligatorio(false)); // server vecchio o irraggiungibile: il campo resta facoltativo
  }, [modalitaRegistrazione]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setErrore('');
    if (!consensoPrivacy) {
      setErrore('Per registrarti devi accettare l’informativa privacy');
      return;
    }
    setInInvio(true);
    try {
      await register(
        nomeInput,
        email,
        password,
        ruoloScelto,
        ruoloScelto === 'TRAINER' ? codiceTrainer : undefined,
        ruoloScelto === 'CLIENTE' ? codiceInvito : undefined
      );
      setModalitaRegistrazione(false);
      setCodiceInvito('');
      // Il codice è stato usato: lo togliamo dall'indirizzo, così un "indietro" non lo ripropone.
      if (invitoDalLink) window.history.replaceState(null, '', window.location.pathname);
      setErrore('Registrazione completata, ora accedi');
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore di registrazione');
    } finally {
      setInInvio(false);
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
    setImpostazioniAperte(false);
    setErrore('');
    setPassword('');
    setMostraPassword(false);
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

  function cambiaModalita() {
    setModalitaRegistrazione((attuale) => !attuale);
    setErrore('');
    setMostraPassword(false);
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full max-w-6xl">
          <div className="grid overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_80px_-30px_rgba(0,0,0,0.55)] lg:min-h-[710px] lg:grid-cols-[1.05fr_1fr]">
            <section className="relative flex min-h-[275px] flex-col overflow-hidden bg-[#171717] p-6 sm:min-h-[340px] sm:p-10 lg:p-12">
              <img src="/training-floor.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_40%] opacity-65" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/35" />
              <div className="relative z-10"><Brand suFoto /></div>
              <div className="relative z-10 mt-auto pt-10 lg:pt-20">
                <p className="mb-4 hidden text-xs font-bold uppercase tracking-[0.18em] text-accent sm:block">Il tuo prossimo livello</p>
                <h1 className="max-w-sm text-[2.35rem] font-black uppercase leading-[0.95] tracking-[-0.06em] text-white sm:text-[3.5rem] lg:text-[3.9rem]">Allenati.<br />Migliora.<br /><span className="text-accent">Ripeti.</span></h1>
                <p className="mt-6 hidden max-w-xs text-sm leading-6 text-white/80 lg:block">Schede mirate. Carichi sotto controllo. Un programma da seguire, una serie alla volta.</p>
              </div>
              <div className="relative z-10 mt-8 flex items-center gap-3 border-t border-white/20 pt-4 lg:mt-10 lg:pt-6">
                <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
                <button type="button" className="min-h-11 text-xs font-bold uppercase tracking-[0.16em] text-white/80 underline-offset-4 hover:text-white hover:underline" onClick={() => setPrivacyAperta(true)}>
                  Informativa privacy
                </button>
              </div>
            </section>
            <section className="flex items-center p-6 sm:p-10 lg:p-12">
              <div className="mx-auto w-full max-w-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-strong">Il tuo allenamento</p>
                <h2 className="text-3xl font-black uppercase leading-none tracking-[-0.045em] sm:text-4xl">{modalitaRegistrazione ? 'Crea il tuo account.' : 'Bentornato.'}</h2>
                <p className="mt-3 mb-8 text-sm leading-6 text-muted">{modalitaRegistrazione ? 'Registra il tuo account e inizia a organizzare il tuo allenamento.' : 'Accedi alle tue schede. Registra i carichi. Tieni traccia di ogni sessione.'}</p>
                <form onSubmit={modalitaRegistrazione ? handleRegister : handleLogin} className="space-y-5" aria-busy={inInvio}>
                  {modalitaRegistrazione && <div><label htmlFor="auth-name" className="label">Nome</label><input id="auth-name" name="name" className="input" autoComplete="name" placeholder="Il tuo nome" value={nomeInput} onChange={(e) => setNomeInput(e.target.value)} required /></div>}
                  <div>
                    <label htmlFor="auth-email" className="label">Indirizzo email</label>
                    <input id="auth-email" name="email" className="input" type="email" autoComplete="email" autoCapitalize="none" placeholder="nome@esempio.it" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label htmlFor="auth-password" className="label">Password</label>
                    <div className="relative">
                      <input id="auth-password" name="password" className="input pr-24" placeholder={modalitaRegistrazione ? 'Almeno 8 caratteri' : 'La tua password'} type={mostraPassword ? 'text' : 'password'} autoComplete={modalitaRegistrazione ? 'new-password' : 'current-password'} minLength={modalitaRegistrazione ? 8 : undefined} maxLength={modalitaRegistrazione ? 72 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <button type="button" className="absolute inset-y-0 right-1 rounded-lg px-3 text-xs font-semibold text-muted hover:text-accent-strong focus-visible:outline-accent-strong" aria-label={mostraPassword ? 'Nascondi password' : 'Mostra password'} aria-pressed={mostraPassword} onClick={() => setMostraPassword(!mostraPassword)}>{mostraPassword ? 'Nascondi' : 'Mostra'}</button>
                    </div>
                  </div>
                  {modalitaRegistrazione && <div><label htmlFor="auth-role" className="label">Come userai FT Coach?</label><select id="auth-role" name="role" className="input" value={ruoloScelto} onChange={(e) => setRuoloScelto(e.target.value as Ruolo)}><option value="CLIENTE">Sono un cliente</option><option value="TRAINER">Sono un trainer</option></select></div>}
                  {modalitaRegistrazione && ruoloScelto === 'CLIENTE' && (
                    <div>
                      <label htmlFor="auth-invite" className="label">
                        Codice invito{!invitoObbligatorio && <span className="font-normal text-muted"> (se te l’ha dato il tuo trainer)</span>}
                      </label>
                      <input
                        id="auth-invite"
                        className="input font-mono uppercase tracking-wider"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={20}
                        placeholder="Es. K7M3-Q9TX"
                        value={codiceInvito}
                        onChange={(e) => setCodiceInvito(e.target.value)}
                        required={invitoObbligatorio}
                      />
                    </div>
                  )}
                  {modalitaRegistrazione && ruoloScelto === 'TRAINER' && <div><label htmlFor="auth-trainer-code" className="label">Codice trainer</label><input id="auth-trainer-code" className="input" type="password" autoComplete="off" placeholder="Il tuo codice di accesso" value={codiceTrainer} onChange={(e) => setCodiceTrainer(e.target.value)} required /></div>}
                  {modalitaRegistrazione && (
                    <div className="flex items-start gap-3 rounded-xl border border-line bg-field p-3">
                      <input
                        id="auth-privacy"
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-accent-strong"
                        checked={consensoPrivacy}
                        onChange={(e) => setConsensoPrivacy(e.target.checked)}
                        required
                      />
                      <label htmlFor="auth-privacy" className="text-sm leading-snug text-soft">
                        Ho letto l’
                        <button type="button" className="btn-link inline p-0 text-sm" onClick={() => setPrivacyAperta(true)}>informativa privacy</button>{' '}
                        e acconsento al trattamento dei miei dati, compresi peso e massa grassa.
                      </label>
                    </div>
                  )}
                  {errore && <p role={errore.startsWith('Registrazione completata') ? 'status' : 'alert'} className={errore.startsWith('Registrazione completata') ? 'alert-success' : 'alert-error'}>{errore}</p>}
                  <button type="submit" className="btn-primary w-full py-3 uppercase tracking-wide" disabled={inInvio}>
                    {inInvio ? 'Un momento…' : modalitaRegistrazione ? 'Crea il tuo account' : 'Accedi'}
                    {!inInvio && <span aria-hidden="true" className="ml-2">→</span>}
                  </button>
                  <p className="pt-1 text-center text-sm text-muted">{modalitaRegistrazione ? 'Hai già un account?' : 'Sei nuovo qui?'}{' '}<button type="button" className="btn-link" onClick={cambiaModalita} disabled={inInvio}>{modalitaRegistrazione ? 'Accedi' : 'Crea un account'}</button></p>
                </form>
                <p className="mt-9 border-t border-line pt-5 text-center text-xs leading-5 text-muted">Schede, sessioni e progressi. Tutto sotto controllo.</p>
              </div>
            </section>
          </div>
          <p className="mt-6 text-center text-xs text-muted">FT COACH · TRAIN WITH PURPOSE</p>
        </div>
        {privacyAperta && (
          <Modal titleId="privacy-titolo" onClose={() => setPrivacyAperta(false)}>
            <InformativaPrivacy onChiudi={() => setPrivacyAperta(false)} />
          </Modal>
        )}
      </main>
    );
  }

  // Loggato: smistamento in base al ruolo. Il ruolo arriva dal token/localStorage,
  // non lo decidiamo noi lato frontend — il backend è la fonte di verità.
  return (
    <div className="min-h-screen">
      {/* pt con safe-area: se l'app è aggiunta alla schermata Home, non finisce sotto l'orologio */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Brand compact />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="mr-1 hidden items-center gap-2.5 border-r border-line pr-4 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-strong" aria-hidden="true">{nome.trim().charAt(0).toUpperCase()}</span>
              <div className="max-w-36"><span className="block truncate text-sm font-semibold">{nome}</span><span className="block text-xs text-muted">{ruolo === 'TRAINER' ? 'Trainer' : 'Cliente'}</span></div>
            </div>
            {!devoCambiarePassword && (
              <button type="button" className="btn-ghost px-3" onClick={() => setImpostazioniAperte(true)} aria-label="Impostazioni: tema e password">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
                <span className="hidden sm:inline">Impostazioni</span>
              </button>
            )}
            <button type="button" className="btn-secondary px-3" onClick={handleLogout}>Esci</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 sm:mb-9">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">{ruolo === 'TRAINER' ? 'Area trainer' : 'Allenamento'}</p>
          <h1 className="break-words text-3xl font-black uppercase tracking-[-0.045em] sm:text-4xl">Ciao, {nome}<span className="text-accent-strong">.</span></h1>
          <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{ruolo === 'TRAINER' ? 'Gestisci clienti, programmi e risultati.' : 'Scegli la scheda. Registra le serie. Costruisci il prossimo risultato.'}</p>
        </div>

        {devoCambiarePassword ? (
          // Dopo un reset del trainer: prima la nuova password, poi l'app.
          <div className="flex justify-center"><CambioPassword obbligatorio onFatto={passwordTemporaneaCambiata} /></div>
        ) : ruolo === 'TRAINER' ? <TrainerDashboard key={chiaveUtente} /> : <ClienteDashboard key={chiaveUtente} />}
      </main>

      {impostazioniAperte && !cambioPasswordAperto && !devoCambiarePassword && (
        <Modal titleId="settings-title" onClose={() => setImpostazioniAperte(false)}>
          <Impostazioni
            onChiudi={() => setImpostazioniAperte(false)}
            onCambiaPassword={() => {
              setImpostazioniAperte(false);
              setCambioPasswordAperto(true);
            }}
            onPrivacy={() => {
              setImpostazioniAperte(false);
              setPrivacyAperta(true);
            }}
          />
        </Modal>
      )}

      {privacyAperta && (
        <Modal titleId="privacy-titolo" onClose={() => setPrivacyAperta(false)}>
          <InformativaPrivacy onChiudi={() => setPrivacyAperta(false)} />
        </Modal>
      )}

      {cambioPasswordAperto && !devoCambiarePassword && <Modal titleId="change-password-title" onClose={() => setCambioPasswordAperto(false)}><CambioPassword obbligatorio={false} onFatto={passwordCambiata} onAnnulla={() => setCambioPasswordAperto(false)} /></Modal>}

      {sessioneScaduta && (
        <Modal titleId="session-title">
          <form onSubmit={handleLogin} className="card w-full space-y-5 p-6 sm:p-8" aria-busy={inInvio}>
            <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-strong">Riprendi da qui</p><h2 id="session-title" className="text-2xl font-black uppercase tracking-tight">Accedi di nuovo</h2><p className="mt-2 text-sm leading-6 text-soft">La sessione è scaduta. Accedi per continuare: i dati che stavi inserendo restano nella pagina.</p></div>
            <div><label htmlFor="session-email" className="label">Indirizzo email</label><input id="session-email" className="input" type="email" autoComplete="email" autoCapitalize="none" placeholder="nome@esempio.it" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label htmlFor="session-password" className="label">Password</label><input id="session-password" className="input" type="password" autoComplete="current-password" placeholder="La tua password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            {errore && <p role="alert" className="alert-error">{errore}</p>}
            <button type="submit" className="btn-primary w-full py-3 uppercase tracking-wide" disabled={inInvio}>{inInvio ? 'Accesso in corso…' : 'Accedi e continua'}</button>
            <button type="button" className="btn-link w-full text-sm" onClick={handleLogout}>Esci dall’account</button>
          </form>
        </Modal>
      )}
    </div>
  );
}



