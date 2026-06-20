// Dispatcher di rendering per archetipo — PORTATO LETTERALMENTE dal v12
// (sezione "RENDERER PER ARCHETIPO": clearScene, makeShip, placeShip, makeLabel,
// renderScene). makeLabel vive qui (non in engine/borders.ts): è canvas/DOM, e qui è
// dove il v12 lo definiva — borders.ts lo riceve iniettato come parametro (blocco 2).
//
// Blocco 5: aiLayer/updaters/sceneLabels/yearAt/curYearFn/lastDataNote NON sono più
// `let` di modulo (erano condivisi fra tutte le istanze) — sono raggruppati in
// SceneRuntimeState, che GlobeEngine possiede come campo privato e passa qui per
// riferimento. matGold/matHalo/makeLabel/makeShip/placeShip restano invece funzioni e
// risorse condivise senza stato proprio: usarle da più istanze è innocuo (nessuna le
// muta dopo la creazione), quindi non c'è nulla da isolare.

import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from "three";
import type { SceneSpec } from "../types/scene";
import { fmtY, lerp } from "./geo";
import { renderPulse } from "./archetypes/pulse";
import { renderJourney } from "./archetypes/journey";
import { renderSpread } from "./archetypes/spread";
import { renderNetwork } from "./archetypes/network";
import { renderTerritory } from "./archetypes/territory";
import type { ArchetypeContext } from "./archetypes/context";

/** Lo stato che nel v12 era sparso in `let`/`const` di modulo (aiLayer, updaters,
 * sceneLabels, yearAt, curYearFn, lastDataNote). Una `GlobeEngine` ne possiede una
 * copia privata — niente più condiviso fra istanze. */
export interface SceneRuntimeState {
  /** Il Group in cui clearScene/renderScene disegnano l'archetipo corrente. */
  aiLayer: Group;
  /** Callback per-frame della scena corrente; le esegue engine/loop.ts passando `progress`. */
  updaters: ((progress: number) => void)[];
  /** Sprite la cui visibilità il loop nasconde/mostra in base all'orientamento verso la camera. */
  sceneLabels: Object3D[];
  /** Etichetta dell'anno/data corrente in base alla progress 0..1 (per la timeline). */
  yearAt: (p: number) => string;
  /** Anno numerico corrente in base alla progress 0..1 (usato anche per pilotare i confini). */
  curYearFn: (p: number) => number;
  /** Avviso di onestà sui dati (golden principle) — sempre da mostrare nella lezione. */
  lastDataNote: string;
}

/** Stato iniziale identico a quello che il v12 aveva a script-load (prima di qualunque
 * renderScene/clearScene). Una per ogni GlobeEngine — niente singleton di modulo. */
export function createSceneState(): SceneRuntimeState {
  return {
    aiLayer: new Group(),
    updaters: [],
    sceneLabels: [],
    yearAt: () => "—",
    curYearFn: () => 0,
    lastDataNote: "",
  };
}

export const matGold = new MeshBasicMaterial({ color: 0xe3ac46 });
export const matHalo = new MeshBasicMaterial({ color: 0xe3ac46, transparent: true, opacity: 0.3 });

/** Svuota la scena corrente prima di disegnarne una nuova. */
export function clearScene(state: SceneRuntimeState): void {
  while (state.aiLayer.children.length) state.aiLayer.remove(state.aiLayer.children[0]);
  state.updaters = [];
  state.sceneLabels = [];
}

