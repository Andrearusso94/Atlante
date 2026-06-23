import { describe, expect, it } from "vitest";
import { describeSpecError, SPEC_ERROR_MESSAGES } from "./errorMessages";
import type { ApiErrorCode } from "../../api/errors";

const ALL_CODES: ApiErrorCode[] = [
  "method_not_allowed",
  "bad_input",
  "rate_limited",
  "no_key",
  "upstream_timeout",
  "upstream_error",
  "bad_model_json",
  "internal_error",
  "network_error",
  "invalid_response",
];

describe("describeSpecError", () => {
  it("ha un messaggio non vuoto per ogni ApiErrorCode (nessun codice scoperto)", () => {
    for (const code of ALL_CODES) {
      expect(describeSpecError(code)).toBeTruthy();
    }
    expect(Object.keys(SPEC_ERROR_MESSAGES).sort()).toEqual([...ALL_CODES].sort());
  });

  it("429 rate_limited: invita a riprovare tra poco", () => {
    expect(describeSpecError("rate_limited")).toMatch(/riprova/i);
  });

  it("502 upstream_error: segnala che l'IA ha risposto con un errore", () => {
    expect(describeSpecError("upstream_error")).toMatch(/IA ha risposto con un errore/);
  });

  it("504 upstream_timeout: segnala il timeout", () => {
    expect(describeSpecError("upstream_timeout")).toMatch(/non ha risposto in tempo/);
  });

  it("errori di validazione (bad_model_json/invalid_response): segnalano risposta non valida", () => {
    expect(describeSpecError("bad_model_json")).toMatch(/formato inatteso/);
    expect(describeSpecError("invalid_response")).toMatch(/non è una scena valida/);
  });
});
