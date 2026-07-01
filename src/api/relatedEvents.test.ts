import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRelatedEvents } from "./relatedEvents";
import type { RelatedEventInput } from "./relatedEvents";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sparqlOk(bindings: object[]): Response {
  return new Response(JSON.stringify({ results: { bindings } }), {
    status: 200,
    headers: { "content-type": "application/sparql-results+json" },
  });
}

function binding(qid: string, label: string, description: string, year?: number): object {
  return {
    item: { value: `http://www.wikidata.org/entity/${qid}` },
    itemLabel: { value: label },
    itemDescription: { value: description },
    ...(year !== undefined ? { year: { value: String(year) } } : {}),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const PESTE: RelatedEventInput = {
  title: "Peste Nera",
  yearStart: 1347,
  yearEnd: 1351,
};

// ─── Test ─────────────────────────────────────────────────────────────────────

describe("fetchRelatedEvents", () => {
  it("restituisce gli eventi temporali con struttura corretta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sparqlOk([binding("Q11081", "Pandemia di Giustiniano", "epidemia del VI secolo", 541)]),
      ),
    );

    const result = await fetchRelatedEvents(PESTE);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      wikidataId: "Q11081",
      title: "Pandemia di Giustiniano",
      description: "epidemia del VI secolo",
      year: 541,
    });
  });

  it("combina temporali e tematici deduplicando per wikidataId", async () => {
    const b1 = binding("Q11081", "Pandemia di Giustiniano", "epidemia del VI secolo", 541);
    const b2 = binding("Q11082", "Vaiolo americano", "epidemia delle Americhe", 1520);
    const b1dup = binding("Q11081", "Pandemia di Giustiniano", "epidemia del VI secolo", 541);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(sparqlOk([b1, b2])) // temporal
      .mockResolvedValueOnce(sparqlOk([b1dup, b2])); // thematic
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRelatedEvents({ ...PESTE, wikidataClass: "Q18123741" });

    const ids = result.map((e) => e.wikidataId);
    expect(ids).toContain("Q11081");
    expect(ids).toContain("Q11082");
    // nessun duplicato
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("esegue due chiamate fetch quando wikidataClass è fornita, una sola senza", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sparqlOk([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchRelatedEvents(PESTE);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();

    await fetchRelatedEvents({ ...PESTE, wikidataClass: "Q18123741" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ritorna lista vuota se Wikidata risponde con bindings vuoti", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sparqlOk([])));

    const result = await fetchRelatedEvents(PESTE);

    expect(result).toEqual([]);
  });

  it("ritorna lista vuota su errore di rete (fetch lancia)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const result = await fetchRelatedEvents(PESTE);

    expect(result).toEqual([]);
  });

  it("ritorna lista vuota su risposta HTTP non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));

    const result = await fetchRelatedEvents(PESTE);

    expect(result).toEqual([]);
  });

  it("ritorna lista vuota se il corpo non è JSON valido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
    );

    const result = await fetchRelatedEvents(PESTE);

    expect(result).toEqual([]);
  });

  it("ritorna lista vuota se il JSON non ha results.bindings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ foo: "bar" }), { status: 200 }),
      ),
    );

    const result = await fetchRelatedEvents(PESTE);

    expect(result).toEqual([]);
  });

  it("limita i risultati a 8 elementi anche con molti binding", async () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      binding(`Q${1000 + i}`, `Evento ${i}`, `descrizione ${i}`, 1300 + i),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sparqlOk(many)));

    const result = await fetchRelatedEvents(PESTE);

    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("gestisce binding con anno assente: year è null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(sparqlOk([binding("Q99999", "Evento senza data", "nessuna data")])),
    );

    const result = await fetchRelatedEvents(PESTE);

    expect(result).toHaveLength(1);
    expect(result[0].year).toBeNull();
  });

  it("ignora binding con item o itemLabel assenti", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sparqlOk([
          { itemLabel: { value: "Solo etichetta, nessun item" } }, // manca item
          { item: { value: "http://www.wikidata.org/entity/Q1" } }, // manca itemLabel
          binding("Q2", "Valido", "presente"),
        ]),
      ),
    );

    const result = await fetchRelatedEvents(PESTE);

    expect(result).toHaveLength(1);
    expect(result[0].wikidataId).toBe("Q2");
  });
});
