// Tema chiaro/scuro applicato PRIMA che la pagina venga disegnata: niente "lampo" bianco
// all'apertura per chi usa il tema scuro. La stessa logica è in src/tema.ts.
// Sta in un file a parte (e non dentro index.html) per la sicurezza: il sito accetta solo
// script che arrivano da file suoi, mai codice scritto dentro la pagina (vedi public/_headers).
(function () {
  var scelta = 'automatico';
  try { scelta = localStorage.getItem('tema') || 'automatico'; } catch (e) {}
  var scuro = scelta === 'scuro' || (scelta !== 'chiaro' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.tema = scuro ? 'scuro' : 'chiaro';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', scuro ? '#1f2023' : '#f5f5f3');
})();
