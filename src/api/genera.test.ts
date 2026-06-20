import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { generate } from "./genera";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generate", () => {
  it("chiama POST /api/genera con { q } e ritorna la SceneSpec validata", async () => {
    const spec = { archetype: "network", title: "Rotte", yearStart: 1, yearEnd: 2, items: [{ from: [0, 0], to: [1, 1], label: "x" }] };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, spec));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generate("una rotta commerciale");

    expect(result).toEqual(spec);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/genera");
    expect(JSON.parse(init.body)).toEqual({ q: "una rotta commerciale" });
  });

  it("se l'IA risponde 200 ma il JSON non è una SceneSpec valida, lancia ApiError invalid_response (issue C2)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { archetype: "pulse" /* manca items, title, ecc. */ })));

    const err = await generate("qualcosa").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("invalid_response");
  });

  it("propaga i codici d'errore del Worker (es. rate_limited) senza alterarli", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(429, { error: "Troppe richieste. Riprova tra poco.", code: "rate_limited" })),
    );

    await expect(generate("qualcosa")).rejects.toMatchObject({ code: "rate_limited", status: 429 });
  });
});
