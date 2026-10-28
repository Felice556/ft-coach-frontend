// Informativa privacy (GDPR) mostrata nell'app: dalla pagina di accesso, dalla
// registrazione e dalle Impostazioni.
//
// Testo di base da far controllare a un professionista prima dell'uso con clienti veri.
// Ruoli con più trainer: per i dati dei suoi clienti il titolare è il trainer; chi gestisce l'app
// li tratta per conto del trainer (responsabile, art. 28 GDPR). Per i dati dei trainer il titolare
// è chi gestisce l'app.
// C'è in italiano e in inglese: si vede quello della lingua dell'app.

import { lingua, tr } from './lingua';

export const GESTORE = 'Felice Russo'; // nome e cognome di chi gestisce l'app (e ne è l'amministratore)
export const EMAIL_PRIVACY = 'felice.lgg@gmail.com'; // email per tutte le richieste sulla privacy
export const AGGIORNATA_IL = '28/10/2026';

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
          <p className="eyebrow mb-1">Liftio</p>
          <h2 id="privacy-titolo" className="text-2xl font-bold tracking-tight">{tr('Informativa privacy', 'Privacy notice')}</h2>
          <p className="mt-1 text-xs text-muted">{tr(`Aggiornata il ${AGGIORNATA_IL}`, `Updated on ${AGGIORNATA_IL}`)}</p>
        </div>
        <button type="button" className="btn-secondary shrink-0 px-3" onClick={onChiudi}>
          {tr('Chiudi', 'Close')}
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
        {lingua === 'en' ? <TestoInglese /> : <TestoItaliano />}
      </div>
    </div>
  );
}

