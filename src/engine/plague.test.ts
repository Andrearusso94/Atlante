import { Group, Mesh, PerspectiveCamera, SphereGeometry } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Globe } from "./globe";
import { createBordersState } from "./borders";
import type { BordersRuntimeState } from "./borders";
import type { PlagueRegion } from "../types/peste";

// resolvePlagueRegion legge innerWidth/innerHeight (globali browser, v12 li leggeva allo
// stesso modo) — assenti nell'ambiente "node" di Vitest: li forniamo con vi.stubGlobal.
// Il raycast/intersectObject è pura matematica (nessun renderer/WebGL coinvolto), quindi
// è testabile con istanze three.js reali.
vi.mock("./borders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./borders")>();
  return { ...actual, getCachedGeo: vi.fn() };
});

import { getCachedGeo } from "./borders";
import { createPlagueState, resolvePlagueRegion, syncPlague, teardownPlague } from "./plague";

const getCachedGeoMock = vi.mocked(getCachedGeo);

beforeEach(() => {
  vi.stubGlobal("innerWidth", 1024);
  vi.stubGlobal("innerHeight", 768);
});

afterEach(() => {
  vi.unstubAllGlobals();
  getCachedGeoMock.mockReset();
});

/** Globo finto ma con camera/mesh/group three.js reali: il raycast non ha bisogno di
 * WebGL, solo di una camera con la matrice aggiornata e una mesh sferica vera. */
function makeTestGlobe(): Globe {
  const camera = new PerspectiveCamera(45, 1024 / 768, 0.1, 1000);
  camera.position.set(0, 0, 2.7);
  camera.updateMatrixWorld(true);
  const earthMesh = new Mesh(new SphereGeometry(1, 64, 64));
  const globeGroup = new Group();
  globeGroup.add(earthMesh);
  globeGroup.updateMatrixWorld(true);
  return { camera, earthMesh, globe: globeGroup } as unknown as Globe;
}

const region = (over: Partial<PlagueRegion> = {}): PlagueRegion => ({
  name: "Test",
  label: "Zona di test",
  ll: [0, -90],
  slides: [],
  ...over,
});

describe("resolvePlagueRegion", () => {
  it("risolve via point-in-polygon: un click al centro schermo colpisce (lat 0, lon -90)", () => {
    const g = makeTestGlobe();
    const state = createPlagueState();
    state.active = true;
    state.regions = [
      {
        def: region({ name: "Dentro" }),
        rings: [
          [
            [-95, -5],
            [-85, -5],
            [-85, 5],
            [-95, 5],
          ],
        ],
      },
    ];
    const hit = resolvePlagueRegion(state, g, 1024 / 2, 768 / 2);
    expect(hit?.name).toBe("Dentro");
  });

  it("se nessun poligono combacia ma una regione ha ll molto vicino, ricade su quella (tolleranza 7°)", () => {
    const g = makeTestGlobe();
    const state = createPlagueState();
    state.active = true;
    state.regions = [
      {
        // poligono lontano dal punto colpito: il point-in-polygon fallisce di proposito
        def: region({ name: "Vicino per centro", ll: [0, -90] }),
        rings: [
          [
            [50, 50],
            [51, 50],
            [51, 51],
            [50, 51],
          ],
        ],
      },
    ];
    const hit = resolvePlagueRegion(state, g, 1024 / 2, 768 / 2);
    expect(hit?.name).toBe("Vicino per centro");
  });

  it("ritorna null se non c'è nessuna regione abbastanza vicina", () => {
    const g = makeTestGlobe();
    const state = createPlagueState();
    state.active = true;
    state.regions = [
      {
        def: region({ name: "Lontano", ll: [80, 80] }),
        rings: [
          [
            [50, 50],
            [51, 50],
            [51, 51],
            [50, 51],
          ],
        ],
      },
    ];
    expect(resolvePlagueRegion(state, g, 1024 / 2, 768 / 2)).toBeNull();
  });

  it("ritorna null se il layer non è attivo, anche con regioni presenti", () => {
    const g = makeTestGlobe();
    const state = createPlagueState();
    state.active = false;
    state.regions = [{ def: region(), rings: [] }];
    expect(resolvePlagueRegion(state, g, 1024 / 2, 768 / 2)).toBeNull();
  });
});

describe("teardownPlague", () => {
  it("rimuove il layer dalla scena e azzera lo stato", () => {
    const globeGroup = new Group();
    const layer = new Group();
    globeGroup.add(layer);
    const state = createPlagueState();
    state.active = true;
    state.file = "world_1300.geojson";
    state.layer = layer;
    state.regions = [{ def: region(), rings: [] }];
    state.marks = [new Mesh()];

    teardownPlague(state, globeGroup);

    expect(globeGroup.children).toHaveLength(0);
    expect(state.active).toBe(false);
    expect(state.file).toBeNull();
    expect(state.layer).toBeNull();
    expect(state.regions).toHaveLength(0);
    expect(state.marks).toHaveLength(0);
  });
});

describe("syncPlague", () => {
  function bordersState(over: Partial<BordersRuntimeState> = {}): BordersRuntimeState {
    return { ...createBordersState(), ...over };
  }

  it("se i confini non sono sul 1300, smonta un layer eventualmente attivo e ritorna null", () => {
    const globeGroup = new Group();
    const state = createPlagueState();
    state.active = true;
    state.layer = new Group();
    globeGroup.add(state.layer);

    const result = syncPlague(state, globeGroup, bordersState({ on: true, file: "world_1400.geojson" }));

    expect(result).toBeNull();
    expect(state.active).toBe(false);
    expect(globeGroup.children).toHaveLength(0);
  });

  it("se è già attivo sullo stesso file, si limita a renderlo visibile e non ricostruisce", () => {
    const globeGroup = new Group();
    const layer = new Group();
    layer.visible = false;
    const state = createPlagueState();
    state.active = true;
    state.file = "world_1300.geojson";
    state.layer = layer;

    const result = syncPlague(state, globeGroup, bordersState({ on: true, file: "world_1300.geojson" }));

    expect(result).toBeNull();
    expect(layer.visible).toBe(true);
    expect(getCachedGeoMock).not.toHaveBeenCalled();
  });

  it("se i confini del 1300 non sono ancora in cache, non costruisce nulla", () => {
    getCachedGeoMock.mockReturnValue(undefined);
    const globeGroup = new Group();
    const state = createPlagueState();

    const result = syncPlague(state, globeGroup, bordersState({ on: true, file: "world_1300.geojson" }));

    expect(result).toBeNull();
    expect(state.active).toBe(false);
  });

  it("costruisce il layer per le regioni PESTE trovate nel GeoJSON e ritorna l'etichetta d'epoca", () => {
    getCachedGeoMock.mockReturnValue({
      features: [
        {
          properties: { NAME: "France" }, // un nome reale del dataset PESTE
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 40],
                [5, 40],
                [5, 45],
              ],
            ],
          },
        },
      ],
    });
    const globeGroup = new Group();
    const state = createPlagueState();

    const result = syncPlague(state, globeGroup, bordersState({ on: true, file: "world_1300.geojson" }));

    expect(result?.eraLabel).toContain("Peste Nera");
    expect(state.active).toBe(true);
    expect(state.regions).toHaveLength(1);
    expect(state.regions[0].def.name).toBe("France");
    expect(globeGroup.children).toHaveLength(1); // il layer
  });
});
