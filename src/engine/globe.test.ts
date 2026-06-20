import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { setBordersBlend, setTheme, THEMES, type Globe } from "./globe";

// createGlobe(container) richiede un vero canvas/contesto WebGL (non disponibile
// nell'ambiente "node" di Vitest): qui testiamo setTheme/setBordersBlend isolatamente,
// con uno stub che ha solo i campi che queste due funzioni leggono/scrivono davvero.
function stubGlobe(): Globe {
  return {
    sunTarget: new Vector3(),
    modeTarget: 0,
  } as unknown as Globe;
}

describe("setTheme", () => {
  it("copia e normalizza il tema scelto su sunTarget", () => {
    const g = stubGlobe();
    setTheme(g, "night");
    expect(g.sunTarget.x).toBeCloseTo(THEMES.night.clone().normalize().x, 9);
    expect(g.sunTarget.length()).toBeCloseTo(1, 9);
  });

  it("i tre temi sono direzioni diverse", () => {
    const g = stubGlobe();
    setTheme(g, "day");
    const day = g.sunTarget.clone();
    setTheme(g, "term");
    const term = g.sunTarget.clone();
    setTheme(g, "night");
    const night = g.sunTarget.clone();
    expect(day.distanceTo(term)).toBeGreaterThan(0.1);
    expect(term.distanceTo(night)).toBeGreaterThan(0.1);
  });
});

describe("setBordersBlend", () => {
  it("imposta modeTarget a 1 quando i confini sono attivi, 0 quando no", () => {
    const g = stubGlobe();
    setBordersBlend(g, true);
    expect(g.modeTarget).toBe(1);
    setBordersBlend(g, false);
    expect(g.modeTarget).toBe(0);
  });
});
