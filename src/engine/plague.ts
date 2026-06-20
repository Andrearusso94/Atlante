// Layer cliccabile della Peste Nera — PORTATO LETTERALMENTE dal v12
// (sezione "FEATURE PESTE NERA": teardownPlague, syncPlague, resolvePlagueRegion).
// Golden principle: i confini delle regioni sono SOLO quelli reali del 1300 già
// scaricati da historical-basemaps (engine/borders.ts) — nessun poligono inventato.
//
// NON contiene `ensurePlagueReady`: quella è orchestrazione (carica la scena Peste,
// l'anno 1349, la lezione, ferma il play) e per RICOGNIZIONE-v12.md vive a livello
// feature/React, non nel motore — vedi nota §1 in RICOGNIZIONE-v12.md.

import { Group, Mesh, Raycaster, SphereGeometry, Vector2 } from "three";
import { PESTE } from "../data/peste";
import type { PlagueRegion } from "../types/peste";
import type { GeoRing } from "./geo";
import { gcDeg, ll2v, pip, v2ll } from "./geo";
import { getCachedGeo, geomRings, ringsToSeg } from "./borders";
import type { BordersRuntimeState } from "./borders";
import { matGold, matHalo } from "./scene";
import type { Globe } from "./globe";

export interface PlagueRegionHit {
  def: PlagueRegion;
  rings: GeoRing[];
}

/** Lo stato del layer Peste: nel v12 era `let` di modulo (plagueActive/plagueFile/
 * plagueLayer/plagueRegions/plagueMarks). GlobeEngine ne possiederà una copia privata,
 * come già per SceneRuntimeState/BordersRuntimeState (blocco 5). */
export interface PlagueRuntimeState {
  active: boolean;
  file: string | null;
  layer: Group | null;
  regions: PlagueRegionHit[];
  /** I "halo" che il loop fa pulsare (v12: animate() -> plagueMarks[i].scale...). */
  marks: Mesh[];
}

export function createPlagueState(): PlagueRuntimeState {
  return { active: false, file: null, layer: null, regions: [], marks: [] };
}

/** Smonta il layer Peste dalla scena e azzera lo stato. */
export function teardownPlague(state: PlagueRuntimeState, globeGroup: Group): void {
  if (state.layer) {
    globeGroup.remove(state.layer);
    state.layer = null;
  }
  state.regions = [];
  state.marks = [];
  state.active = false;
  state.file = null;
}

export interface PlagueSyncResult {
  /** Etichetta dell'epoca (v12: HTML di #bEra quando la Peste è attiva — contiene
   * markup, non solo testo, esattamente come nel v12: la card sceglie come mostrarlo). */
  eraLabel: string;
}

/**
 * Sincronizza il layer cliccabile della Peste con lo stato corrente dei confini
 * (porting di `syncPlague`). Ritorna `eraLabel` solo quando il layer è stato
 * (ri)costruito da zero — `null` quando non c'è nulla di nuovo da mostrare (layer
 * smontato, già attivo sullo stesso file, o confini del 1300 non ancora in cache).
 *
 * A differenza del v12, NON scrive `#bEra.innerHTML` direttamente (stesso pattern di
 * borders.ts/updateBorders): lo fa il chiamante con `eraLabel`.
 */
export function syncPlague(
  state: PlagueRuntimeState,
  globeGroup: Group,
  borders: BordersRuntimeState,
): PlagueSyncResult | null {
  const want = borders.on && borders.file === "world_1300.geojson";
  if (!want) {
    if (state.active) teardownPlague(state, globeGroup);
    return null;
  }
  if (state.active && state.file === borders.file) {
    if (state.layer) state.layer.visible = true;
    return null;
  }
  teardownPlague(state, globeGroup);
  const fc = getCachedGeo("world_1300.geojson");
  if (!fc) return null;
  const layer = new Group();
  globeGroup.add(layer);
  for (const def of PESTE) {
    const rings: GeoRing[] = [];
    for (const ft of fc.features || []) {
      if (((ft.properties && ft.properties.NAME) || "") === def.name) {
        rings.push(...geomRings(ft.geometry || { type: "" }, 160));
      }
    }
    if (!rings.length) continue;
    layer.add(ringsToSeg(rings, 0xe3ac46, 0.92, 1.016)); // R*1.016 nel v12 (R=1)
    const pos = ll2v(def.ll[0], def.ll[1], 1.02); // R*1.02
    const dot = new Mesh(new SphereGeometry(0.013, 12, 12), matGold);
    dot.position.copy(pos);
    const halo = new Mesh(new SphereGeometry(0.026, 14, 14), matHalo);
    dot.add(halo);
    layer.add(dot);
    state.marks.push(halo);
    state.regions.push({ def, rings });
  }
  state.layer = layer;
  state.active = true;
  state.file = borders.file;
  return { eraLabel: 'mappa del 1300 · <span style="color:var(--gold-2)">☩ Peste Nera — tocca un territorio</span>' };
}

/** Anima i marcatori (gli "halo") pulsanti della Peste — porting letterale del frammento
 * dentro `animate()` del v12 (`if(plagueActive&&plagueMarks.length){...}`). Va chiamata
 * ogni frame: è il parametro `tickPlague` di `createLoop` (engine/loop.ts). */
export function tickPlagueMarks(state: PlagueRuntimeState, t: number): void {
  if (state.active && state.marks.length) {
    for (let i = 0; i < state.marks.length; i++) {
      state.marks[i].scale.setScalar(1 + Math.sin(t * 0.004 + i * 0.7) * 0.35);
    }
  }
}

// Raycaster condiviso (scratch, come `_tmp` in engine/loop.ts): risolvePlagueRegion lo
// reimposta per intero ad ogni chiamata, quindi condividerlo è innocuo ed evita
// un'allocazione ad ogni click/tap.
const ray = new Raycaster();

/**
 * Risolve un punto schermo (x,y) nella regione Peste cliccata, se c'è (porting di
 * `resolvePlagueRegion`): raycast sulla mesh della Terra, point-in-polygon sugli anelli
 * reali della regione; se nessun poligono combacia ma il punto è "vicino" (entro 7°)
 * al centro di una regione, la sceglie comunque (tolleranza per territori piccoli o
 * dati imprecisi) — esattamente come nel v12.
 */
export function resolvePlagueRegion(
  state: PlagueRuntimeState,
  g: Globe,
  cx: number,
  cy: number,
): PlagueRegion | null {
  if (!state.active || !state.regions.length) return null;
  const ndc = new Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, g.camera);
  const hit = ray.intersectObject(g.earthMesh, false)[0];
  if (!hit) return null;
  const loc = g.globe.worldToLocal(hit.point.clone()).normalize();
  const [lat, lon] = v2ll(loc);
  for (const rg of state.regions) {
    if (rg.rings.some((r) => pip(lon, lat, r))) return rg.def;
  }
  let best: PlagueRegion | null = null;
  let bd = 1e9;
  for (const rg of state.regions) {
    const d = gcDeg(lat, lon, rg.def.ll[0], rg.def.ll[1]);
    if (d < bd) {
      bd = d;
      best = rg.def;
    }
  }
  return bd <= 7 ? best : null;
}
