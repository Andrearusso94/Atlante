import { describe, expect, it, vi } from "vitest";
import { createTestContext } from "./testContext";
import { fmtY } from "../geo";

vi.mock("../borders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../borders")>();
  return { ...actual, cacheGeo: vi.fn() };
});

import { cacheGeo } from "../borders";
import { renderTerritory } from "./territory";

const cacheGeoMock = vi.mocked(cacheGeo);

// Nello span 1290-1310 c'è un solo snapshot reale: world_1300.geojson (vedi AVAILABLE).
const TRIANGLE: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
];

describe("renderTerritory", () => {
  it("se trova confini reali per gli alias, popola la scena e lo segnala onestamente", async () => {
    cacheGeoMock.mockResolvedValue({
      features: [{ properties: { NAME: "Roman Empire" }, geometry: { type: "Polygon", coordinates: [TRIANGLE] } }],
    });
    const ctx = createTestContext();
    const result = await renderTerritory(
      { archetype: "territory", title: "Roma", yearStart: 1290, yearEnd: 1310, subject: "Rome", aliases: ["Roman Empire"] },
      1290,
      1310,
      ctx,
    );
    expect(ctx.aiLayer.children).toHaveLength(1); // un solo file nello span -> un solo segmento
    expect(ctx.updaters).toHaveLength(1);
    expect(result.lastDataNote).toContain("historical-basemaps");
    expect(result.yearAt?.(0)).toBe(fmtY(1300));
    expect(result.curYearFn?.(0)).toBe(1300);
  });

  it("se nessuna feature combacia con gli alias, lo segnala senza inventare confini", async () => {
    cacheGeoMock.mockResolvedValue({
      features: [{ properties: { NAME: "Egypt" }, geometry: { type: "Polygon", coordinates: [TRIANGLE] } }],
    });
    const ctx = createTestContext();
    const result = await renderTerritory(
      { archetype: "territory", title: "Roma", yearStart: 1290, yearEnd: 1310, subject: "Rome", aliases: ["Roman Empire"] },
      1290,
      1310,
      ctx,
    );
    expect(ctx.aiLayer.children).toHaveLength(0);
    expect(result.yearAt).toBeUndefined();
    expect(result.lastDataNote).toContain("non trovati nel dataset");
  });

  it("se cacheGeo fallisce (rete assente) per tutti gli snapshot, degrada con grazia", async () => {
    cacheGeoMock.mockRejectedValue(new Error("rete assente"));
    const ctx = createTestContext();
    const result = await renderTerritory(
      { archetype: "territory", title: "Roma", yearStart: 1290, yearEnd: 1310, subject: "Rome", aliases: ["Roman Empire"] },
      1290,
      1310,
      ctx,
    );
    expect(ctx.aiLayer.children).toHaveLength(0);
    expect(result.lastDataNote).toContain("non trovati nel dataset");
  });
});
