// Dati "eventi storici correlati" da Wikidata — issue #11 (tappa 1/3).
// Usato da: tappa 2 (UI card laterale) e tappa 3 (pulsante "Genera Ricerca").
// Riusa lo stesso pattern fetch diretto di src/engine/wikidata.ts (nessun nuovo client HTTP).

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const MAX_RESULTS = 8;

// ─── Tipi pubblici ────────────────────────────────────────────────────────────

/** Input per la ricerca di eventi correlati. */
export interface RelatedEventInput {
  title: string;
  yearStart: number;
  yearEnd: number;
  /** QID Wikidata della categoria dell'evento (es. "Q18123741" per epidemia).
   *  Se omesso si esegue solo la ricerca temporale. */
  wikidataClass?: string;
}

/** Evento storico correlato — struttura che verrà consumata dalla UI (tappa 2)
 *  e dal pulsante "Genera Ricerca" (tappa 3). */
export interface RelatedEvent {
  /** QID Wikidata (es. "Q11081") — identificativo per la tappa 3. */
  wikidataId: string;
  title: string;
  /** Breve descrizione in una frase; stringa vuota se Wikidata non la fornisce. */
  description: string;
  /** Anno di inizio o punto nel tempo; null se Wikidata non lo fornisce. */
  year: number | null;
}

// ─── Tipi interni SPARQL ──────────────────────────────────────────────────────

interface SparqlBinding {
  item?: { value: string };
  itemLabel?: { value: string };
  itemDescription?: { value: string };
  year?: { value: string };
}

interface SparqlResponse {
  results?: { bindings?: SparqlBinding[] };
}

// ─── Query builders ───────────────────────────────────────────────────────────

function buildTemporalQuery(yearStart: number, yearEnd: number): string {
  const pad = 5;
  const from = yearStart - pad;
  const to = yearEnd + pad;
  const limit = Math.ceil(MAX_RESULTS / 2);
  return [
    "SELECT DISTINCT ?item ?itemLabel ?itemDescription ?year WHERE {",
    "  { ?item wdt:P580 ?t . } UNION { ?item wdt:P585 ?t . }",
    "  BIND(YEAR(?t) AS ?year)",
    `  FILTER(?year >= ${from} && ?year <= ${to})`,
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". }',
    `} LIMIT ${limit}`,
  ].join(" ");
}

function buildThematicQuery(wikidataClass: string): string {
  const limit = Math.ceil(MAX_RESULTS / 2);
  return [
    "SELECT DISTINCT ?item ?itemLabel ?itemDescription ?year WHERE {",
    `  ?item wdt:P31/wdt:P279* wd:${wikidataClass} .`,
    "  OPTIONAL { ?item wdt:P580 ?t . BIND(YEAR(?t) AS ?year) }",
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". }',
    `} LIMIT ${limit}`,
  ].join(" ");
}

// ─── HTTP + parsing ───────────────────────────────────────────────────────────

async function runSparql(query: string): Promise<SparqlBinding[]> {
  try {
    const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
    const r = await fetch(url, { headers: { Accept: "application/sparql-results+json" } });
    if (!r.ok) return [];
    const data = (await r.json()) as SparqlResponse;
    return data.results?.bindings ?? [];
  } catch {
    return [];
  }
}

function bindingsToEvents(bindings: SparqlBinding[]): RelatedEvent[] {
  return bindings
    .filter((b) => b.item?.value && b.itemLabel?.value)
    .map((b) => {
      const qid = b.item!.value.split("/").pop() ?? b.item!.value;
      const yearRaw = b.year?.value;
      const yearParsed = yearRaw !== undefined ? parseInt(yearRaw, 10) : NaN;
      return {
        wikidataId: qid,
        title: b.itemLabel!.value,
        description: b.itemDescription?.value ?? "",
        year: Number.isFinite(yearParsed) ? yearParsed : null,
      };
    });
}

// ─── Funzione pubblica ────────────────────────────────────────────────────────

/**
 * Dato un evento corrente, restituisce fino a 8 eventi storici correlati da Wikidata,
 * combinando ricerca temporale (stesso arco di anni) e tematica (stessa categoria).
 *
 * Degrada con grazia (lista vuota) su errori di rete, risposta vuota o dati malformati.
 */
export async function fetchRelatedEvents(event: RelatedEventInput): Promise<RelatedEvent[]> {
  try {
    const [temporalBindings, thematicBindings] = await Promise.all([
      runSparql(buildTemporalQuery(event.yearStart, event.yearEnd)),
      event.wikidataClass
        ? runSparql(buildThematicQuery(event.wikidataClass))
        : Promise.resolve<SparqlBinding[]>([]),
    ]);

    const seen = new Set<string>();
    const result: RelatedEvent[] = [];

    for (const ev of [...bindingsToEvents(temporalBindings), ...bindingsToEvents(thematicBindings)]) {
      if (ev.wikidataId && !seen.has(ev.wikidataId)) {
        seen.add(ev.wikidataId);
        result.push(ev);
        if (result.length >= MAX_RESULTS) break;
      }
    }

    return result;
  } catch {
    return [];
  }
}
