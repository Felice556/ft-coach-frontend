import { ReactNode, useEffect, useRef, useState } from 'react';
import { EVENTO_CAMBIO_PASSWORD, EVENTO_IN_ATTESA, EVENTO_SESSIONE_SCADUTA, EVENTO_SOSPESO, FASCE_CLIENTI, login, register, Ruolo } from './api';
import AttesaApprovazione from './AttesaApprovazione';
import TrainerDashboard from './TrainerDashboard';
import ClienteDashboard from './ClienteDashboard';
import CambioPassword from './CambioPassword';
import EliminaAccount from './EliminaAccount';
import IlTuoTrainer from './IlTuoTrainer';
import InformativaPrivacy from './Privacy';
import { leggiSceltaTema, salvaSceltaTema, SceltaTema } from './tema';
import { cambiaLingua, lingua, Lingua, tr } from './lingua';

// Scelta della lingua: due bottoni, ognuno scritto nella sua lingua. Cambiando, la pagina si ricarica.
// "piccola": la versione discreta per la schermata di accesso, che non ruba la scena al bottone Accedi.
function SceltaLingua({ piccola = false }: { piccola?: boolean }) {
  const opzioni: { valore: Lingua; nome: string }[] = [
    { valore: 'it', nome: 'Italiano' },
    { valore: 'en', nome: 'English' },
  ];
  if (piccola) {
    return (
      <div className="flex justify-center">
        <div className="inline-flex gap-1 rounded-full border border-line p-1" role="radiogroup" aria-label={tr('Lingua', 'Language')}>
          {opzioni.map((o) => (
            <button
              key={o.valore}
              type="button"
              role="radio"
              lang={o.valore}
              aria-checked={lingua === o.valore}
              onClick={() => cambiaLingua(o.valore)}
              className={`min-h-9 rounded-full px-4 text-xs font-semibold transition-colors ${
                lingua === o.valore ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
              }`}
            >
              {o.nome}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={tr('Lingua', 'Language')}>
      {opzioni.map((o) => (
        <button
          key={o.valore}
          type="button"
          role="radio"
          lang={o.valore}
          aria-checked={lingua === o.valore}
          onClick={() => cambiaLingua(o.valore)}
          className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
            lingua === o.valore ? 'border-accent-strong bg-accent text-accent-ink' : 'border-line bg-field text-ink hover:border-accent-strong'
          }`}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

// Impostazioni: lingua e tema dell'app (salvati su questo telefono) e cambio password.
function Impostazioni({ cliente, onCambiaPassword, onEliminaAccount, onPrivacy, onChiudi, onTrainerCambiato }: { cliente: boolean; onCambiaPassword: () => void; onEliminaAccount: () => void; onPrivacy: () => void; onChiudi: () => void; onTrainerCambiato: () => void }) {
  const [tema, setTema] = useState<SceltaTema>(leggiSceltaTema);
  const opzioni: { valore: SceltaTema; nome: string; descrizione: string }[] = [
    { valore: 'automatico', nome: tr('Automatico', 'Automatic'), descrizione: tr('Come il telefono', 'Like your phone') },
    { valore: 'chiaro', nome: tr('Chiaro', 'Light'), descrizione: tr('Sempre chiaro', 'Always light') },
    { valore: 'scuro', nome: tr('Scuro', 'Dark'), descrizione: tr('Sempre scuro', 'Always dark') },
  ];
  function scegli(valore: SceltaTema) {
    setTema(valore);
    salvaSceltaTema(valore);
  }
  return (
    <div className="card w-full space-y-6 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h2 id="settings-title" className="text-2xl font-bold tracking-tight">{tr('Impostazioni', 'Settings')}</h2>
        <button type="button" className="btn-secondary px-3" onClick={onChiudi}>{tr('Chiudi', 'Close')}</button>
      </div>
      <fieldset>
        <legend className="label">{tr('Lingua', 'Language')}</legend>
        <SceltaLingua />
      </fieldset>
      <fieldset>
        <legend className="label">{tr('Tema', 'Theme')}</legend>
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
        <p className="mt-2 text-xs text-muted">{tr('Lingua e tema valgono per questo telefono o computer.', 'Language and theme apply to this phone or computer.')}</p>
      </fieldset>
      {/* Solo clienti: allenarsi da soli o con un trainer */}
      {cliente && <IlTuoTrainer onCambiato={onTrainerCambiato} />}
      <div>
        <p className="label">Account</p>
        <button type="button" className="btn-secondary w-full" onClick={onCambiaPassword}>{tr('Cambia password', 'Change password')}</button>
        <button type="button" className="btn-link mt-3 w-full text-sm" onClick={onPrivacy}>{tr('Informativa privacy', 'Privacy notice')}</button>
      </div>
      {/* In fondo e separato: un'azione definitiva non deve stare vicino a quelle di tutti i giorni */}
      <div className="border-t border-line pt-5">
        <button type="button" className="btn-link w-full text-sm text-danger" onClick={onEliminaAccount}>{tr('Elimina account', 'Delete account')}</button>
      </div>
    </div>
  );
}


function Brand({ compact = false, suFoto = false }: { compact?: boolean; suFoto?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2 sm:gap-3" : "flex items-center gap-3"}>
      <span className={`flex shrink-0 items-center justify-center rounded-xl ${suFoto ? 'bg-oro text-oro-ink' : 'bg-accent text-accent-ink'} ${compact ? "h-7 w-7 sm:h-10 sm:w-10" : "h-10 w-10"}`} aria-hidden="true">
        {/* Logo di Liftio: un manubrio inclinato */}
        <svg width="26" height="26" viewBox="0 0 100 100" fill="currentColor">
          <g transform="rotate(-35 50 50)">
            <rect x="30" y="46" width="40" height="8" rx="3" />
            <rect x="18" y="30" width="10" height="40" rx="3" />
            <rect x="8" y="37" width="8" height="26" rx="3" />
            <rect x="72" y="30" width="10" height="40" rx="3" />
            <rect x="84" y="37" width="8" height="26" rx="3" />
          </g>
        </svg>
      </span>
      <div>
        <span className={`block whitespace-nowrap font-black uppercase tracking-[-0.05em] ${suFoto ? 'text-white' : 'text-ink'} ${compact ? "text-base sm:text-xl" : "text-xl"}`}>LIFTIO<span className={suFoto ? 'text-oro' : 'text-accent-strong'}>.</span></span>
        {!compact && <span className={`block text-[10px] font-bold uppercase tracking-[0.15em] ${suFoto ? 'text-white/70' : 'text-muted'}`}>{tr('Solleva, segna, migliora.', 'Lift, log, level up.')}</span>}
      </div>
    </div>
  );
}

// Messaggi della schermata di accesso che sono buone notizie (in verde), non errori.
const messaggioPositivo = (testo: string) =>
  ['Registrazione completata', 'Registration complete', 'Account eliminato', 'Account deleted'].some((inizio) => testo.startsWith(inizio));

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
  // Stato di sessione: se c'è un token, l'utente è dentro. Salvato in localStorage
  // così ricaricando la pagina non si viene disconnessi.
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [ruolo, setRuolo] = useState<Ruolo | ''>((localStorage.getItem('ruolo') as Ruolo) || '');
  const [nome, setNome] = useState(localStorage.getItem('nome') || '');

  // Link d'invito (…/?invito=K7M3-Q9TX): si apre direttamente la registrazione con il codice già scritto.
  const invitoDalLink = new URLSearchParams(window.location.search).get('invito') || '';
  // Arrivato dal vecchio indirizzo (ft-coach.pages.dev, vedi public/nuovo-indirizzo.js): mostriamo un avviso.
  const [daVecchioIndirizzo] = useState(() => new URLSearchParams(window.location.search).has('nuovo-indirizzo'));
  useEffect(() => {
    if (!daVecchioIndirizzo) return;
    // Togliamo il segnale dall'indirizzo (lasciando il resto, es. un invito), così non resta nei preferiti.
    const url = new URL(window.location.href);
    url.searchParams.delete('nuovo-indirizzo');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [daVecchioIndirizzo]);
  const [modalitaRegistrazione, setModalitaRegistrazione] = useState(invitoDalLink !== '');
  const [codiceInvito, setCodiceInvito] = useState(invitoDalLink);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Nome e cognome separati in registrazione: si salvano insieme ("Marco Rossi"),
  // così due persone con lo stesso nome non si confondono.
  const [nomeInput, setNomeInput] = useState('');
  const [cognomeInput, setCognomeInput] = useState('');
  // Come userà Liftio chi si registra: da solo, con un trainer (serve il suo codice), oppure da trainer.
  // Un link d'invito trainer (…&ruolo=trainer) apre la registrazione con "Sono un trainer" già scelto;
  // un link d'invito cliente con "Mi segue un trainer".
  const [ruoloScelto, setRuoloScelto] = useState<Ruolo | 'AUTONOMO'>(
    new URLSearchParams(window.location.search).get('ruolo') === 'trainer' ? 'TRAINER' : invitoDalLink ? 'CLIENTE' : 'AUTONOMO',
  );
  const [errore, setErrore] = useState('');
  const [inInvio, setInInvio] = useState(false);
  const [mostraPassword, setMostraPassword] = useState(false);
  // Informativa privacy aperta, e consenso dato in registrazione (serve per peso e massa grassa).
  const [privacyAperta, setPrivacyAperta] = useState(false);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);
  // Liftio è solo per maggiorenni: chi si registra lo dichiara (vedi informativa, "Solo per maggiorenni").
  const [maggiorenne, setMaggiorenne] = useState(false);

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
  // Trainer registrato da solo e non ancora approvato: al posto della dashboard c'è la schermata d'attesa.
  const [inAttesa, setInAttesa] = useState(localStorage.getItem('inAttesa') === '1');
  // Due righe con cui un trainer senza invito si presenta all'amministratore.
  const [presentazione, setPresentazione] = useState('');
  // Quanti clienti segue (a fasce): obbligatorio per i trainer senza invito.
  const [fasciaClienti, setFasciaClienti] = useState('');
  // Trainer: il campo "codice invito" si vede solo arrivando dal link d'invito o toccando "Ho un codice invito".
  // Chi trova l'app da solo vede solo i campi che gli servono e non pensa che il codice sia obbligatorio.
  const [mostraCodiceTrainer, setMostraCodiceTrainer] = useState(invitoDalLink !== '');
  const [eliminaAccountAperto, setEliminaAccountAperto] = useState(false);

  useEffect(() => {
    const quandoScade = () => setSessioneScaduta(true);
    const quandoServeCambio = () => {
      localStorage.setItem('passwordTemporanea', '1');
      setDevoCambiarePassword(true);
    };
    const quandoInAttesa = () => {
      localStorage.setItem('inAttesa', '1');
      setInAttesa(true);
    };
    window.addEventListener(EVENTO_SESSIONE_SCADUTA, quandoScade);
    window.addEventListener(EVENTO_CAMBIO_PASSWORD, quandoServeCambio);
    window.addEventListener(EVENTO_IN_ATTESA, quandoInAttesa);
    // Account sospeso mentre era dentro: si esce e la schermata di accesso spiega il motivo.
    const quandoSospeso = (e: Event) => {
      handleLogout();
      setErrore((e as CustomEvent<string>).detail || tr('Il tuo account è sospeso.', 'Your account is suspended.'));
    };
    window.addEventListener(EVENTO_SOSPESO, quandoSospeso);
    return () => {
      window.removeEventListener(EVENTO_SOSPESO, quandoSospeso);
      window.removeEventListener(EVENTO_SESSIONE_SCADUTA, quandoScade);
      window.removeEventListener(EVENTO_CAMBIO_PASSWORD, quandoServeCambio);
      window.removeEventListener(EVENTO_IN_ATTESA, quandoInAttesa);
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
      if (dati.inAttesa) localStorage.setItem('inAttesa', '1');
      else localStorage.removeItem('inAttesa');
      setInAttesa(dati.inAttesa === true);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore di login', 'Sign-in error'));
    } finally {
      setInInvio(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (inInvio) return;
    setErrore('');
    if (nomeInput.trim().length < 2 || cognomeInput.trim().length < 2) {
      setErrore(tr('Scrivi nome e cognome (almeno 2 lettere ciascuno)', 'Enter your first and last name (at least 2 letters each)'));
      return;
    }
    if (!maggiorenne) {
      setErrore(tr('Liftio è solo per maggiorenni: conferma di avere almeno 18 anni', 'Liftio is for adults only: confirm you are at least 18'));
      return;
    }
    if (!consensoPrivacy) {
      setErrore(tr('Per registrarti devi accettare l’informativa privacy', 'To sign up you need to accept the privacy notice'));
      return;
    }
    setInInvio(true);
    try {
      // Un trainer usa il codice solo se il campo è visibile (non uno scritto prima come cliente e poi nascosto).
      // Chi si allena da solo non usa codici: si collegherà a un trainer più avanti, se vorrà.
      const codiceDaUsare = (ruoloScelto === 'TRAINER' && !mostraCodiceTrainer) || ruoloScelto === 'AUTONOMO' ? '' : codiceInvito;
      const senzaInvito = ruoloScelto === 'TRAINER' && !codiceDaUsare.trim();
      const nomeCompleto = `${nomeInput.trim()} ${cognomeInput.trim()}`.replace(/\s+/g, ' ');
      const esito = await register(
        nomeCompleto,
        email,
        password,
        ruoloScelto === 'TRAINER' ? 'TRAINER' : 'CLIENTE',
        codiceDaUsare,
        senzaInvito ? presentazione : undefined,
        senzaInvito ? fasciaClienti : undefined,
      );
      setModalitaRegistrazione(false);
      setCodiceInvito('');
      setPresentazione('');
      setFasciaClienti('');
      // Il codice è stato usato: lo togliamo dall'indirizzo, così un "indietro" non lo ripropone.
      if (invitoDalLink) window.history.replaceState(null, '', window.location.pathname);
      setErrore(
        esito.inAttesa
          ? tr(
              'Registrazione completata: la tua richiesta è stata inviata all’amministratore. Accedi per vedere quando viene approvata.',
              'Registration complete: your request has been sent to the administrator. Sign in to see when it is approved.',
            )
          : tr('Registrazione completata, ora accedi', 'Registration complete, now sign in'),
      );
    } catch (err) {
      setErrore(err instanceof Error ? err.message : tr('Errore di registrazione', 'Registration error'));
    } finally {
      setInInvio(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('ruolo');
    localStorage.removeItem('nome');
    localStorage.removeItem('passwordTemporanea');
    localStorage.removeItem('inAttesa');
    setInAttesa(false);
    setToken('');
    setRuolo('');
    setNome('');
    setSessioneScaduta(false);
    setDevoCambiarePassword(false);
    setCambioPasswordAperto(false);
    setImpostazioniAperte(false);
    setEliminaAccountAperto(false);
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
            <section className="relative flex min-h-[275px] flex-col overflow-hidden bg-[#0a1430] p-6 sm:min-h-[340px] sm:p-10 lg:p-12">
              <img src="/training-floor.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[center_40%] opacity-65" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1430] via-[#0a1430]/60 to-[#0a1430]/40" />
              <div className="relative z-10"><Brand suFoto /></div>
              <div className="relative z-10 mt-auto pt-10 lg:pt-20">
                <p className="mb-4 hidden text-xs font-bold uppercase tracking-[0.18em] text-oro sm:block">{tr('Il tuo prossimo livello', 'Your next level')}</p>
                <h1 className="max-w-sm text-[2.35rem] font-black uppercase leading-[0.95] tracking-[-0.06em] text-white sm:text-[3.5rem] lg:text-[3.9rem]">{tr('Allenati.', 'Train.')}<br />{tr('Migliora.', 'Improve.')}<br /><span className="text-oro">{tr('Ripeti.', 'Repeat.')}</span></h1>
                <p className="mt-6 hidden max-w-xs text-sm leading-6 text-white/80 lg:block">{tr('Schede mirate. Carichi sotto controllo. Un programma da seguire, una serie alla volta.', 'Targeted programmes. Loads under control. A plan to follow, one set at a time.')}</p>
              </div>
              <div className="relative z-10 mt-8 flex items-center gap-3 border-t border-white/20 pt-4 lg:mt-10 lg:pt-6">
                <span className="h-1 w-1 rounded-full bg-oro" aria-hidden="true" />
                <button type="button" className="min-h-11 text-xs font-bold uppercase tracking-[0.16em] text-white/80 underline-offset-4 hover:text-white hover:underline" onClick={() => setPrivacyAperta(true)}>
                  {tr('Informativa privacy', 'Privacy notice')}
                </button>
              </div>
            </section>
            <section className="flex items-center p-6 sm:p-10 lg:p-12">
              <div className="mx-auto w-full max-w-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-strong">{tr('Il tuo allenamento', 'Your training')}</p>
                <h2 className="text-3xl font-black uppercase leading-none tracking-[-0.045em] sm:text-4xl">{modalitaRegistrazione ? tr('Crea il tuo account.', 'Create your account.') : tr('Bentornato.', 'Welcome back.')}</h2>
                <p className="mt-3 mb-8 text-sm leading-6 text-muted">
                  {modalitaRegistrazione
                    ? tr('Registra il tuo account e inizia a organizzare il tuo allenamento.', 'Sign up and start organising your training.')
                    : tr('Accedi alle tue schede. Registra i carichi. Tieni traccia di ogni sessione.', 'Open your programmes. Log your loads. Keep track of every session.')}
                </p>
                {daVecchioIndirizzo && (
                  <div role="status" className="mb-6 rounded-xl border border-accent-strong/30 bg-accent-soft px-4 py-3 text-sm leading-6 text-soft">
                    <p className="font-bold text-ink">{tr('Liftio ha un nuovo indirizzo: liftio.it', 'Liftio has a new address: liftio.it')}</p>
                    <p className="mt-1">
                      {tr(
                        'Accedi di nuovo con la tua email e password: serve solo questa volta. I tuoi dati sono tutti qui. Se avevi l’app sulla schermata Home, toglila e aggiungila di nuovo da questa pagina.',
                        'Sign in again with your email and password: you only need to do this once. All your data is here. If you had the app on your Home screen, remove it and add it again from this page.',
                      )}
                    </p>
                  </div>
                )}
                <form onSubmit={modalitaRegistrazione ? handleRegister : handleLogin} className="space-y-5" aria-busy={inInvio}>
                  {modalitaRegistrazione && (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label htmlFor="auth-name" className="label">{tr('Nome', 'First name')}</label><input id="auth-name" name="given-name" className="input" autoComplete="given-name" autoCapitalize="words" placeholder={tr('Mario', 'John')} maxLength={30} value={nomeInput} onChange={(e) => setNomeInput(e.target.value)} required /></div>
                      <div><label htmlFor="auth-surname" className="label">{tr('Cognome', 'Last name')}</label><input id="auth-surname" name="family-name" className="input" autoComplete="family-name" autoCapitalize="words" placeholder={tr('Rossi', 'Smith')} maxLength={29} value={cognomeInput} onChange={(e) => setCognomeInput(e.target.value)} required /></div>
                    </div>
                  )}
                  <div>
                    <label htmlFor="auth-email" className="label">{tr('Indirizzo email', 'Email address')}</label>
                    <input id="auth-email" name="email" className="input" type="email" autoComplete="email" autoCapitalize="none" placeholder={tr('nome@esempio.it', 'name@example.com')} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label htmlFor="auth-password" className="label">Password</label>
                    <div className="relative">
                      <input id="auth-password" name="password" className="input pr-24" placeholder={modalitaRegistrazione ? tr('Almeno 8 caratteri', 'At least 8 characters') : tr('La tua password', 'Your password')} type={mostraPassword ? 'text' : 'password'} autoComplete={modalitaRegistrazione ? 'new-password' : 'current-password'} minLength={modalitaRegistrazione ? 8 : undefined} maxLength={modalitaRegistrazione ? 72 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <button type="button" className="absolute inset-y-0 right-1 rounded-lg px-3 text-xs font-semibold text-muted hover:text-accent-strong focus-visible:outline-accent-strong" aria-label={mostraPassword ? tr('Nascondi password', 'Hide password') : tr('Mostra password', 'Show password')} aria-pressed={mostraPassword} onClick={() => setMostraPassword(!mostraPassword)}>{mostraPassword ? tr('Nascondi', 'Hide') : tr('Mostra', 'Show')}</button>
                    </div>
                  </div>
                  {modalitaRegistrazione && <div><label htmlFor="auth-role" className="label">{tr('Come userai Liftio?', 'How will you use Liftio?')}</label><select id="auth-role" name="role" className="input" value={ruoloScelto} onChange={(e) => setRuoloScelto(e.target.value as Ruolo | 'AUTONOMO')}><option value="AUTONOMO">{tr('Mi alleno da solo', 'I train on my own')}</option><option value="CLIENTE">{tr('Mi segue un trainer (ho il suo codice)', 'A trainer coaches me (I have their code)')}</option><option value="TRAINER">{tr('Sono un trainer', 'I’m a trainer')}</option></select></div>}
                  {modalitaRegistrazione && ruoloScelto === 'AUTONOMO' && (
                    <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm leading-6 text-soft">
                      <p>
                        <strong className="text-ink">{tr('Crei tu le tue schede: le prime 3 sono gratis.', 'You create your own programmes: the first 3 are free.')}</strong>{' '}
                        {tr(
                          'Se un giorno ti segue un trainer, inserisci il suo codice in Impostazioni: le tue schede restano salvate.',
                          'If a trainer coaches you one day, enter their code in Settings: your programmes stay saved.',
                        )}
                      </p>
                    </div>
                  )}
                  {modalitaRegistrazione && ruoloScelto === 'TRAINER' && !mostraCodiceTrainer && (
                    <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm leading-6 text-soft">
                      <p>
                        <strong className="text-ink">{tr('Non hai un codice invito? Nessun problema.', 'No invite code? No problem.')}</strong>{' '}
                        {tr(
                          'Registrati comunque: il tuo account sarà attivo appena l’amministratore di Liftio lo approva.',
                          'Sign up anyway: your account will be active as soon as the Liftio administrator approves it.',
                        )}
                      </p>
                      <button type="button" className="btn-link mt-1 text-sm" onClick={() => setMostraCodiceTrainer(true)}>
                        {tr('Ho un codice invito →', 'I have an invite code →')}
                      </button>
                    </div>
                  )}
                  {modalitaRegistrazione && (ruoloScelto === 'CLIENTE' || mostraCodiceTrainer) && (
                    <div>
                      <label htmlFor="auth-invite" className="label">
                        {ruoloScelto === 'TRAINER' ? tr('Codice invito trainer', 'Trainer invite code') : tr('Codice invito', 'Invite code')}
                        {ruoloScelto === 'CLIENTE' && <span className="font-normal text-muted">{tr(' (te lo dà il tuo trainer)', ' (your trainer gives it to you)')}</span>}
                        {ruoloScelto === 'TRAINER' && <span className="font-normal text-muted">{tr(' (se ce l’hai)', ' (if you have one)')}</span>}
                      </label>
                      <input
                        id="auth-invite"
                        className="input font-mono uppercase tracking-wider"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        maxLength={20}
                        placeholder={tr('Es. K7M3-Q9TX', 'E.g. K7M3-Q9TX')}
                        value={codiceInvito}
                        onChange={(e) => setCodiceInvito(e.target.value)}
                        required={ruoloScelto === 'CLIENTE'}
                      />
                      {ruoloScelto === 'TRAINER' && <p className="mt-1.5 text-xs text-muted">{tr('Con un codice invito entri subito. Senza, scrivi due righe su di te e la tua richiesta viene approvata dall’amministratore di Liftio.', 'With an invite code you get in straight away. Without one, write a couple of lines about yourself and your request is approved by the Liftio administrator.')}</p>}
                    </div>
                  )}
                  {modalitaRegistrazione && ruoloScelto === 'TRAINER' && !(mostraCodiceTrainer && codiceInvito.trim()) && (
                    <>
                    <div>
                      <label htmlFor="auth-clienti" className="label">{tr('Quanti clienti segui?', 'How many clients do you train?')}</label>
                      <select id="auth-clienti" className="input" value={fasciaClienti} onChange={(e) => setFasciaClienti(e.target.value)} required>
                        <option value="" disabled>{tr('Scegli', 'Choose')}</option>
                        {FASCE_CLIENTI.map((f) => (
                          <option key={f.valore} value={f.valore}>{f.testo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="auth-presentazione" className="label">{tr('Presentati', 'Introduce yourself')}</label>
                      <textarea
                        id="auth-presentazione"
                        className="input min-h-24"
                        maxLength={500}
                        value={presentazione}
                        onChange={(e) => setPresentazione(e.target.value)}
                      />
                    </div>
                    </>
                  )}
                  {modalitaRegistrazione && (
                    <div className="flex items-start gap-3 rounded-xl border border-line bg-field p-3">
                      <input
                        id="auth-maggiorenne"
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-accent-strong"
                        checked={maggiorenne}
                        onChange={(e) => setMaggiorenne(e.target.checked)}
                        required
                      />
                      <label htmlFor="auth-maggiorenne" className="text-sm leading-snug text-soft">
                        {tr('Dichiaro di avere almeno 18 anni.', 'I confirm I am at least 18 years old.')}
                      </label>
                    </div>
                  )}
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
                        {tr('Ho letto l’', 'I have read the ')}
                        <button type="button" className="btn-link inline p-0 text-sm" onClick={() => setPrivacyAperta(true)}>{tr('informativa privacy', 'privacy notice')}</button>{' '}
                        {tr('e acconsento al trattamento dei miei dati, compresi peso e massa grassa.', 'and consent to the processing of my data, including weight and body fat.')}
                      </label>
                    </div>
                  )}
                  {errore && <p role={messaggioPositivo(errore) ? 'status' : 'alert'} className={messaggioPositivo(errore) ? 'alert-success' : 'alert-error'}>{errore}</p>}
                  <button type="submit" className="btn-primary w-full py-3 uppercase tracking-wide" disabled={inInvio}>
                    {inInvio ? tr('Un momento…', 'One moment…') : modalitaRegistrazione ? tr('Crea il tuo account', 'Create your account') : tr('Accedi', 'Sign in')}
                    {!inInvio && <span aria-hidden="true" className="ml-2">→</span>}
                  </button>
                  <p className="pt-1 text-center text-sm text-muted">{modalitaRegistrazione ? tr('Hai già un account?', 'Already have an account?') : tr('Sei nuovo qui?', 'New here?')}{' '}<button type="button" className="btn-link" onClick={cambiaModalita} disabled={inInvio}>{modalitaRegistrazione ? tr('Accedi', 'Sign in') : tr('Crea un account', 'Create an account')}</button></p>
                </form>
                <div className="mt-6">
                  <SceltaLingua piccola />
                </div>
                <p className="mt-6 border-t border-line pt-5 text-center text-xs leading-5 text-muted">{tr('Schede, sessioni e progressi. Tutto sotto controllo.', 'Programmes, sessions and progress. All under control.')}</p>
              </div>
            </section>
          </div>
          <p className="mt-6 text-center text-xs text-muted">{tr('LIFTIO · SOLLEVA, SEGNA, MIGLIORA', 'LIFTIO · LIFT, LOG, LEVEL UP')}</p>
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
              <div className="max-w-36"><span className="block truncate text-sm font-semibold">{nome}</span><span className="block text-xs text-muted">{ruolo === 'TRAINER' ? 'Trainer' : tr('Cliente', 'Client')}</span></div>
            </div>
            {!devoCambiarePassword && (
              <button type="button" className="btn-ghost px-3" onClick={() => setImpostazioniAperte(true)} aria-label={tr('Impostazioni: lingua, tema e password', 'Settings: language, theme and password')}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
                <span className="hidden sm:inline">{tr('Impostazioni', 'Settings')}</span>
              </button>
            )}
            <button type="button" className="btn-secondary px-3" onClick={handleLogout}>{tr('Esci', 'Sign out')}</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 sm:mb-9">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">{ruolo === 'TRAINER' ? tr('Area trainer', 'Trainer area') : tr('Allenamento', 'Training')}</p>
          <h1 className="break-words text-3xl font-black uppercase tracking-[-0.045em] sm:text-4xl">{tr('Ciao', 'Hi')}, {nome}<span className="text-accent-strong">.</span></h1>
          <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
            {ruolo === 'TRAINER'
              ? tr('Gestisci clienti, programmi e risultati.', 'Manage clients, programmes and results.')
              : tr('Scegli la scheda. Registra le serie. Costruisci il prossimo risultato.', 'Pick your programme. Log your sets. Build your next result.')}
          </p>
        </div>

        {devoCambiarePassword ? (
          // Dopo un reset del trainer: prima la nuova password, poi l'app.
          <div className="flex justify-center"><CambioPassword obbligatorio onFatto={passwordTemporaneaCambiata} /></div>
        ) : ruolo === 'TRAINER' && inAttesa ? (
          // Trainer registrato da solo: aspetta l'approvazione dell'amministratore.
          <AttesaApprovazione
            onApprovato={() => {
              localStorage.removeItem('inAttesa');
              setInAttesa(false);
              setChiaveUtente((k) => k + 1);
            }}
          />
        ) : ruolo === 'TRAINER' ? <TrainerDashboard key={chiaveUtente} /> : <ClienteDashboard key={chiaveUtente} />}
      </main>

      {impostazioniAperte && !cambioPasswordAperto && !devoCambiarePassword && (
        <Modal titleId="settings-title" onClose={() => setImpostazioniAperte(false)}>
          <Impostazioni
            cliente={ruolo === 'CLIENTE'}
            onTrainerCambiato={() => {
              // La dashboard si ricarica: schede, sezioni e dati cambiano con il trainer.
              setImpostazioniAperte(false);
              setChiaveUtente((k) => k + 1);
            }}
            onChiudi={() => setImpostazioniAperte(false)}
            onCambiaPassword={() => {
              setImpostazioniAperte(false);
              setCambioPasswordAperto(true);
            }}
            onEliminaAccount={() => {
              setImpostazioniAperte(false);
              setEliminaAccountAperto(true);
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

      {eliminaAccountAperto && !devoCambiarePassword && (
        <Modal titleId="delete-account-title" onClose={() => setEliminaAccountAperto(false)}>
          <EliminaAccount
            ruolo={ruolo as Ruolo}
            onAnnulla={() => setEliminaAccountAperto(false)}
            onEliminato={() => {
              // Account cancellato: si esce e la schermata di accesso lo conferma.
              handleLogout();
              setErrore(tr('Account eliminato. Grazie per aver usato Liftio.', 'Account deleted. Thank you for using Liftio.'));
            }}
          />
        </Modal>
      )}

      {cambioPasswordAperto && !devoCambiarePassword && <Modal titleId="change-password-title" onClose={() => setCambioPasswordAperto(false)}><CambioPassword obbligatorio={false} onFatto={passwordCambiata} onAnnulla={() => setCambioPasswordAperto(false)} /></Modal>}

      {sessioneScaduta && (
        <Modal titleId="session-title">
          <form onSubmit={handleLogin} className="card w-full space-y-5 p-6 sm:p-8" aria-busy={inInvio}>
            <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-strong">{tr('Riprendi da qui', 'Pick up where you left off')}</p><h2 id="session-title" className="text-2xl font-black uppercase tracking-tight">{tr('Accedi di nuovo', 'Sign in again')}</h2><p className="mt-2 text-sm leading-6 text-soft">{tr('La sessione è scaduta. Accedi per continuare: i dati che stavi inserendo restano nella pagina.', 'Your session has expired. Sign in to continue: what you were entering stays on the page.')}</p></div>
            <div><label htmlFor="session-email" className="label">{tr('Indirizzo email', 'Email address')}</label><input id="session-email" className="input" type="email" autoComplete="email" autoCapitalize="none" placeholder={tr('nome@esempio.it', 'name@example.com')} value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label htmlFor="session-password" className="label">Password</label><input id="session-password" className="input" type="password" autoComplete="current-password" placeholder={tr('La tua password', 'Your password')} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            {errore && <p role="alert" className="alert-error">{errore}</p>}
            <button type="submit" className="btn-primary w-full py-3 uppercase tracking-wide" disabled={inInvio}>{inInvio ? tr('Accesso in corso…', 'Signing in…') : tr('Accedi e continua', 'Sign in and continue')}</button>
            <button type="button" className="btn-link w-full text-sm" onClick={handleLogout}>{tr('Esci dall’account', 'Sign out of your account')}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}



