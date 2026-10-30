// Storico pesi generale: le serie di tutte le schede raggruppate per nome dell'esercizio.
// "Panca piana" della scheda di settembre e "panca  Piana" di quella di ottobre sono lo stesso esercizio.
import type { SerieStorico } from './api';
import { normalizza } from './libreria';

export interface EsercizioNelloStorico {
  chiave: string; // nome normalizzato
  nome: string; // come è scritto nella scheda più recente
  serie: SerieStorico[]; // dalla più vecchia alla più recente
  schede: string[]; // nomi delle schede in cui compare (dalla più recente)
  giorni: number; // in quanti giorni diversi è stato fatto
  ultimaData: string;
  record: SerieStorico; // più peso, a parità più ripetizioni
}

// Minuscolo, senza accenti e con gli spazi in più tolti.
export const chiaveEsercizio = (nome: string) => normalizza(nome).replace(/\s+/g, ' ');

const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function raggruppaPerEsercizio(serie: SerieStorico[]): EsercizioNelloStorico[] {
  const gruppi = new Map<string, SerieStorico[]>();
  for (const s of [...serie].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())) {
    const k = chiaveEsercizio(s.nomeEsercizio);
    if (!k) continue;
    gruppi.set(k, [...(gruppi.get(k) ?? []), s]);
  }
  return [...gruppi.entries()]
    .map(([chiave, elenco]) => {
      const ultima = elenco[elenco.length - 1];
      const schede = [...new Set([...elenco].reverse().map((s) => s.nomeScheda))];
      const record = elenco.reduce((m, s) => (s.pesoUsato > m.pesoUsato || (s.pesoUsato === m.pesoUsato && s.repsFatte > m.repsFatte) ? s : m));
      return {
        chiave,
        nome: maiuscola(ultima.nomeEsercizio.trim()),
        serie: elenco,
        schede,
        giorni: new Set(elenco.map((s) => new Date(s.data).toDateString())).size,
        ultimaData: ultima.data,
        record,
      };
    })
    .sort((a, b) => new Date(b.ultimaData).getTime() - new Date(a.ultimaData).getTime());
}
