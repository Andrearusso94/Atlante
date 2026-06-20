import { Group, Mesh, PerspectiveCamera, SphereGeometry } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobeEngine } from "./GlobeEngine";
import type { Globe } from "./globe";
import type { BordersRuntimeState } from "./borders";

// mount()/createGlobe() richiedono un vero canvas/contesto WebGL (new WebGLRenderer()
// lancia "document is not defined" nell'ambiente "node" di Vitest, verificato a parte) —
// qui testiamo tutto il resto della classe attraverso la sua interfaccia pubblica, senza
// mai accedere ai campi privati (è esattamente quello che il blocco 5 doveva isolare).
//
// Eccezione deliberata: il describe "Peste" più sotto inietta un Globe finto e forza
// bordersState direttamente nei campi privati (cast esplicito, commentato). Senza,
// l'integrazione enablePlague()->pickPlagueRegionAt() richiesta per questo blocco non
// sarebbe testabile per nulla, perché passa da mount(), che non può girare qui.

// `updateBorders` (non `cacheGeo`) è il punto giusto da mockare per setYear: cacheGeo è
// chiamato da ensureBorders *dentro lo stesso modulo* borders.ts, e un riferimento interno
// a una propria funzione non risente di un vi.mock esterno (che sostituisce solo il
// binding visto da chi importa da fuori, come GlobeEngine.ts fa con updateBorders).
vi.mock("./borders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./borders")>();
  return { ...actual, getCachedGeo: vi.fn(), updateBorders: vi.fn() };
});

import { getCachedGeo, updateBorders } from "./borders";

const getCachedGeoMock = vi.mocked(getCachedGeo);
const updateBordersMock = vi.mocked(updateBorders);

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

  it("pickPlagueRegionAt/enablePlague non lanciano senza un globo montato", () => {
    const engine = new GlobeEngine();
    expect(engine.pickPlagueRegionAt(0, 0)).toBeNull();
    expect(() => engine.enablePlague(true)).not.toThrow();
    expect(() => engine.enablePlague(false)).not.toThrow();
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

describe("GlobeEngine — Peste (engine/plague.ts collegato)", () => {
  beforeEach(() => {
    // resolvePlagueRegion legge innerWidth/innerHeight (assenti in Node) — vedi plague.test.ts.
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    getCachedGeoMock.mockReset();
    updateBordersMock.mockReset();
  });

  // Stessa regione di plague.test.ts: un click al centro schermo (camera in (0,0,2.7)
  // che guarda l'origine) colpisce il globo a (lat 0, lon -90); questo anello la contiene.
  const FRANCE_FC = {
    features: [
      {
        properties: { NAME: "France" },
        geometry: {
          type: "Polygon" as const,
          coordinates: [
            [
              [-95, -5],
              [-85, -5],
              [-85, 5],
              [-95, 5],
            ],
          ],
        },
      },
    ],
  };

  /** mount() reale non gira in Vitest (WebGLRenderer): iniettiamo direttamente lo stato
   * "post-mount" minimo che enablePlague/pickPlagueRegionAt leggono (camera/earthMesh/
   * globe three.js reali, nessun WebGL coinvolto — vedi plague.test.ts). */
  function injectFakeGlobe(engine: GlobeEngine): void {
    const camera = new PerspectiveCamera(45, 1024 / 768, 0.1, 1000);
    camera.position.set(0, 0, 2.7);
    camera.updateMatrixWorld(true);
    const earthMesh = new Mesh(new SphereGeometry(1, 64, 64));
    const globeGroup = new Group();
    globeGroup.add(earthMesh);
    globeGroup.updateMatrixWorld(true);
    const fakeGlobe = { camera, earthMesh, globe: globeGroup } as unknown as Globe;
    (engine as unknown as { globeHandle: Globe }).globeHandle = fakeGlobe;
  }

  function readBordersState(engine: GlobeEngine): BordersRuntimeState {
    return (engine as unknown as { bordersState: BordersRuntimeState }).bordersState;
  }

  it("enablePlague(true) costruisce il layer quando i confini sono sul 1300, e pickPlagueRegionAt risolve coerentemente", () => {
    getCachedGeoMock.mockReturnValue(FRANCE_FC);
    const onBordersEraChange = vi.fn();
    const engine = new GlobeEngine({ onBordersEraChange });
    injectFakeGlobe(engine);
    const borders = readBordersState(engine);
    borders.on = true;
    borders.file = "world_1300.geojson";

    engine.enablePlague(true);

    expect(onBordersEraChange).toHaveBeenCalledWith(expect.stringContaining("Peste Nera"));
    expect(engine.pickPlagueRegionAt(1024 / 2, 768 / 2)).toBe("France");
  });

  it("enablePlague(true) non fa nulla se i confini non sono sul 1300 (syncPlague decide da solo)", () => {
    getCachedGeoMock.mockReturnValue(FRANCE_FC);
    const engine = new GlobeEngine();
    injectFakeGlobe(engine);
    const borders = readBordersState(engine);
    borders.on = true;
    borders.file = "world_1400.geojson";

    engine.enablePlague(true);

    expect(engine.pickPlagueRegionAt(1024 / 2, 768 / 2)).toBeNull();
  });

  it("enablePlague(false) smonta il layer indipendentemente da bordersState (teardown diretto, non via syncPlague)", () => {
    getCachedGeoMock.mockReturnValue(FRANCE_FC);
    const engine = new GlobeEngine();
    injectFakeGlobe(engine);
    const borders = readBordersState(engine);
    borders.on = true;
    borders.file = "world_1300.geojson";
    engine.enablePlague(true);
    expect(engine.pickPlagueRegionAt(1024 / 2, 768 / 2)).toBe("France"); // attivo prima

    engine.enablePlague(false);

    expect(engine.pickPlagueRegionAt(1024 / 2, 768 / 2)).toBeNull();
  });

  it("setBorders(false) richiama syncPlague e smonta il layer Peste attivo", () => {
    getCachedGeoMock.mockReturnValue(FRANCE_FC);
    const engine = new GlobeEngine();
    injectFakeGlobe(engine);
    const borders = readBordersState(engine);
    borders.on = true;
    borders.file = "world_1300.geojson";
    engine.enablePlague(true);
    expect(engine.pickPlagueRegionAt(1024 / 2, 768 / 2)).toBe("France");

    engine.setBorders(false); // v12: syncPlague() era l'ultima riga di updateBorders

    expect(engine.pickPlagueRegionAt(1024 / 2, 768 / 2)).toBeNull();
  });

  it("setYear, con i confini già accesi, fa scattare syncPlague e costruisce il layer per il file caricato", async () => {
    // updateBorders mockato: il suo effetto reale (impostare state.file) è ciò che
    // syncPlagueWithBorders legge subito dopo — il resto (fetch/ensureBorders reali)
    // è già fuori scope di questo test (di rete), copiato dal comportamento vero.
    updateBordersMock.mockImplementation(async (state) => {
      state.file = "world_1300.geojson";
      return { group: new Group(), previousGroup: null, eraLabel: "mappa del mondo: 1300 d.C." };
    });
    getCachedGeoMock.mockReturnValue(FRANCE_FC);
    const engine = new GlobeEngine();
    injectFakeGlobe(engine);
    engine.setBorders(true); // confini accesi, ma file non ancora caricato

    await engine.setYear(1349); // nearestFile(1349) -> world_1300.geojson (verificato dal mock sopra)

    expect(engine.pickPlagueRegionAt(1024 / 2, 768 / 2)).toBe("France");
  });
});
