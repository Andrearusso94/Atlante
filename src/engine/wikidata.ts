// Grounding di eventi puntuali via Wikidata — PORTATO LETTERALMENTE dal v12
// (sezione "grounding eventi puntuali via Wikidata"). Usato dall'archetipo `pulse`:
// l'IA dà solo un nome cercabile (golden principle: niente coordinate inventate),
// qui si risolve su Wikidata la posizione (P625) e l'anno (P585) reali.

const WD = "https://www.wikidata.org/w/api.php?origin=*&format=json&";

interface WdSearchResponse {
  search?: { id: string }[];
}

interface WdClaim {
  mainsnak?: { datavalue?: { value?: unknown } };
}

interface WdEntitiesResponse {
  entities?: Record<string, { claims?: Record<string, WdClaim[]> }>;
}

interface WdGlobeCoordinateValue {
  latitude: number;
  longitude: number;
}

interface WdTimeValue {
  time: string;
}

export interface WikidataEntity {
  lat: number | null;
  lon: number | null;
  year: number | null;
}

/** Cerca `q` su Wikidata (prima in italiano, poi in inglese) e ritorna il QID trovato. */
export async function wdSearch(q: string): Promise<string | null> {
  for (const lang of ["it", "en"]) {
    const r = await fetch(
      `${WD}action=wbsearchentities&limit=1&language=${lang}&uselang=${lang}&search=${encodeURIComponent(q)}`,
    );
    if (!r.ok) continue;
    const j = (await r.json()) as WdSearchResponse;
    if (j.search && j.search.length) return j.search[0].id;
  }
  return null;
}

/** Legge le coordinate (P625) e la data (P585) di un'entità Wikidata. */
export async function wdEntity(qid: string): Promise<WikidataEntity> {
  const r = await fetch(`${WD}action=wbgetentities&props=claims&ids=${qid}`);
  const j = (await r.json()) as WdEntitiesResponse;
  const cl = j.entities?.[qid]?.claims || {};
  let lat: number | null = null;
  let lon: number | null = null;
  let year: number | null = null;
  if (cl.P625 && cl.P625[0] && cl.P625[0].mainsnak?.datavalue) {
    const v = cl.P625[0].mainsnak.datavalue.value as WdGlobeCoordinateValue;
    lat = v.latitude;
    lon = v.longitude;
  }
  if (cl.P585 && cl.P585[0] && cl.P585[0].mainsnak?.datavalue) {
    const v = cl.P585[0].mainsnak.datavalue.value as WdTimeValue;
    year = parseInt(String(v.time).replace("+", ""), 10);
  }
  return { lat, lon, year };
}

/** Quel poco che resolveItem legge da un item `pulse`: `query` (nome cercabile), `year`
 * come ripiego. `name` è un alias defensivo presente già nel v12 (dati legacy/fallback). */
export interface ResolvableItem {
  query?: string;
  name?: string;
  year?: number;
}

export interface ResolvedItem {
  name: string;
  lat: number;
  lon: number;
  year: number;
}

const wdCache: Record<string, ResolvedItem | null> = {};

/** Risolve un item `pulse` (nome -> QID -> coordinate/anno reali), con cache in memoria.
 * `fy` = anno di ripiego (yearStart della scena) se Wikidata non dà una data. */
export async function resolveItem(it: ResolvableItem, fy: number): Promise<ResolvedItem | null> {
  const key = (it.query || it.name || "").trim();
  if (!key) return null;
  if (wdCache[key] !== undefined) return wdCache[key];
  let out: ResolvedItem | null = null;
  try {
    const qid = await wdSearch(key);
    if (qid) {
      const e = await wdEntity(qid);
      if (e.lat != null) {
        out = {
          name: key,
          lat: e.lat,
          // P625 è un valore composto: se Wikidata dà la latitudine dà sempre anche
          // la longitudine, quindi qui il cast da `number | null` è sicuro.
          lon: e.lon as number,
          year: e.year != null ? e.year : it.year || fy,
        };
      }
    }
  } catch {
    // rete assente o entità non risolvibile: resta out=null, come nel v12 (catch silenzioso)
  }
  wdCache[key] = out;
  return out;
}
