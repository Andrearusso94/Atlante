// POST condiviso da api/genera.ts e api/lezione.ts verso il Worker (mai direttamente
// verso api.anthropic.com — la chiave resta lì, vedi worker/index.ts e MIGRATION-BRIEF.md).
// Qui si gestiscono solo trasporto ed errori (issue A3): rete assente, errore riportato
// dal Worker, corpo non leggibile come JSON. La validazione di *forma* (SceneSpec/
// LessonCard, issue C2) resta a chi chiama, con Zod.

import { ApiError, type ApiErrorCode } from "./errors";

const KNOWN_CODES: readonly ApiErrorCode[] = [
  "method_not_allowed",
  "bad_input",
  "rate_limited",
  "no_key",
  "upstream_timeout",
  "upstream_error",
  "bad_model_json",
  "internal_error",
];

function isKnownCode(code: unknown): code is ApiErrorCode {
  return typeof code === "string" && (KNOWN_CODES as readonly string[]).includes(code);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

// Tetto lato client, sopra il timeout più alto lato Worker (/api/lezione, web_search:
// 60s, vedi worker/index.ts LEZIONE_TIMEOUT_MS) con margine per il giro di rete — così
// è il Worker a classificare l'errore (504 upstream_timeout vs 502 upstream_error) prima
// che il client rinunci da solo. /api/genera (che risponde in centesimi di secondo) non
// ne è toccato.
const CLIENT_TIMEOUT_MS = 70_000;

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

/** POST JSON a `path` (un endpoint del Worker, es. "/api/genera") e ritorna il body
 * JSON grezzo della risposta. Lancia `ApiError` per qualunque problema distinguibile:
 * - `network_error`: il `fetch` stesso è fallito (rete assente, Worker non raggiungibile);
 * - uno dei codici del Worker (`rate_limited`, `upstream_timeout`, `upstream_error`,
 *   `bad_model_json`, `bad_input`, `no_key`) o `internal_error` come ripiego se il corpo
 *   d'errore non ha un `code` riconosciuto;
 * - `invalid_response`: risposta 2xx ma corpo non leggibile come JSON (lo schema atteso
 *   lo valida poi chi chiama, con Zod).
 */
export async function postApi(path: string, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch (err) {
    if (isAbortError(err)) throw new ApiError("upstream_timeout", 0, "L'IA non ha risposto in tempo.");
    throw new ApiError("network_error", 0, "Rete assente o server non raggiungibile.");
  }

  if (!res.ok) {
    const data = asRecord(await readJsonSafe(res));
    const code: ApiErrorCode = isKnownCode(data?.code) ? data.code : "internal_error";
    const message = typeof data?.error === "string" ? data.error : `Errore HTTP ${res.status}.`;
    throw new ApiError(code, res.status, message);
  }

  const data = await readJsonSafe(res);
  if (data === undefined) {
    throw new ApiError("invalid_response", res.status, "Risposta del server non in formato JSON.");
  }
  return data;
}
