// Confini storici reali (historical-basemaps) — PORTATO LETTERALMENTE dal v12
// (sezione "GENERATORE IA + CONFINI REALI" + "data layer: GeoJSON reali").
// Golden principle: confini SOLO da questa fonte esterna, mai disegnati/inventati dall'IA.

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  type Object3D,
} from "three";
import { featCentroid, fmtY, lonlat2v, polygonsOf } from "./geo";
import type { GeoFeatureCollection, GeoGeometry, GeoRing } from "./geo";

export const CDN = "https://cdn.jsdelivr.net/gh/aourednik/historical-basemaps@master/geojson/";

export interface AvailableYear {
  y: number;
  f: string;
}

export const AVAILABLE: AvailableYear[] = [
  { y: -123000, f: "world_bc123000.geojson" },
  { y: -10000, f: "world_bc10000.geojson" },
  { y: -8000, f: "world_bc8000.geojson" },
  { y: -5000, f: "world_bc5000.geojson" },
  { y: -4000, f: "world_bc4000.geojson" },
  { y: -3000, f: "world_bc3000.geojson" },
  { y: -2000, f: "world_bc2000.geojson" },
  { y: -1500, f: "world_bc1500.geojson" },
  { y: -1000, f: "world_bc1000.geojson" },
  { y: -700, f: "world_bc700.geojson" },
  { y: -500, f: "world_bc500.geojson" },
  { y: -400, f: "world_bc400.geojson" },
  { y: -323, f: "world_bc323.geojson" },
  { y: -300, f: "world_bc300.geojson" },
  { y: -200, f: "world_bc200.geojson" },
  { y: -100, f: "world_bc100.geojson" },
  { y: -1, f: "world_bc1.geojson" },
  { y: 100, f: "world_100.geojson" },
  { y: 200, f: "world_200.geojson" },
  { y: 300, f: "world_300.geojson" },
  { y: 400, f: "world_400.geojson" },
  { y: 500, f: "world_500.geojson" },
  { y: 600, f: "world_600.geojson" },
  { y: 700, f: "world_700.geojson" },
  { y: 800, f: "world_800.geojson" },
  { y: 900, f: "world_900.geojson" },
  { y: 1000, f: "world_1000.geojson" },
  { y: 1100, f: "world_1100.geojson" },
  { y: 1200, f: "world_1200.geojson" },
  { y: 1279, f: "world_1279.geojson" },
  { y: 1300, f: "world_1300.geojson" },
  { y: 1400, f: "world_1400.geojson" },
  { y: 1492, f: "world_1492.geojson" },
  { y: 1500, f: "world_1500.geojson" },
  { y: 1530, f: "world_1530.geojson" },
  { y: 1600, f: "world_1600.geojson" },
  { y: 1650, f: "world_1650.geojson" },
  { y: 1700, f: "world_1700.geojson" },
  { y: 1715, f: "world_1715.geojson" },
  { y: 1783, f: "world_1783.geojson" },
  { y: 1800, f: "world_1800.geojson" },
  { y: 1815, f: "world_1815.geojson" },
  { y: 1880, f: "world_1880.geojson" },
  { y: 1900, f: "world_1900.geojson" },
  { y: 1914, f: "world_1914.geojson" },
  { y: 1920, f: "world_1920.geojson" },
  { y: 1930, f: "world_1930.geojson" },
  { y: 1938, f: "world_1938.geojson" },
  { y: 1945, f: "world_1945.geojson" },
  { y: 1960, f: "world_1960.geojson" },
  { y: 1994, f: "world_1994.geojson" },
  { y: 2000, f: "world_2000.geojson" },
  { y: 2010, f: "world_2010.geojson" },
];

const geoCache: Record<string, GeoFeatureCollection> = {};

/** Scarica (con cache in memoria) il GeoJSON dei confini per `file`. */
export async function cacheGeo(file: string): Promise<GeoFeatureCollection> {
  if (geoCache[file]) return geoCache[file];
  const r = await fetch(CDN + file);
  if (!r.ok) throw new Error(`${file} ${r.status}`);
  const j = (await r.json()) as GeoFeatureCollection;
  geoCache[file] = j;
  return j;
}

