import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { aiLesson } from "./lezione";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("aiLesson", () => {
  it("chiama POST /api/lezione con { title, event, year } e ritorna la LessonCard validata", async () => {
    const card = {
      context: "ctx",
      what: "what",
      causes: ["a"],
      consequences: ["b"],
      quote: "q",
      classroom: ["c"],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, card));
    vi.stubGlobal("fetch", fetchMock);

    const result = await aiLesson("La peste nera", "Da Caffa a Messina", 1347);

    expect(result).toEqual(card);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/lezione");
    expect(JSON.parse(init.body)).toEqual({ title: "La peste nera", event: "Da Caffa a Messina", year: 1347 });
  });

  it("se l'IA risponde 200 ma il JSON non è una LessonCard valida, lancia ApiError invalid_response (issue C2)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { context: "solo questo" })));

    const err = await aiLesson("x", "y", 1).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("invalid_response");
  });

  it("504 upstream_timeout (la lezione usa web_search lato server, può richiedere più tempo)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(504, { error: "L'IA non ha risposto in tempo.", code: "upstream_timeout" })),
    );

    await expect(aiLesson("x", "y", 1)).rejects.toMatchObject({ code: "upstream_timeout", status: 504 });
  });
});
