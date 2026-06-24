import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { postApi } from "./request";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postApi — successo", () => {
  it("POSTa su `path` con il body JSON e ritorna il corpo della risposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await postApi("/api/genera", { q: "Roma" });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/genera");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ q: "Roma" });
  });
});

describe("postApi — errori riportati dal Worker (issue A3)", () => {
  it("429 rate_limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(429, { error: "Troppe richieste. Riprova tra poco.", code: "rate_limited" })),
    );
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({
      code: "rate_limited",
      status: 429,
      message: "Troppe richieste. Riprova tra poco.",
    });
  });

  it("502 upstream_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(502, { error: "L'IA ha risposto con un errore.", code: "upstream_error" })),
    );
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({ code: "upstream_error", status: 502 });
  });

  it("502 bad_model_json (l'IA non ha risposto con JSON valido)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(502, { error: "L'IA non ha restituito JSON valido.", code: "bad_model_json" })),
    );
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({ code: "bad_model_json", status: 502 });
  });

  it("504 upstream_timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(504, { error: "L'IA non ha risposto in tempo.", code: "upstream_timeout" })),
    );
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({ code: "upstream_timeout", status: 504 });
  });

  it("400 bad_input", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(400, { error: "Campo 'q' mancante.", code: "bad_input" })));
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({ code: "bad_input", status: 400 });
  });

  it("un codice non riconosciuto ricade su internal_error (resta comunque un ApiError)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { error: "boh", code: "qualcosa_di_mai_visto" })));
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({ code: "internal_error", status: 500 });
  });

  it("un corpo d'errore non JSON ricade su internal_error con un messaggio generico", async () => {
    const res = new Response("non sono json", { status: 503 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({
      code: "internal_error",
      status: 503,
      message: "Errore HTTP 503.",
    });
  });
});

describe("postApi — problemi di trasporto", () => {
  it("se il fetch stesso lancia (rete assente), produce network_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({ code: "network_error", status: 0 });
  });

  it("una risposta 2xx senza corpo JSON leggibile produce invalid_response", async () => {
    const res = new Response("<html>non è json</html>", { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
    await expect(postApi("/api/genera", {})).rejects.toMatchObject({ code: "invalid_response", status: 200 });
  });

  it("ogni errore lanciato è un'istanza di ApiError (un solo tipo da gestire per le feature UI)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(postApi("/api/genera", {})).rejects.toBeInstanceOf(ApiError);
  });

  it("se il timeout lato client scatta (AbortSignal.timeout), produce upstream_timeout e non network_error", async () => {
    const timeoutErr = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutErr));
    await expect(postApi("/api/lezione", {})).rejects.toMatchObject({ code: "upstream_timeout", status: 0 });
  });
});