/** Lo snapshot di AVAILABLE più vicino all'anno dato. */
export function nearestFile(year: number): AvailableYear {
  let b = AVAILABLE[0];
  for (const a of AVAILABLE) if (Math.abs(a.y - year) < Math.abs(b.y - year)) b = a;
  return b;
}

/** Gli snapshot disponibili nell'intervallo [y0,y1], campionati fino a `maxN` se sono troppi
 * (usato per scegliere quanti confini caricare lungo un range, es. negli archetipi journey). */
export function filesInSpan(y0: number, y1: number, maxN: number): AvailableYear[] {
  let inb = AVAILABLE.filter((a) => a.y >= y0 && a.y <= y1);
  if (!inb.length) inb = [nearestFile((y0 + y1) / 2)];
  if (inb.length > maxN) {
    const out: AvailableYear[] = [];
    const step = (inb.length - 1) / (maxN - 1);
    for (let i = 0; i < maxN; i++) out.push(inb[Math.round(i * step)]);
    return out.filter((v, i, a) => a.indexOf(v) === i);
  }
  return inb;
}

/** Anelli (poligoni) di una geometria, con downsampling a `cap` vertici se troppo densa. */
export function geomRings(g: GeoGeometry, cap: number): GeoRing[] {
  const polys = polygonsOf(g);
  const rings: GeoRing[] = [];
  for (const poly of polys) {
    let r = poly[0];
    if (!r || r.length < 3) continue;
    if (r.length > cap) {
      const st = Math.ceil(r.length / cap);
      const r2: GeoRing = [];
      for (let i = 0; i < r.length; i += st) r2.push(r[i]);
      r = r2;
    }
    rings.push(r);
  }
  return rings;
}

/** Anelli delle sole feature la cui NAME combacia con uno degli `aliases` (territory). */
export function subjectRings(fc: GeoFeatureCollection, aliases: string[], cap: number): GeoRing[] {
  const al = aliases.map((a) => a.toLowerCase());
  const rings: GeoRing[] = [];
  for (const ft of fc.features || []) {
    const nm = ((ft.properties && ft.properties.NAME) || "").toLowerCase();
    if (!nm) continue;
    if (al.includes(nm) || al.some((a) => nm.includes(a))) {
      rings.push(...geomRings(ft.geometry || { type: "" }, cap));
    }
  }
  return rings;
}

/** Anelli di tutte le feature (mappa politica completa di uno snapshot). */
export function allRings(fc: GeoFeatureCollection, cap: number): GeoRing[] {
  const rings: GeoRing[] = [];
  for (const ft of fc.features || []) rings.push(...geomRings(ft.geometry || { type: "" }, cap));
  return rings;
}

/** Anelli -> linee three.js sulla sfera. `rad` default 1.012 = R*1.012 del v12 (R, il
 * raggio del globo, è sempre 1 — qui è un parametro invece di una costante globale). */
export function ringsToSeg(
  rings: GeoRing[],
  color: number,
  opacity: number,
  rad = 1.012,
): LineSegments<BufferGeometry, LineBasicMaterial> {
  const v: number[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (Math.abs(a[0] - b[0]) > 180) continue; // salta i segmenti che attraversano l'antimeridiano
      const va = lonlat2v(a[0], a[1], rad);
      const vb = lonlat2v(b[0], b[1], rad);
      v.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(v, 3));
  return new LineSegments(g, new LineBasicMaterial({ color, transparent: true, opacity }));
}

const bordersCache: Record<string, Group> = {};

/** Costruisce (con cache) il Group dei confini di `file`: linee + etichette delle nazioni
 * più rilevanti (le 60 con anello più grande, soglia minima 12 vertici, come nel v12).
 * `makeLabel` è iniettato: è canvas/DOM (engine/scene.ts, blocco successivo), non appartiene
 * a questo modulo. */
