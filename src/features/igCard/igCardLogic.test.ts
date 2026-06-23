import { describe, expect, it } from "vitest";
import { clampIgIndex, igCountText, swipeStep, SWIPE_THRESHOLD_PX } from "./igCardLogic";

describe("clampIgIndex", () => {
  it("lascia passare un indice già dentro [0, n-1]", () => {
    expect(clampIgIndex(2, 4)).toBe(2);
  });

  it("clampa agli estremi quando l'indice esce dal range", () => {
    expect(clampIgIndex(-1, 4)).toBe(0);
    expect(clampIgIndex(99, 4)).toBe(3);
  });

  it("torna 0 quando non ci sono slide (n=0), senza dividere per zero", () => {
    expect(clampIgIndex(0, 0)).toBe(0);
    expect(clampIgIndex(5, 0)).toBe(0);
  });
});

describe("swipeStep", () => {
  it("sopra la soglia verso destra: slide precedente (-1)", () => {
    expect(swipeStep(SWIPE_THRESHOLD_PX + 1)).toBe(-1);
  });

  it("sopra la soglia verso sinistra: slide successiva (+1)", () => {
    expect(swipeStep(-SWIPE_THRESHOLD_PX - 1)).toBe(1);
  });

  it("sotto la soglia in entrambe le direzioni: nessun movimento (0)", () => {
    expect(swipeStep(SWIPE_THRESHOLD_PX)).toBe(0);
    expect(swipeStep(-SWIPE_THRESHOLD_PX)).toBe(0);
    expect(swipeStep(10)).toBe(0);
    expect(swipeStep(0)).toBe(0);
  });
});

describe("igCountText", () => {
  it('formatta "i / n" 1-based', () => {
    expect(igCountText(0, 4)).toBe("1 / 4");
    expect(igCountText(3, 4)).toBe("4 / 4");
  });

  it("torna stringa vuota quando non ci sono slide", () => {
    expect(igCountText(0, 0)).toBe("");
  });
});