// Testo dell'informativa in italiano.
function TestoItaliano() {
  return (
    <>
      <p className="text-sm leading-relaxed text-soft">
        Qui trovi, in parole semplici, quali dati raccoglie Liftio, perché e chi può vederli (Regolamento UE 2016/679,
        “GDPR”). Liftio è usata da più trainer, ognuno con i propri clienti.
      </p>

      <Paragrafo titolo="Chi tratta i tuoi dati">
        <p>
          L’app è gestita da <span className="font-semibold text-ink">{GESTORE}</span>, che ne è anche l’amministratore.
          Contatto per la privacy: <span className="font-semibold text-ink">{EMAIL_PRIVACY}</span>.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Se sei un cliente:</strong> i tuoi dati di allenamento e del corpo li raccoglie e li usa il tuo trainer,
            che è il titolare del trattamento per i suoi clienti. {GESTORE} li tratta per conto del trainer, solo per far
            funzionare l’app (responsabile del trattamento, art. 28 GDPR).
          </li>
          <li>
            <strong>Se ti alleni da solo</strong> (senza trainer): il titolare dei tuoi dati è {GESTORE}.
          </li>
          <li>
            <strong>Se sei un trainer:</strong> per i dati del tuo account il titolare è {GESTORE}.
          </li>
        </ul>
      </Paragrafo>

      <Paragrafo titolo="Quali dati raccogliamo">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Di tutti: nome, email e password, salvata solo in forma cifrata (nessuno può leggerla). L’email serve anche per
            le email di servizio: la conferma dell’indirizzo quando ti iscrivi e il link per reimpostare la password, solo
            quando lo chiedi tu.
          </li>
          <li>
            Dei clienti: schede, serie, carichi, ripetizioni, date degli allenamenti, note e voto di fatica che scrivi,
            cardio fatto (attività, minuti, distanza) e passi giornalieri.
          </li>
          <li>
            Dei clienti, solo con il loro consenso esplicito: <strong>peso corporeo</strong> e{' '}
            <strong>percentuale di massa grassa</strong>, che sono dati relativi alla salute.
          </li>
          <li>
            Dei clienti, solo con un consenso a parte: il <strong>diario alimentare</strong> (pasti scritti a parole, olio,
            acqua e come si sono sentiti), che può dire qualcosa sulla salute. Il trainer lo legge e può commentarlo. Non è
            un piano alimentare: Liftio non prepara diete né calcola calorie.
          </li>
          <li>
            Dei trainer: le schede, il piano cardio e la libreria di esercizi e note che creano; chi si registra senza codice invito indica
            anche quanti clienti segue e, se vuole, due righe di presentazione.
          </li>
          <li>Se ti alleni da solo e tocchi “Avvisami” su un programma in arrivo: quale programma ti interessa (lo togli quando vuoi).</li>
        </ul>
        <p>
          Non usiamo pubblicità, cookie di profilazione né strumenti di tracciamento. Sul telefono restano salvati solo
          l’accesso e le tue preferenze (lingua, tema, suono del timer).
        </p>
      </Paragrafo>

      <Paragrafo titolo="Perché li usiamo">
        <p>
          Per i clienti: preparare e seguire il programma di allenamento e mostrare i progressi. Base giuridica: il
          servizio richiesto (art. 6.1.b GDPR) e, per peso, massa grassa e diario alimentare, il consenso esplicito (art.
          9.2.a GDPR), che puoi ritirare quando vuoi: quei dati verranno cancellati, il resto dell’app continua a
          funzionare. Il diario lo puoi spegnere e cancellare da solo, dalla sua sezione.
        </p>
        <p>
          Per i trainer: gestire il loro account e, per chi si registra senza codice invito, valutare la richiesta di
          accesso (art. 6.1.b GDPR).
        </p>
      </Paragrafo>

      <Paragrafo titolo="Chi può vederli">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            I dati di un cliente li vedono solo il cliente stesso e il suo trainer. Gli altri trainer non vedono mai i
            clienti che non sono loro. Chi si allena da solo è l’unico a vedere i propri dati.
          </li>
          <li>
            Se ti colleghi a un trainer (con il suo codice), lui vede allenamenti, misure, cardio, passi e diario solo da
            quel giorno in poi, non quelli di prima. Se smetti di allenarti con lui, non vede più niente; i tuoi dati
            restano tuoi.
          </li>
          <li>
            L’amministratore, nell’app, vede dei clienti degli altri trainer solo numeri complessivi (quanti clienti, quanti
            allenamenti), mai nomi o dati. Vede nome, email e richiesta dei trainer, per approvarli.
          </li>
          <li>
            Chi gestisce l’app accede al database solo quando serve per farla funzionare o per risolvere un problema
            tecnico.
          </li>
        </ul>
        <p>
          I dati non vengono venduti né dati ad altri. Per far funzionare l’app ci appoggiamo a fornitori tecnici che li
          trattano per nostro conto:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase: database, con server a Francoforte (UE).</li>
          <li>Render: server dell’app, a Francoforte (UE).</li>
          <li>
            Cloudflare: pubblicazione del sito. Può trattare dati tecnici di connessione (es. indirizzo IP) anche fuori
            dall’UE, con le garanzie previste dalla legge (EU-US Data Privacy Framework e clausole contrattuali standard).
          </li>
          <li>
            Resend: invio delle email di servizio (conferma dell’indirizzo e link per reimpostare la password). Riceve solo il tuo nome, la tua
            email e il testo del messaggio; è un’azienda statunitense, con le garanzie previste dalla legge (clausole
            contrattuali standard).
          </li>
        </ul>
      </Paragrafo>

      <Paragrafo titolo="Solo per maggiorenni">
        <p>
          Liftio è riservata a chi ha almeno 18 anni: registrandoti dichiari di essere maggiorenne. Se scopriamo che un
          account appartiene a un minore, lo eliminiamo con tutti i suoi dati. Un genitore può chiederlo scrivendo a{' '}
          {EMAIL_PRIVACY}.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Sospensione dell’accesso">
        <p>
          Il trainer può sospendere l’accesso di un suo cliente e l’amministratore quello di un trainer (con i suoi
          clienti). Durante la sospensione non si può entrare nell’app, ma nessun dato viene cancellato: riattivando
          l’accesso si ritrova tutto.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Per quanto tempo">
        <p>
          Finché l’account è attivo. Puoi eliminarlo quando vuoi da Impostazioni → Elimina account: i dati vengono
          cancellati subito. Un trainer può eliminare il proprio account quando non ha più clienti collegati. Se la
          richiesta di un trainer non viene approvata, il suo account in attesa viene cancellato. Puoi anche chiedere la
          cancellazione scrivendo a {EMAIL_PRIVACY}: lo facciamo entro 30 giorni. Le copie di sicurezza (backup) si
          cancellano da sole entro 60 giorni.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Come li proteggiamo">
        <p>
          Connessione cifrata (HTTPS), password cifrate, ogni trainer vede solo i propri clienti e ogni cliente solo i
          propri dati, limiti ai tentativi di accesso, codici di invito personali e approvazione dei nuovi trainer da
          parte dell’amministratore.
        </p>
      </Paragrafo>

      <Paragrafo titolo="I tuoi diritti">
        <p>
          Puoi chiedere in qualsiasi momento di vedere i tuoi dati, correggerli, cancellarli, averne una copia, limitarne
          o opporti al trattamento e ritirare il consenso. Se sei un cliente puoi rivolgerti al tuo trainer oppure
          scrivere a {EMAIL_PRIVACY}: se la richiesta riguarda il trainer, gliela giriamo noi. Rispondiamo entro 30
          giorni. Se pensi che i tuoi dati siano trattati in modo scorretto puoi fare reclamo al Garante per la
          protezione dei dati personali (garanteprivacy.it).
        </p>
      </Paragrafo>
    </>
  );
}

