// Errore tipizzato delle chiamate a /api/genera e /api/lezione (issue A3: il client deve
// distinguere i casi — rate limit, timeout, errore upstream, risposta malformata — invece
// di un messaggio generico; issue C2: una spec/lezione malformata dà un errore chiaro
// invece di una scena rotta).

/** I codici che worker/index.ts può restituire (vedi `errJson`), più due aggiunti dal
 * client: `network_error` (il `fetch` stesso è fallito: rete assente, CORS, Worker giù)
 * e `invalid_response` (corpo non leggibile come JSON, o non conforme allo schema Zod). */
export type ApiErrorCode =
  | "method_not_allowed"
  | "bad_input"
  | "rate_limited"
  | "no_key"
  | "upstream_timeout"
  | "upstream_error"
  | "bad_model_json"
  | "internal_error"
  | "network_error"
  | "invalid_response";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** Stato HTTP della risposta, se ce n'è stata una (0 per network_error: nessuna risposta). */
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}
