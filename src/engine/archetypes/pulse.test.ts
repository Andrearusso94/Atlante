import { describe, expect, it, vi } from "vitest";
import { createTestContext } from "./testContext";

vi.mock("../wikidata", () => ({ resolveItem: vi.fn() }));

import { resolveItem } from "../wikidata";
import { renderPulse } from "./pulse";

const resolveItemMock = vi.mocked(resolveItem);

describe("renderPulse", () => {
  it("per ogni evento risolto aggiunge marcatore+etichetta e conta gli ok", async () => {
    resolveItemMock.mockResolvedValue({ name: "Battaglia di Canne", lat: 41.3, lon: 16.1, year: -216 });
    const ctx = createTestContext();
    const result = await renderPulse(
      { archetype: "pulse", title: "x", yearStart: -216, yearEnd: -216, items: [{ query: "Battaglia di Canne" }] },
      -216,
      ctx,
    );
    expect(ctx.aiLayer.children).toHaveLength(2); // marcatore (con halo figlio) + etichetta
    expect(ctx.updaters).toHaveLength(1);
    expect(ctx.sceneLabels).toHaveLength(1);
    expect(result.lastDataNote).toContain("1 trovati");
    expect(result.lastDataNote).not.toContain("non risolti");
  });

  it("se nessun evento si risolve lo segnala e non aggiunge nulla alla scena", async () => {
    resolveItemMock.mockResolvedValue(null);
    const ctx = createTestContext();
    const result = await renderPulse(
      { archetype: "pulse", title: "x", yearStart: 100, yearEnd: 100, items: [{ query: "Boh" }] },
      100,
      ctx,
    );
    expect(ctx.aiLayer.children).toHaveLength(0);
    expect(result.lastDataNote).toBe("Nessun evento risolto su Wikidata (rete assente o nomi non trovati).");
  });

  it("messaggio misto quando alcuni eventi si risolvono e altri no", async () => {
    resolveItemMock
      .mockResolvedValueOnce({ name: "A", lat: 0, lon: 0, year: 1 })
      .mockResolvedValueOnce(null);
    const ctx = createTestContext();
    const result = await renderPulse(
      {
        archetype: "pulse",
        title: "x",
        yearStart: 1,
        yearEnd: 1,
        items: [{ query: "A" }, { query: "B" }],
      },
      1,
      ctx,
    );
    expect(result.lastDataNote).toContain("1 trovati");
    expect(result.lastDataNote).toContain("1 non risolti");
  });

  it("yearAt/curYearFn sono fissi sull'anno di partenza (pulse non anima nel tempo)", async () => {
    resolveItemMock.mockResolvedValue(null);
    const ctx = createTestContext();
    const result = await renderPulse(
      { archetype: "pulse", title: "x", yearStart: 117, yearEnd: 117, items: [] },
      117,
      ctx,
    );
    expect(result.yearAt?.(0)).toBe("117 d.C.");
    expect(result.yearAt?.(0.9)).toBe("117 d.C.");
    expect(result.curYearFn?.(0.9)).toBe(117);
  });
});
