import { describe, expect, it, vi } from "vitest";
import { GlobeEngine } from "./GlobeEngine";

// mount()/createGlobe() richiedono un vero canvas/contesto WebGL (new WebGLRenderer()
// lancia "document is not defined" nell'ambiente "node" di Vitest, verificato a parte) —
// qui testiamo tutto il resto della classe attraverso la sua interfaccia pubblica, senza
// mai accedere ai campi privati (è esattamente quello che il blocco 5 doveva isolare).

describe("GlobeEngine — costruzione", () => {
  it("si costruisce senza argomenti", () => {
    expect(() => new GlobeEngine()).not.toThrow();
  });

  it("si costruisce con callback parziali", () => {
    expect(() => new GlobeEngine({ onTick: () => {} })).not.toThrow();
  });
});

describe("GlobeEngine — comandi prima di mount()", () => {
  it("setBorders/setTheme/setPlaying/setProgress/flyTo/setIdleSpinSuppressed non lanciano senza un globo montato", () => {
    const engine = new GlobeEngine();
    expect(() => engine.setBorders(true)).not.toThrow();
    expect(() => engine.setBorders(false)).not.toThrow();
    expect(() => engine.setTheme("night")).not.toThrow();
    expect(() => engine.setPlaying(true)).not.toThrow();
    expect(() => engine.setProgress(0.5)).not.toThrow();
    expect(() => engine.flyTo(41.9, 12.5)).not.toThrow();
    expect(() => engine.setIdleSpinSuppressed(true)).not.toThrow();
  });

  it("dispose() è sicuro anche se non si è mai chiamato mount()", () => {
    const engine = new GlobeEngine();
    expect(() => engine.dispose()).not.toThrow();
  });

  it("dispose() ripetuto è sicuro (idempotente)", () => {
    const engine = new GlobeEngine();
    engine.dispose();
    expect(() => engine.dispose()).not.toThrow();
  });
});

describe("GlobeEngine — renderScene", () => {
  it("funziona anche senza mount() (non tocca il globo three.js, solo lo stato di scena) e chiama onSceneReady", async () => {
    const onSceneReady = vi.fn();
    const engine = new GlobeEngine({ onSceneReady });
    // archetipo "network": nessuna chiamata di rete (a differenza di pulse/territory),
    // quindi è l'unico testabile qui senza mock di fetch/resolveItem.
    await engine.renderScene({
      archetype: "network",
      title: "Rotte",
      yearStart: 1,
      yearEnd: 2,
      items: [{ from: [0, 0], to: [10, 10], label: "rotta" }],
    });
    expect(onSceneReady).toHaveBeenCalledTimes(1);
  });

  it("renderScene ripetuto non lancia (clearScene + nuovo archetipo ogni volta)", async () => {
    const engine = new GlobeEngine();
    await engine.renderScene({
      archetype: "spread",
      title: "Peste",
      yearStart: 1347,
      yearEnd: 1351,
      items: [{ name: "Peste", originLat: 45, originLon: 35, targets: [[40, 10]], fromYear: 1347, toYear: 1351 }],
    });
    await expect(
      engine.renderScene({
        archetype: "network",
        title: "Rotte",
        yearStart: 1,
        yearEnd: 2,
        items: [{ from: [0, 0], to: [10, 10], label: "rotta" }],
      }),
    ).resolves.toBeUndefined();
  });
});