export async function ensureBorders(
  file: string,
  makeLabel: (text: string) => Object3D,
): Promise<Group> {
  if (bordersCache[file]) return bordersCache[file];
  const fc = await cacheGeo(file);
  const grp = new Group();
  grp.add(ringsToSeg(allRings(fc, 90), 0x9bb4d6, 0.5));
  const labels = new Group();
  grp.add(labels);
  grp.userData.labels = labels;
  const cand: { nm: string; cen: { lon: number; lat: number; size: number } }[] = [];
  for (const ft of fc.features || []) {
    const nm = (ft.properties && ft.properties.NAME) || "";
    if (!nm) continue;
    const cen = featCentroid(ft.geometry || { type: "" });
    if (cen && cen.size >= 12) cand.push({ nm, cen });
  }
  cand.sort((a, b) => b.cen.size - a.cen.size);
  cand.slice(0, 60).forEach((o) => {
    const disp = o.nm.length > 20 ? `${o.nm.slice(0, 18)}…` : o.nm;
    const sp = makeLabel(disp);
    sp.position.copy(lonlat2v(o.cen.lon, o.cen.lat, 1.03));
    labels.add(sp);
  });
  bordersCache[file] = grp;
  return grp;
}

/** Lo stato dei confini correntemente caricati: nel v12 era `let` di modulo
 * (bordersFile/bordersObj/bordersBusy/bordersOn). Blocco 5: GlobeEngine ne possiede
 * una copia privata e la passa per riferimento a setBordersOn/updateBorders — niente
 * più condiviso fra istanze (engine/loop.ts la legge/scrive allo stesso modo). */
export interface BordersRuntimeState {
  file: string | null;
  obj: Group | null;
  busy: boolean;
  on: boolean;
}

export function createBordersState(): BordersRuntimeState {
  return { file: null, obj: null, busy: false, on: false };
}

/** Comando `setBorders(on)` dell'interfaccia GlobeEngine: applica subito la visibilità
 * al gruppo già caricato (se c'è). Il toggle/testo UI restano a React (modeSlice.bordersOn);
 * qui è solo lo specchio interno che il motore usa per disegnare correttamente. */
export function setBordersOn(state: BordersRuntimeState, on: boolean): void {
  state.on = on;
  if (state.obj) state.obj.visible = on;
}

export interface BordersUpdate {
  /** Il gruppo three.js da mostrare per l'anno richiesto. */
  group: Group;
  /** Il gruppo precedente, se diverso (il chiamante deve rimuoverlo dalla scena). */
  previousGroup: Group | null;
  /** Etichetta dell'epoca, es. "mappa del mondo: 1300 d.C." (v12: testo di #bEra). */
  eraLabel: string;
}

/**
 * Aggiorna i confini per l'anno dato dentro `state` (porting di `updateBorders`).
 * Restituisce `null` se lo snapshot più vicino è già quello caricato (o il caricamento
 * è già in corso) — in tal caso applica solo la visibilità corrente al gruppo
 * esistente, senza altro.
 *
 * Cosa NON fa, a differenza del v12 (di proposito, per restare framework-agnostico):
 * non tocca la scena three.js (`globe.add/remove` — lo fa il chiamante con `group`/
 * `previousGroup`), non tocca il DOM (`#bEra` — lo fa React con `eraLabel`), non chiama
 * `syncPlague()` (engine/plague.ts, non ancora scritto — lo farà GlobeEngine in fase
 * di assemblaggio, sapendo sia dei confini che della Peste).
 */
export async function updateBorders(
  state: BordersRuntimeState,
  year: number,
  makeLabel: (text: string) => Object3D,
): Promise<BordersUpdate | null> {
  const a = nearestFile(year);
  if (a.f !== state.file && !state.busy) {
    state.busy = true;
    try {
      const grp = await ensureBorders(a.f, makeLabel);
      const previousGroup = state.obj && state.obj !== grp ? state.obj : null;
      grp.visible = state.on;
      state.obj = grp;
      state.file = a.f;
      state.busy = false;
      return { group: grp, previousGroup, eraLabel: `mappa del mondo: ${fmtY(a.y)}` };
    } catch {
      // rete assente o file non disponibile: i confini restano quelli già caricati, come nel v12
      state.busy = false;
      return null;
    }
  }
  if (state.obj) state.obj.visible = state.on;
  return null;
}
