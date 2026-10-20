// Liftio ha un nuovo indirizzo: chi apre quello vecchio (ft-coach.pages.dev) viene portato
// subito su liftio.it, nella stessa pagina e con gli stessi parametri (es. un link d'invito).
// Il controllo è sul nome ESATTO: le anteprime (xxx.ft-coach.pages.dev) e il computer
// di sviluppo non vengono toccati. Il parametro "nuovo-indirizzo" fa comparire un avviso
// nella schermata di accesso (bisogna accedere di nuovo una volta: per il browser è un sito nuovo).
// Sta in un file a parte, come tema-iniziale.js, per le regole di sicurezza (vedi public/_headers).
(function () {
  if (window.location.hostname !== 'ft-coach.pages.dev') return;
  var nuovo = new URL(window.location.href);
  nuovo.protocol = 'https:';
  nuovo.host = 'liftio.it';
  nuovo.searchParams.set('nuovo-indirizzo', '1');
  window.location.replace(nuovo.toString());
})();
