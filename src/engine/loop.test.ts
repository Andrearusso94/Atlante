import { Group, Mesh, Quaternion, Vector3 } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// updateBorders è il punto giusto da mockare (vedi GlobeEngine.test.ts): è una chiamata
// esterna da loop.ts verso borders.ts, quindi un vi.mock qui la intercetta davvero
// (a differenza di cacheGeo, richiamato da ensureBorders *dentro* lo stesso modulo).
vi.mock("./borders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./borders")>();
  return { ...actual, updateBorders: vi.fn() };
});

import { approachQuaternion, createLoop, easeTowards, stepProgress } from "./loop";
import { updateBorders, createBordersState } from "./borders";
import { createPlagueState } from "./plague";
import { createSceneState } from "./scene";
import type { Globe } from "./globe";

const updateBordersMock = vi.mocked(updateBorders);

describe("approachQuaternion", () => {
  it("converge verso il bersaglio e scatta esattamente su di esso entro snapEps", () => {
    const current = new Quaternion(); // identità
    const target = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    let reached = false;
    for (let i = 0; i < 200 && !reached; i++) {
      reached = approachQuaternion(current, target, 0.07, 0.01);
    }
    expect(reached).toBe(true);
    expect(current.angleTo(target)).toBe(0);
  });

  it("con un solo passo si avvicina ma di norma non raggiunge ancora il bersaglio", () => {
    const current = new Quaternion();
    const target = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    const startAngle = current.angleTo(target);
    const reached = approachQuaternion(current, target, 0.07, 0.01);
    expect(reached).toBe(false);
    expect(current.angleTo(target)).toBeLessThan(startAngle);
    expect(current.angleTo(target)).toBeGreaterThan(0);
  });

  it("se current è già (quasi) il bersaglio, scatta subito", () => {
    const target = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.3);
    const current = target.clone();
    expect(approachQuaternion(current, target, 0.07, 0.01)).toBe(true);
  });
});

describe("stepProgress", () => {
  it("avanza della quantità data e fa il giro a 1 (loop continuo della timeline)", () => {
    expect(stepProgress(0)).toBeCloseTo(0.0014, 9);
    expect(stepProgress(0.9995, 0.001)).toBeCloseTo(0.0005, 9); // 0.9995+0.001=1.0005 -> %1
  });

  it("con dt=0 non avanza", () => {
    expect(stepProgress(0.42, 0)).toBe(0.42);
  });
});

describe("easeTowards", () => {
  it("si muove verso il target proporzionalmente al factor, senza mai superarlo in un passo", () => {
    expect(easeTowards(0, 1, 0.08)).toBeCloseTo(0.08, 9);
    expect(easeTowards(1, 0, 0.08)).toBeCloseTo(0.92, 9);
  });

  it("con factor=1 raggiunge il target in un solo passo", () => {
    expect(easeTowards(5, 12, 1)).toBe(12);
  });

  it("con factor=0 resta fermo", () => {
    expect(easeTowards(5, 12, 0)).toBe(5);
  });

  it("iterato converge al target (stesso schema di uniforms.mode/sun nel loop)", () => {
    let v = 0;
    for (let i = 0; i < 200; i++) v = easeTowards(v, 1, 0.08);
    expect(v).toBeCloseTo(1, 6);
  });
});

describe("createLoop — sincronizzazione automatica della Peste sul cambio confini", () => {
  beforeEach(() => {
    // requestAnimationFrame/cancelAnimationFrame non esistono in Node: il loop li
    // chiama appena tick() parte. innerWidth/innerHeight: vedi plague.test.ts.
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    updateBordersMock.mockReset();
  });

  function makeFakeGlobe(): Globe {
    const globeGroup = new Group();
    const sun = new Vector3(1, 0.18, 0.3).normalize();
    return {
      scene: {},
      camera: {},
      renderer: { render: () => {} },
      globe: globeGroup,
      earthMesh: new Mesh(),
      uniforms: {
        dayTex: { value: null },
        nightTex: { value: null },
        sunDir: { value: new Vector3() },
        hasTex: { value: 0 },
        mode: { value: 0 },
      },
      sun,
      sunTarget: sun.clone(),
      modeTarget: 0,
      dispose: () => {},
    } as unknown as Globe;
  }

  it("se lo scrubber porta l'anno fuori dal 1300 mentre la Peste è attiva, il layer si smonta da solo (senza passare da setYear/setBorders)", async () => {
    const g = makeFakeGlobe();
    const scene = createSceneState();
    scene.updaters.push(() => {}); // serve solo perché il blocco confini gira dopo questo controllo
    scene.curYearFn = () => 1500; // l'anno "corrente" che lo scrubber starebbe mostrando
    scene.yearAt = () => "1500 d.C.";

    const borders = createBordersState();
    borders.on = true;
    borders.file = "world_1300.geojson"; // i confini sono già sul 1300...

    const plague = createPlagueState();
    const plagueLayer = new Group();
    g.globe.add(plagueLayer);
    plague.layer = plagueLayer;
    plague.active = true; // ...e la Peste è attiva su quel file
    plague.file = "world_1300.geojson";

    // simula l'effetto reale di updateBorders: porta i confini al file del 1500
    updateBordersMock.mockImplementation(async (state) => {
      state.file = "world_1500.geojson";
      return { group: new Group(), previousGroup: null, eraLabel: "mappa del mondo: 1500 d.C." };
    });

    const onBordersEraChange = vi.fn();
    const loop = createLoop(
      g,
      { scene, borders, plague, makeLabel: () => new Mesh() },
      () => {},
      onBordersEraChange,
    );

    loop.start();
    await new Promise((resolve) => setTimeout(resolve, 0)); // lascia risolvere la then() di updateBorders
    loop.stop();

    expect(borders.file).toBe("world_1500.geojson");
    expect(plague.active).toBe(false);
    expect(plague.layer).toBeNull();
    expect(g.globe.children).not.toContain(plagueLayer);
    // un solo testo d'epoca: quello dei confini. syncPlague non ne produce uno proprio
    // perché smonta (want=false), non costruisce — esattamente come nel v12.
    expect(onBordersEraChange).toHaveBeenCalledTimes(1);
    expect(onBordersEraChange).toHaveBeenCalledWith("mappa del mondo: 1500 d.C.");
  });
});
