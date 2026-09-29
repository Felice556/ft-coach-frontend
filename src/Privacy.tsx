// Informativa privacy (GDPR) mostrata nell'app: dalla pagina di accesso, dalla
// registrazione e dalle Impostazioni.
//
// Testo di base da far controllare a un professionista prima dell'uso con clienti veri.

export const TITOLARE = 'Felice Russo'; // nome e cognome di chi gestisce l'app
export const EMAIL_PRIVACY = 'felice.lgg@gmail.com'; // email a cui i clienti scrivono per la privacy
export const AGGIORNATA_IL = '29/09/2026';

function Paragrafo({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-bold">{titolo}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-soft">{children}</div>
    </section>
  );
}

export default function InformativaPrivacy({ onChiudi }: { onChiudi: () => void }) {
  return (
    <div className="card flex max-h-[85vh] w-full flex-col p-0">
      <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
        <div>
          <p className="eyebrow mb-1">FT Coach</p>
          <h2 id="privacy-titolo" className="text-2xl font-bold tracking-tight">Informativa privacy</h2>
          <p className="mt-1 text-xs text-muted">Aggiornata il {AGGIORNATA_IL}</p>
        </div>
        <button type="button" className="btn-secondary shrink-0 px-3" onClick={onChiudi}>
          Chiudi
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-soft">
          Qui trovi, in parole semplici, quali dati raccoglie FT Coach, perché e chi può vederli
          (Regolamento UE 2016/679, “GDPR”).
        </p>

        <Paragrafo titolo="Chi è il titolare">
          <p>
            {TITOLARE}, personal trainer, che gestisce l’app. Per qualsiasi domanda o richiesta sui tuoi dati scrivi a{' '}
            <span className="font-semibold text-ink">{EMAIL_PRIVACY}</span>.
          </p>
        </Paragrafo>

        <Paragrafo titolo="Quali dati raccogliamo">
          <ul className="list-disc space-y-1 pl-5">
            <li>Nome ed email, per il tuo account.</li>
            <li>Password: salvata solo in forma cifrata, nessuno può leggerla (neanche il trainer).</li>
            <li>Allenamenti: schede, serie, carichi, ripetizioni, note che scrivi e date degli allenamenti.</li>
            <li>
              Dati del corpo: <strong>peso corporeo</strong> e <strong>percentuale di massa grassa</strong>. Sono dati
              relativi alla salute e li trattiamo solo con il tuo consenso esplicito.
            </li>
          </ul>
          <p>
            Non usiamo pubblicità, cookie di profilazione né strumenti di tracciamento. Sul telefono restano salvati solo
            l’accesso e le tue preferenze (tema, suono del timer).
          </p>
        </Paragrafo>

        <Paragrafo titolo="Perché li usiamo">
          <p>
            Solo per preparare e seguire il tuo programma di allenamento e mostrarti i progressi. Base giuridica: il
            servizio che hai richiesto (art. 6.1.b GDPR) e, per peso e massa grassa, il tuo consenso esplicito (art. 9.2.a
            GDPR), che puoi ritirare quando vuoi: i dati del corpo verranno cancellati, il resto dell’app continua a
            funzionare.
          </p>
        </Paragrafo>

        <Paragrafo titolo="Chi può vederli">
          <p>
            Tu e il tuo trainer. I dati non vengono venduti né dati ad altri. Per far funzionare l’app ci appoggiamo a
            fornitori tecnici che trattano i dati per nostro conto:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Supabase: database, con server a Francoforte (UE).</li>
            <li>Render: server dell’app, a Francoforte (UE).</li>
            <li>
              Cloudflare: pubblicazione del sito. Può trattare dati tecnici di connessione (es. indirizzo IP) anche fuori
              dall’UE, con le garanzie previste dalla legge (EU-US Data Privacy Framework e clausole contrattuali standard).
            </li>
          </ul>
        </Paragrafo>

        <Paragrafo titolo="Per quanto tempo">
          <p>
            Finché il tuo account è attivo. Se chiedi la cancellazione, i dati vengono eliminati entro 30 giorni; le copie
            di sicurezza (backup) si cancellano da sole entro 60 giorni.
          </p>
        </Paragrafo>

        <Paragrafo titolo="Come li proteggiamo">
          <p>
            Connessione cifrata (HTTPS), password cifrate, ogni cliente vede solo i propri dati, limiti ai tentativi di
            accesso e codici di invito personali per registrarsi.
          </p>
        </Paragrafo>

        <Paragrafo titolo="I tuoi diritti">
          <p>
            Puoi chiedere in qualsiasi momento di vedere i tuoi dati, correggerli, cancellarli, averne una copia, limitarne
            o opporti al trattamento e ritirare il consenso, scrivendo a {EMAIL_PRIVACY}. Rispondiamo entro 30 giorni. Se
            pensi che i tuoi dati siano trattati in modo scorretto puoi fare reclamo al Garante per la protezione dei dati
            personali (garanteprivacy.it).
          </p>
        </Paragrafo>
      </div>
    </div>
  );
}
