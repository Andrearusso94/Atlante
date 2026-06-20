// Client di /api/genera — porta lo stesso ruolo di `generate()` nel v12, ma chiama il
// Worker (mai api.anthropic.com dal browser) e non include più il prompt di sistema
// (ora server-side, vedi worker/index.ts SYS_GENERA). Il fallback offline (FALLBACK/
// pickFallback) resta a livello feature, come nel v12 era `onGenerate` — non `generate()`
// — a deciderlo: questa funzione si limita a chiamare l'IA e validare la risposta.

import { safeParseSceneSpec } from "../types/scene";
import type { SceneSpec } from "../types/scene";
import { ApiError } from "./errors";
import { postApi } from "./request";

/** Genera una SceneSpec dalla richiesta in linguaggio naturale `q`. Lancia `ApiError`
 * (vedi api/request.ts per i codici di trasporto, "invalid_response" se l'IA risponde
 * ma il JSON non è una SceneSpec valida — issue C2). */
export async function generate(q: string): Promise<SceneSpec> {
  const data = await postApi("/api/genera", { q });
  const result = safeParseSceneSpec(data);
  if (!result.success) {
    throw new ApiError(
      "invalid_response",
      200,
      `La risposta dell'IA non è una scene spec valida: ${result.error.message}`,
    );
  }
  return result.data;
}
