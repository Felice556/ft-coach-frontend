// Suoni del timer di recupero, generati dal telefono (nessun file audio da scaricare).
//
// Cose da sapere:
// - iPhone e Android permettono di suonare solo dopo che l'utente ha toccato qualcosa:
//   per questo "sbloccaAudio()" va chiamata dentro un tocco (es. "Registra serie").
// - Il suono si mescola alla musica (Spotify ecc.) senza fermarla.
// - Su iPhone con il tasto silenzioso attivo il suono non si sente (resta la scritta "Via!").
// - Se lo schermo si spegne il browser si addormenta: per questo, mentre il timer
//   è attivo, chiediamo al telefono di tenere lo schermo acceso (vedi tieniSchermoAcceso).

const CHIAVE = 'suonoTimer';

type ContestoAudio = AudioContext;
let contesto: ContestoAudio | null = null;

export function suonoAttivo(): boolean {
  try {
    return localStorage.getItem(CHIAVE) !== 'no';
  } catch {
    return true;
  }
}

export function impostaSuono(attivo: boolean) {
  try {
    localStorage.setItem(CHIAVE, attivo ? 'si' : 'no');
  } catch {
    // se non si può salvare vale fino alla chiusura della pagina
  }
}

// Da chiamare dentro un tocco dell'utente: prepara l'audio così a fine recupero può suonare.
export function sbloccaAudio() {
  try {
    const Classe =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Classe) return;
    if (!contesto) contesto = new Classe();
    if (contesto.state === 'suspended') void contesto.resume();
    // Un suono "vuoto" di un istante: su iPhone serve a sbloccare davvero l'audio.
    const vuoto = contesto.createBuffer(1, 1, 22050);
    const sorgente = contesto.createBufferSource();
    sorgente.buffer = vuoto;
    sorgente.connect(contesto.destination);
    sorgente.start(0);
  } catch {
    // audio non disponibile: il timer funziona lo stesso, solo senza suono
  }
}

// Un "bip": frequenza in Hz, durata e ritardo in secondi.
function bip(frequenza: number, durata: number, ritardo = 0, volume = 0.18) {
  if (!contesto) return;
  if (contesto.state === 'suspended') void contesto.resume();
  const inizio = contesto.currentTime + ritardo;
  const oscillatore = contesto.createOscillator();
  const guadagno = contesto.createGain();
  // "square" è più squillante di un tono puro: si sente meglio con la musica della palestra.
  oscillatore.type = 'square';
  oscillatore.frequency.value = frequenza;
  guadagno.gain.setValueAtTime(0.0001, inizio);
  guadagno.gain.exponentialRampToValueAtTime(volume, inizio + 0.01);
  guadagno.gain.exponentialRampToValueAtTime(0.0001, inizio + durata);
  oscillatore.connect(guadagno).connect(contesto.destination);
  oscillatore.start(inizio);
  oscillatore.stop(inizio + durata + 0.02);
}

// Ultimi 3 secondi: un bip corto per secondo.
export function suonoConteggio() {
  if (!suonoAttivo()) return;
  bip(660, 0.12, 0, 0.12);
}

// Fine recupero: due bip e uno più lungo e acuto.
export function suonoFine() {
  if (!suonoAttivo()) return;
  bip(880, 0.16);
  bip(880, 0.16, 0.22);
  bip(1320, 0.45, 0.44, 0.2);
}

// Per il tasto di prova nelle impostazioni.
export function provaSuono() {
  sbloccaAudio();
  bip(880, 0.16);
  bip(1320, 0.4, 0.22, 0.2);
}

// Tiene acceso lo schermo mentre il timer corre (così il suono arriva davvero).
// Funziona su Android (Chrome) e iPhone recenti; se non è supportato non fa niente.
type Blocco = { release: () => Promise<void> };
export async function tieniSchermoAcceso(): Promise<Blocco | null> {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Blocco> } }).wakeLock;
    return wl ? await wl.request('screen') : null;
  } catch {
    return null;
  }
}