// Lo stesso testo in inglese (per chi usa l'app in inglese).
function TestoInglese() {
  return (
    <>
      <p className="text-sm leading-relaxed text-soft">
        Here you’ll find, in plain words, what data Liftio collects, why, and who can see it (EU Regulation 2016/679,
        “GDPR”). Liftio is used by several trainers, each with their own clients.
      </p>

      <Paragrafo titolo="Who processes your data">
        <p>
          The app is run by <span className="font-semibold text-ink">{GESTORE}</span>, who is also its administrator.
          Privacy contact: <span className="font-semibold text-ink">{EMAIL_PRIVACY}</span>.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>If you’re a client:</strong> your training and body data are collected and used by your trainer, who
            is the data controller for their own clients. {GESTORE} processes them on the trainer’s behalf, only to run
            the app (data processor, Art. 28 GDPR).
          </li>
          <li>
            <strong>If you train on your own</strong> (without a trainer): {GESTORE} is the data controller for your data.
          </li>
          <li>
            <strong>If you’re a trainer:</strong> {GESTORE} is the data controller for your account data.
          </li>
        </ul>
      </Paragrafo>

      <Paragrafo titolo="What data we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            From everyone: name, email and password, stored only in encrypted form (nobody can read it). Your email is also
            used for service emails: confirming your address when you sign up, and the link to reset your password, only
            when you ask for it.
          </li>
          <li>
            From clients: programmes, sets, loads, reps, workout dates, the notes and effort ratings you write, cardio done
            (activity, minutes, distance) and daily steps.
          </li>
          <li>
            From clients, only with their explicit consent: <strong>body weight</strong> and{' '}
            <strong>body fat percentage</strong>, which are health-related data.
          </li>
          <li>
            From clients, only with a separate consent: the <strong>food diary</strong> (meals written in words, oil, water
            and how they felt), which can say something about health. The trainer reads it and can comment on it. It isn’t a
            meal plan: Liftio doesn’t prepare diets or count calories.
          </li>
          <li>
            From trainers: the programmes, the cardio plan and the exercise and notes library they create; those who sign up without an
            invite code also tell us how many clients they train and, if they like, a short introduction.
          </li>
          <li>If you train on your own and tap “Notify me” on an upcoming plan: which plan you’re interested in (you can remove it whenever you like).</li>
        </ul>
        <p>
          We use no advertising, no profiling cookies and no tracking tools. Your phone only stores your sign-in and your
          preferences (language, theme, timer sound).
        </p>
      </Paragrafo>

      <Paragrafo titolo="Why we use them">
        <p>
          For clients: to prepare and follow the training programme and show progress. Legal basis: the service requested
          (Art. 6(1)(b) GDPR) and, for weight, body fat and the food diary, explicit consent (Art. 9(2)(a) GDPR), which you
          can withdraw at any time: that data will be deleted and the rest of the app keeps working. You can turn off and
          delete the diary yourself, from its section.
        </p>
        <p>
          For trainers: to manage their account and, for those who sign up without an invite code, to review the access
          request (Art. 6(1)(b) GDPR).
        </p>
      </Paragrafo>

      <Paragrafo titolo="Who can see them">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            A client’s data can be seen only by the client and their trainer. Other trainers never see clients who aren’t
            theirs. If you train on your own, you’re the only one who sees your data.
          </li>
          <li>
            If you link up with a trainer (using their code), they see workouts, measurements, cardio, steps and diary only
            from that day on, not earlier ones. If you stop training with them, they no longer see anything; your data stays
            yours.
          </li>
          <li>
            In the app, the administrator sees only overall numbers about other trainers’ clients (how many clients, how
            many workouts), never names or data. They see trainers’ names, emails and requests, in order to approve them.
          </li>
          <li>Whoever runs the app accesses the database only when needed to keep it working or to fix a technical problem.</li>
        </ul>
        <p>
          The data is never sold or given to anyone else. To run the app we rely on technical providers that process it on
          our behalf:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase: database, with servers in Frankfurt (EU).</li>
          <li>Render: app server, in Frankfurt (EU).</li>
          <li>
            Cloudflare: website hosting. It may process technical connection data (e.g. IP address) outside the EU too,
            with the safeguards required by law (EU-US Data Privacy Framework and standard contractual clauses).
          </li>
          <li>
            Resend: sending service emails (address confirmation and the password reset link). It only receives your name, your email and the
            message text; it is a US company, with the safeguards required by law (standard contractual clauses).
          </li>
        </ul>
      </Paragrafo>

      <Paragrafo titolo="Adults only">
        <p>
          Liftio is only for people aged 18 or over: by signing up you confirm you are an adult. If we find out that an
          account belongs to a minor, we delete it along with all its data. A parent can ask us to do so by writing to{' '}
          {EMAIL_PRIVACY}.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Suspended access">
        <p>
          A trainer can suspend one of their clients’ access, and the administrator can suspend a trainer’s (together
          with their clients). While suspended you can’t sign in, but no data is deleted: once access is restored,
          everything is still there.
        </p>
      </Paragrafo>

      <Paragrafo titolo="How long we keep them">
        <p>
          As long as the account is active. You can delete it whenever you like from Settings → Delete account: the data
          is deleted straight away. A trainer can delete their account once they no longer have linked clients. If a
          trainer’s request isn’t approved, their pending account is deleted. You can also ask for deletion by writing to{' '}
          {EMAIL_PRIVACY}: we’ll do it within 30 days. Backup copies are deleted automatically within 60 days.
        </p>
      </Paragrafo>

      <Paragrafo titolo="How we protect them">
        <p>
          Encrypted connection (HTTPS), encrypted passwords, each trainer sees only their own clients and each client only
          their own data, limits on sign-in attempts, personal invite codes and approval of new trainers by the
          administrator.
        </p>
      </Paragrafo>

      <Paragrafo titolo="Your rights">
        <p>
          At any time you can ask to see your data, correct it, delete it, get a copy, restrict or object to its
          processing and withdraw your consent. If you’re a client you can contact your trainer or write to{' '}
          {EMAIL_PRIVACY}: if the request concerns your trainer, we’ll pass it on. We reply within 30 days. If you think
          your data is being processed incorrectly, you can complain to the Italian Data Protection Authority (Garante per
          la protezione dei dati personali, garanteprivacy.it).
        </p>
      </Paragrafo>
    </>
  );
}
