import { describe, expect, it } from "vitest";
import { createTestContext } from "./testContext";
import { renderJourney } from "./journey";

describe("renderJourney", () => {
  it("senza date reali, yearAt/curYearFn ricadono sull'interpolazione lineare ys/ye", () => {
    const ctx = createTestContext();
    const result = renderJourney(
      {
        archetype: "journey",
        title: "x",
        yearStart: 1000,
        yearEnd: 1010,
        items: [{ name: "Carovana", waypoints: [[0, 0], [10, 10]], fromYear: 1000, toYear: 1010 }],
      },
      1000,
      1010,
      ctx,
    );
    expect(result.yearAt?.(0)).toBe("1000 d.C.");
    expect(result.yearAt?.(1)).toBe("1010 d.C.");
    expect(result.curYearFn?.(0.5)).toBe(1005);
  });

  it("con date reali, usa dateLabel/parseISO (anche con l'arrotondamento letterale del v12)", () => {
    const ctx = createTestContext();
    // Stesso viaggio di FALLBACK.colombo (src/data/fallback.ts): 3 ago -> 12 ott 1492.
    const result = renderJourney(
      {
        archetype: "journey",
        title: "x",
        yearStart: 1492,
        yearEnd: 1492,
        items: [
          {
            name: "Flotta di Colombo",
            waypoints: [[37.23, -6.9], [24, -74.5]],
            fromYear: 1492,
            toYear: 1492,
            fromDate: "1492-08-03",
            toDate: "1492-10-12",
          },
        ],
      },
      1492,
      1492,
      ctx,
    );
    expect(result.yearAt?.(0)).toBe("3 ago 1492");
    expect(result.yearAt?.(1)).toBe("12 ott 1492");
    // curYearFn = Math.round(fy): fy = anno + giorno-dell'anno/365, letterale dal v12 —
    // per date nella seconda metà dell'anno arrotonda *in su* all'anno successivo.
    expect(result.curYearFn?.(0)).toBe(1493);
    expect(result.curYearFn?.(1)).toBe(1493);
  });

  it("aggiunge la rotta e una flotta di 3 navi per ogni item, con un updater ciascuno", () => {
    const ctx = createTestContext();
    renderJourney(
      {
        archetype: "journey",
        title: "x",
        yearStart: 1,
        yearEnd: 2,
        items: [
          { name: "A", waypoints: [[0, 0], [1, 1]], fromYear: 1, toYear: 2 },
          { name: "B", waypoints: [[2, 2], [3, 3]], fromYear: 1, toYear: 2 },
        ],
      },
      1,
      2,
      ctx,
    );
    // per item: 1 linea (rotta) + 1 gruppo flotta = 2 figli di aiLayer
    expect(ctx.aiLayer.children).toHaveLength(4);
    expect(ctx.updaters).toHaveLength(2);
  });
});
