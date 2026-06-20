import { Line } from "three";
import { describe, expect, it } from "vitest";
import { createTestContext } from "./testContext";
import { renderSpread } from "./spread";

describe("renderSpread", () => {
  it("non sovrascrive yearAt/curYearFn/lastDataNote (il v12 non li tocca in questo ramo)", () => {
    const ctx = createTestContext();
    const result = renderSpread(
      {
        archetype: "spread",
        title: "x",
        yearStart: 1347,
        yearEnd: 1351,
        items: [{ name: "Peste", originLat: 45, originLon: 35, targets: [[40, 10]], fromYear: 1347, toYear: 1351 }],
      },
      ctx,
    );
    expect(result).toEqual({});
  });

  it("aggiunge origine + linea/punta per ogni target, un updater per target", () => {
    const ctx = createTestContext();
    renderSpread(
      {
        archetype: "spread",
        title: "x",
        yearStart: 1347,
        yearEnd: 1351,
        items: [
          {
            name: "Peste",
            originLat: 45,
            originLon: 35,
            targets: [[40, 10], [50, 0]],
            fromYear: 1347,
            toYear: 1351,
          },
        ],
      },
      ctx,
    );
    // 1 origine + (linea+punta) per ognuno dei 2 target = 5 figli
    expect(ctx.aiLayer.children).toHaveLength(5);
    expect(ctx.updaters).toHaveLength(2);
  });

  it("gli updater rivelano progressivamente la linea (drawRange) e mostrano la punta", () => {
    const ctx = createTestContext();
    renderSpread(
      {
        archetype: "spread",
        title: "x",
        yearStart: 1347,
        yearEnd: 1351,
        items: [
          { name: "Peste", originLat: 45, originLon: 35, targets: [[40, 10]], fromYear: 1347, toYear: 1351 },
        ],
      },
      ctx,
    );
    const [, line, tip] = ctx.aiLayer.children as [unknown, Line, { visible: boolean }];
    const fullLength = line.geometry.getAttribute("position").count;

    ctx.updaters[0](0); // start del primo (unico) target è 0: a p=0 non si è ancora mosso
    expect(line.geometry.drawRange.count).toBe(0);
    expect(tip.visible).toBe(false);

    ctx.updaters[0](1); // a fine corsa la linea è rivelata per intero e la punta è visibile
    expect(line.geometry.drawRange.count).toBe(fullLength);
    expect(tip.visible).toBe(true);
  });
});