/** Etichetta di testo come sprite (canvas -> texture). Usata per nomi di eventi/nazioni. */
export function makeLabel(text: string): Sprite {
  const fs = 44;
  const pad = 18;
  const meas = document.createElement("canvas").getContext("2d")!;
  meas.font = `600 ${fs}px Inter,sans-serif`;
  const w = Math.ceil(meas.measureText(text).width);
  const c = document.createElement("canvas");
  c.width = w + pad * 2;
  c.height = fs + pad * 2;
  const x = c.getContext("2d")!;
  x.font = `600 ${fs}px Inter,sans-serif`;
  x.textBaseline = "middle";
  x.textAlign = "center";
  x.shadowColor = "rgba(0,0,0,.9)";
  x.shadowBlur = 10;
  x.fillStyle = "rgba(240,235,222,.97)";
  x.fillText(text, c.width / 2, c.height / 2);
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter;
  const sp = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.scale.set(c.width * 0.0009, c.height * 0.0009, 1);
  return sp;
}

/** Nave minimale (scafo + vela) per l'archetipo journey. */
export function makeShip(): Group {
  const g = new Group();
  const hull = new Mesh(new BoxGeometry(0.012, 0.008, 0.034), new MeshBasicMaterial({ color: 0x8a6334 }));
  hull.position.y = 0.004;
  g.add(hull);
  const sail = new Mesh(new PlaneGeometry(0.02, 0.018), new MeshBasicMaterial({ color: 0xf2eedd, side: DoubleSide }));
  sail.position.y = 0.016;
  g.add(sail);
  return g;
}

/** Posiziona/orienta una nave lungo la spezzata `pts` alla frazione `t`.
 * `lateralOffset` (il `lat` del v12: nome riciclato per l'offset nella formazione,
 * NON una latitudine) sposta la nave lateralmente rispetto alla rotta. */
export function placeShip(sh: Group, pts: Vector3[], t: number, lateralOffset: number): void {
  const n = pts.length;
  const f = Math.max(0, Math.min(1, t));
  const i = Math.min(n - 2, Math.max(0, Math.floor(f * (n - 1))));
  const here = pts[i];
  const next = pts[i + 1];
  const up = here.clone().normalize();
  const fwd = next.clone().sub(here).normalize();
  const right = new Vector3().crossVectors(up, fwd).normalize();
  const f2 = new Vector3().crossVectors(right, up).normalize();
  sh.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(right, up, f2));
  sh.position.copy(here.clone().add(right.clone().multiplyScalar(lateralOffset)).add(up.clone().multiplyScalar(0.006)));
}

/** Disegna la scena per la SceneSpec data dentro `state`, dispatchando all'archetipo giusto.
 *
 * Cosa NON fa, a differenza del v12 (di proposito): non scrive messaggi di
 * caricamento nel DOM (`#lessonBody` — tocca a features/lesson) e non resetta lo
 * stato della timeline (`progress`/`scrub`/`play`/`#timeline` — tocca a
 * engine/loop.ts + features/timeline).
 */
export async function renderScene(state: SceneRuntimeState, s: SceneSpec): Promise<void> {
  clearScene(state);
  const ys = s.yearStart;
  const ye = s.yearEnd;
  state.yearAt = (p) => fmtY(lerp(ys, ye, p));
  state.curYearFn = (p) => lerp(ys, ye, p);
  state.lastDataNote = "Coordinate generate dall'IA — verifica prima dell'uso in classe.";

  const ctx: ArchetypeContext = {
    aiLayer: state.aiLayer,
    updaters: state.updaters,
    sceneLabels: state.sceneLabels,
    matGold,
    matHalo,
    makeLabel,
    makeShip,
    placeShip,
  };

  const result =
    s.archetype === "pulse"
      ? await renderPulse(s, ys, ctx)
      : s.archetype === "journey"
        ? renderJourney(s, ys, ye, ctx)
        : s.archetype === "spread"
          ? renderSpread(s, ctx)
          : s.archetype === "network"
            ? renderNetwork(s, ys, ctx)
            : await renderTerritory(s, ys, ye, ctx);

  if (result.yearAt) state.yearAt = result.yearAt;
  if (result.curYearFn) state.curYearFn = result.curYearFn;
  if (result.lastDataNote !== undefined) state.lastDataNote = result.lastDataNote;
}
