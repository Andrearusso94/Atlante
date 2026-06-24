/**
 * Cloudflare Worker — proxy IA per Atlante Sincronico (v12).
 *
 * Serve gli asset statici (build di Vite) E fa da proxy per le due chiamate IA,
 * così la chiave Anthropic non tocca mai il browser e non ci sono problemi di CORS.
 *
 * Endpoint:
 *   POST /api/genera   -> body { q: string }                  -> SceneSpec (JSON)
 *   POST /api/lezione  -> body { title, event, year }         -> LessonCard (JSON, usa web_search)
 *   tutto il resto     -> asset statici (env.ASSETS)
 *
 * Copre le issue A1 (rate limiting), A2 (cache), A3 (gestione errori).
 *
 * --- Bindings richiesti in wrangler.toml ---
 *   [assets]            directory = "./dist", binding = "ASSETS"
 *   [[kv_namespaces]]   binding = "CACHE"   id = "..."
 *   [[kv_namespaces]]   binding = "RATE"    id = "..."
 *   secret:             ANTHROPIC_API_KEY   (npx wrangler secret put ANTHROPIC_API_KEY)
 *   vars (opzionali):   MODEL, RATE_LIMIT, RATE_WINDOW_S, CACHE_TTL_GENERA_S, CACHE_TTL_LEZIONE_S
 *
 * Nota: KV ha consistenza eventuale; per un rate limit "duro" valuta i Durable Objects
 * o il binding nativo Rate Limiting di Cloudflare. Per un demo privato KV è sufficiente.
 *
 * Richiede @cloudflare/workers-types per i tipi (KVNamespace, Fetcher, ecc.).
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  ASSETS: Fetcher;
  CACHE: KVNamespace;
  RATE: KVNamespace;
  MODEL?: string;
  RATE_LIMIT?: string;          // richieste per finestra (default 30)
  RATE_WINDOW_S?: string;       // ampiezza finestra in secondi (default 3600)
  CACHE_TTL_GENERA_S?: string;  // default 86400 (24h)
  CACHE_TTL_LEZIONE_S?: string; // default 604800 (7g) — più aggressiva: web_search è fatturata a parte
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_INPUT = 2000; // guardia anti-abuso sulla lunghezza degli input

// --- Prompt di sistema: IDENTICI al v12, ora lato server (non più nel browser) ---

const SYS_GENERA = `Sei un generatore di scene per un atlante storico 3D didattico. Rispondi SOLO con JSON valido, niente markdown. Schema:
{"title":str,"period":str,"yearStart":int(neg=a.C.),"yearEnd":int,"archetype":"pulse"|"journey"|"spread"|"network"|"territory","summary":str,"items":[...],"teaching":{"timeline":[{"year":int,"event":str}],"keyPoints":[str],"questions":[str]}}
items per archetype:
- pulse: [{"query":str,"year":int}]  // NON dare coordinate. "query" = nome esatto e cercabile su Wikidata (es. "Battaglia di Canne", "Eruzione del Vesuvio del 79"); coordinate e data reali vengono prese da Wikidata. "year" solo come ripiego.
- journey: [{"name":str,"waypoints":[[lat,lon],...],"fromYear":int,"toYear":int,"fromDate":"YYYY-MM-DD","toDate":"YYYY-MM-DD"}] (fromDate/toDate opzionali: mettile se il viaggio è databile, anche dentro un singolo anno, così lo scrubber scorre le date reali)
- spread: [{"name":str,"originLat":num,"originLon":num,"targets":[[lat,lon],...],"fromYear":int,"toYear":int}]
- network: [{"from":[lat,lon],"to":[lat,lon],"label":str}]
- territory: NIENTE items e NIENTE poligoni. Dai invece "subject":str e "aliases":[str] = i nomi con cui l'entita compare nelle varie epoche storiche (es. Roma: ["Rome","Roman Republic","Roman Empire"], in inglese perche il dataset e in inglese). I confini reali vengono caricati da un dataset esterno.
Regole: scegli l'archetipo piu adatto (espansioni/imperi/stati=territory). Per territory yearStart/yearEnd = arco dell'espansione. Italiano per i testi, inglese per gli aliases. Max 6 items, timeline max 6, keyPoints max 4, questions max 3. Conciso.`;

const SYS_LEZIONE = `Sei uno storico che prepara lezioni accurate per la scuola. Puoi usare la ricerca web per verificare i fatti. Schema della risposta:
{"context":str,"what":str,"causes":[str],"consequences":[str],"quote":str,"classroom":[str]}
context: 2-3 frasi che inquadrano il periodo. what: 3-4 frasi su cosa accadde davvero. causes/consequences: 2-3 voci ciascuna. quote: una citazione o un dato significativo e verificabile (anche parafrasato). classroom: 2 spunti di riflessione per gli studenti. Conciso ma sostanzioso, in italiano.
FORMATO DELLA RISPOSTA FINALE — regole obbligatorie, anche dopo aver usato la ricerca web:
1. L'intera risposta finale e ESCLUSIVAMENTE l'oggetto JSON: inizia con "{" e finisce con "}", nessun carattere prima o dopo.
2. Niente prefazioni ("Ecco la lezione:", "In base alla ricerca..."), niente commenti, niente testo dopo l'oggetto.
3. Niente markdown: niente \`\`\`json, niente \`\`\`, niente titoli o elenchi fuori dal JSON.
4. Niente citazioni o riferimenti alle fonti dentro i valori delle stringhe (no "[1]", no "(fonte: ...)", no link): scrivi le informazioni in prosa normale, senza marcatori di citazione.
5. I risultati della ricerca web servono solo a te per verificare i fatti: non riportarli, non riassumerli, non menzionarli nella risposta — restituisci soltanto l'oggetto JSON finale.`;

// --- entry point ---

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/genera") return guard(request, env, ctx, handleGenera);
    if (url.pathname === "/api/lezione") return guard(request, env, ctx, handleLezione);

    // tutto il resto = asset statici (la SPA buildata da Vite)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

// --- wrapper comune: solo POST, rate limit, gestione errori (A1 + A3) ---

type Handler = (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;

async function guard(request: Request, env: Env, ctx: ExecutionContext, fn: Handler): Promise<Response> {
  if (request.method !== "POST") return errJson(405, "method_not_allowed", "Usa POST.");
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const limited = await rateLimited(env, ip);
    if (limited) return errJson(429, "rate_limited", "Troppe richieste. Riprova tra poco.");
    return await fn(request, env, ctx);
  } catch (e: any) {
    if (e && e.name === "AbortError") return errJson(504, "upstream_timeout", "L'IA non ha risposto in tempo.");
    if (e && e.code) return errJson(e.status || 502, e.code, e.message);
    return errJson(500, "internal_error", "Errore interno.");
  }
}

// --- /api/genera ---

async function handleGenera(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await readJson(request);
  const q = typeof body?.q === "string" ? body.q.trim() : "";
  if (!q) throw fail(400, "bad_input", "Campo 'q' mancante.");
  if (q.length > MAX_INPUT) throw fail(400, "bad_input", "Richiesta troppo lunga.");

  const ttl = int(env.CACHE_TTL_GENERA_S, 86400);
  const key = "genera:" + (await sha256hex(q.toLowerCase()));
  const cached = await env.CACHE.get(key);
  if (cached) return okJson(cached, true);

  const data = await callAnthropic(env, {
    model: env.MODEL || DEFAULT_MODEL,
    max_tokens: 1000,
    system: SYS_GENERA,
    messages: [{ role: "user", content: `Richiesta dell'insegnante: "${q}". Genera la scene spec.` }],
  });

  const spec = parseModelJson(extractText(data)); // oggetto JSON (la SceneSpec)
  const out = JSON.stringify(spec);
  ctx.waitUntil(env.CACHE.put(key, out, { expirationTtl: ttl }));
  return okJson(out, false);
}

// --- /api/lezione (con web_search) ---

async function handleLezione(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await readJson(request);
  const title = str(body?.title);
  const event = str(body?.event);
  const year = Number(body?.year);
  if (!event || !Number.isFinite(year)) throw fail(400, "bad_input", "Campi 'event' e 'year' richiesti.");
  if ((title + event).length > MAX_INPUT) throw fail(400, "bad_input", "Input troppo lungo.");

  // Cache più aggressiva: ogni hit risparmia una web_search, fatturata a parte (A2).
  const ttl = int(env.CACHE_TTL_LEZIONE_S, 604800);
  const key = "lezione:" + (await sha256hex(`${title}|${event}|${year}`));
  const cached = await env.CACHE.get(key);
  if (cached) return okJson(cached, true);

  const data = await callAnthropic(env, {
    model: env.MODEL || DEFAULT_MODEL,
    max_tokens: 1000,
    system: SYS_LEZIONE,
    messages: [{ role: "user", content: `Lezione su "${event}" (${fmtYear(year)}), nel contesto di "${title}". Genera la scheda JSON.` }],
    tools: [{ type: "web_search_20250305", name: "web_search" }],
  });

  const card = parseModelJson(extractText(data));
  const out = JSON.stringify(card);
  ctx.waitUntil(env.CACHE.put(key, out, { expirationTtl: ttl }));
  return okJson(out, false);
}

// --- chiamata ad Anthropic con timeout ---

async function callAnthropic(env: Env, payload: Record<string, unknown>): Promise<any> {
  if (!env.ANTHROPIC_API_KEY) throw fail(500, "no_key", "Chiave API non configurata sul server.");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      // Non inoltrare corpi d'errore grezzi al client; logga solo lo stato.
      console.log("anthropic_error", res.status);
      throw fail(502, "upstream_error", "L'IA ha risposto con un errore.");
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// --- helper ---

function extractText(data: any): string {
  return ((data && data.content) || [])
    .filter((b: any) => b && b.type === "text")
    .map((b: any) => b.text)
    .join("");
}

function parseModelJson(txt: string): unknown {
  const raw = (txt || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    // ripiego sotto: risposta "quasi pulita" (fence ```json, prefazioni o citazioni
    // intorno al JSON — tipico quando il modello usa web_search) prima di arrendersi.
  }
  const extracted = extractBalancedJson(raw);
  if (extracted) {
    try {
      return JSON.parse(extracted);
    } catch {
      // nessun recupero possibile: cade nel 502 sotto
    }
  }
  throw fail(502, "bad_model_json", "L'IA non ha restituito JSON valido.");
}

// Ritaglia dalla prima "{" alla sua "}" di chiusura corrispondente, contando le
// parentesi e ignorando quelle dentro le stringhe — così non si confonde con testo,
// citazioni o fence ```json prima/dopo il vero oggetto JSON.
function extractBalancedJson(txt: string): string | null {
  const start = txt.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < txt.length; i++) {
    const ch = txt[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return txt.slice(start, i + 1);
    }
  }
  return null;
}

async function rateLimited(env: Env, ip: string): Promise<boolean> {
  const limit = int(env.RATE_LIMIT, 30);
  const windowS = int(env.RATE_WINDOW_S, 3600);
  const bucket = Math.floor(Date.now() / 1000 / windowS);
  const key = `rl:${ip}:${bucket}`;
  const current = int(await env.RATE.get(key), 0);
  if (current >= limit) return true;
  // best-effort: KV è eventualmente consistente, va benissimo per un demo privato
  await env.RATE.put(key, String(current + 1), { expirationTtl: windowS + 60 });
  return false;
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readJson(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    throw fail(400, "bad_input", "Body JSON non valido.");
  }
}

function fmtYear(y: number): string {
  return y < 0 ? `${-y} a.C.` : `${y}`;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const int = (v: unknown, d: number): number => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : d;
};

function fail(status: number, code: string, message: string) {
  return Object.assign(new Error(message), { status, code });
}

function okJson(jsonText: string, cached: boolean): Response {
  return new Response(jsonText, {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "x-cache": cached ? "HIT" : "MISS" },
  });
}

function errJson(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
