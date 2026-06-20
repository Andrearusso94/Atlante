import { describe, expect, it } from "vitest";
import { createTestContext } from "./testContext";
import { renderNetwork } from "./network";

describe("renderNetwork", () => {
  it("usa s.period come yearAt se presente", () => {
    const ctx = createTestContext();
    const result = renderNetwork(
      {
        archetype: "network",
        title: "x",
        period: "500 a.C. – 200 d.C.",
        yearStart: -500,
        yearEnd: 200,
        items: [{ from: [0, 0], to: [10, 10], label: "rotta" }],
      },
      -500,
      ctx,
    );
    expect(result.yearAt?.(0)).toBe("500 a.C. – 200 d.C.");
    expect(result.curYearFn?.(0)).toBe(-500);
  });

  it("senza period ricade su fmtY(ys)", () => {
    const ctx = createTestContext();
    const result = renderNetwork(
      {
        archetype: "network",
        title: "x",
        yearStart: 200,
        yearEnd: 300,
        items: [{ from: [0, 0], to: [10, 10], label: "rotta" }],
      },
      200,
      ctx,
    );
    expect(result.yearAt?.(0)).toBe("200 d.C.");
  });

  it("aggiunge una linea e un marcatore per ciascuno dei due capi, per ogni item", () => {
    const ctx = createTestContext();
    renderNetwork(
      {
        archetype: "network",
        title: "x",
        yearStart: 1,
        yearEnd: 2,
        items: [
          { from: [0, 0], to: [10, 10], label: "a" },
          { from: [20, 20], to: [30, 30], label: "b" },
        ],
      },
      1,
      ctx,
    );
    // per item: 1 linea + 2 marcatori (from/to) = 3 figli -> 2 item = 6
    expect(ctx.aiLayer.children).toHaveLength(6);
  });
});
