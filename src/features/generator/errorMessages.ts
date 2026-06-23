import type { ApiErrorCode } from "../../api/errors";

/** Messaggi per insegnante (non tecnici), un'etichetta distinta per ogni `ApiErrorCode`
 * (api/errors.ts) — coprono sia i codici del Worker che i due aggiunti dal client
 * (`network_error`, `invalid_response`). I 4 casi citati nel brief: 429 `rate_limited`,
 * 502 `upstream_error`, 504 `upstream_timeout`, errore di validazione
 * (`bad_model_json`/`invalid_response`). */
export const SPEC_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  rate_limited: "Troppe richieste in questo momento — riprova tra poco.",
  upstream_error: "L'IA ha risposto con un errore — riprova o cambia richiesta.",
  upstream_timeout: "L'IA non ha risposto in tempo — riprova tra poco.",
  bad_model_json: "L'IA ha risposto in un formato inatteso — riprova.",
  invalid_response: "La risposta dell'IA non è una scena valida — riprova o cambia richiesta.",
  no_key: "Servizio IA non configurato.",
  bad_input: "Richiesta non valida.",
  method_not_allowed: "Errore interno del servizio.",
  internal_error: "Errore interno del servizio.",
  network_error: "Rete assente o server non raggiungibile.",
};

export function describeSpecError(code: ApiErrorCode): string {
  return SPEC_ERROR_MESSAGES[code];
}
