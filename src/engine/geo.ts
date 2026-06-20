// Funzioni geometriche/data pure del motore — PORTATE LETTERALMENTE dal v12
// (atlante-generatore-ia-v12.html, sezione "helpers geo" + date layer), solo tipizzate.
// Framework-agnostiche: nessun React, nessun Redux. Vector3 viene da three perché
// slerp/ll2v/pathWp/arc costruiscono e combinano vettori 3D — non ha senso reimplementarlo a mano.

import { MathUtils, Vector3 } from "three";
import type { LatLon } from "../types/peste";

/** Posizione in convenzione GeoJSON: [longitudine, latitudine] — ATTENZIONE,
 * ordine invertito rispetto a `LatLon` ([lat, lon]) usato altrove nel progetto. */
export type GeoPosition = [lon: number, lat: number];

export type GeoRing = GeoPosition[];

export type GeoGeometry =
  | { type: "Polygon"; coordinates: GeoRing[] }
  | { type: "MultiPolygon"; coordinates: GeoRing[][] }
  | { type?: string; coordinates?: unknown };

/** Feature/FeatureCollection minimi — solo i campi che il motore legge davvero
 * (i file di historical-basemaps hanno anche altre properties, qui non ci servono). */
export interface GeoFeature {
  type?: string;
  properties?: { NAME?: string } | null;
  geometry?: GeoGeometry;
}

export interface GeoFeatureCollection {
  type?: string;
  features?: GeoFeature[];
}

export interface ParsedDate {
  y: number;
  doy: number;
  fy: number;
}

/** Estrae le liste di anelli (poligoni) da una geometria Polygon/MultiPolygon GeoJSON;
 * [] per qualsiasi altro tipo (Point, LineString, geometria assente...). Condivisa da
 * featCentroid (qui) e da geomRings (engine/borders.ts) per non duplicare il cast sotto. */
export function polygonsOf(g: GeoGeometry): GeoRing[][] {
  // Il terzo membro di GeoGeometry ha un discriminante non-letterale (`type?: string`),
  // voluto per accettare qualsiasi geometria GeoJSON in input — ma questo impedisce a TS
  // di trattare l'unione come discriminata (richiede letterali su *tutti* i membri),
  // quindi il narrowing sui due casi che gestiamo va fatto a mano con un cast mirato.
  return g.type === "MultiPolygon"
    ? (g as { type: "MultiPolygon"; coordinates: GeoRing[][] }).coordinates
    : g.type === "Polygon"
      ? [(g as { type: "Polygon"; coordinates: GeoRing[] }).coordinates]
      : [];
}

/** lat/lon (gradi) -> vettore 3D sulla sfera di raggio r. */
export function ll2v(lat: number, lon: number, r: number): Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return new Vector3(
    -(r * Math.sin(phi) * Math.cos(th)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(th),
  );
}

/** Come ll2v ma con l'ordine di argomenti lon/lat (convenzione GeoJSON). */
export function lonlat2v(lon: number, lat: number, r: number): Vector3 {
  return ll2v(lat, lon, r);
}

/** Interpolazione sferica fra due vettori unitari. */
export function slerp(a: Vector3, b: Vector3, f: number): Vector3 {
  const va = a.clone();
  const vb = b.clone();
  const d = MathUtils.clamp(va.dot(vb), -1, 1);
  const om = Math.acos(d);
  const s = Math.sin(om);
  if (s < 1e-6) return va;
  return va
    .multiplyScalar(Math.sin((1 - f) * om) / s)
    .add(vb.clone().multiplyScalar(Math.sin(f * om) / s))
    .normalize();
}

/** Spezzata di waypoints [lat,lon] -> punti 3D su sfera unitaria, `per` passi per segmento. */
export function pathWp(wps: LatLon[], per: number): Vector3[] {
  const v = wps.map((w) => ll2v(w[0], w[1], 1).normalize());
  const o: Vector3[] = [];
  for (let i = 0; i < v.length - 1; i++) {
    for (let k = 0; k < per; k++) o.push(slerp(v[i], v[i + 1], k / per));
  }
  o.push(v[v.length - 1]);
  return o;
}

/** Arco fra due punti [lat,lon] con "altezza" h, su `seg` segmenti, raggio sfera `r` (default 1,
 * come il globo unitario del v12 — lì era una costante globale `R`, qui è un parametro). */
export function arc(a: LatLon, b: LatLon, h: number, seg: number, r = 1): Vector3[] {
  const va = ll2v(a[0], a[1], 1).normalize();
  const vb = ll2v(b[0], b[1], 1).normalize();
  const o: Vector3[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const p = slerp(va, vb, t);
    p.multiplyScalar(r * (1 + h * Math.sin(Math.PI * t)));
    o.push(p);
  }
  return o;
}

/** Inverso di ll2v: vettore unitario locale -> [lat, lon]. */
export function v2ll(v: Vector3): LatLon {
  const u = v.clone().normalize();
  const lat = 90 - (Math.acos(MathUtils.clamp(u.y, -1, 1)) * 180) / Math.PI;
  let lon = (Math.atan2(u.z, -u.x) * 180) / Math.PI - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return [lat, lon];
}

/** Point-in-polygon (ray casting) su un anello in convenzione GeoJSON [lon,lat]. */
export function pip(lon: number, lat: number, ring: GeoRing): boolean {
  let inside = false;
  const n = ring.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

/** Distanza angolare (gradi) tra due punti lat/lon, lungo il grande cerchio. */
export function gcDeg(la1: number, lo1: number, la2: number, lo2: number): number {
  const a = ll2v(la1, lo1, 1).normalize();
  const b = ll2v(la2, lo2, 1).normalize();
  return (Math.acos(MathUtils.clamp(a.dot(b), -1, 1)) * 180) / Math.PI;
}

/** Anno -> etichetta "117 d.C." / "509 a.C.". Usata per la label generica dell'anno corrente. */
export function fmtY(y: number): string {
  return y < 0 ? `${Math.abs(y)} a.C.` : `${y} d.C.`;
}

/** Interpolazione lineare arrotondata all'intero (v12: usata per l'anno corrente sullo scrubber). */
export function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

// Giorni cumulativi a inizio mese (anno non bisestile) + nomi mesi abbreviati IT,
// usati solo da parseISO/dateLabel per convertire date ISO in "anno frazionario" e viceversa.
const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** Parsa una data ISO "YYYY-MM-DD" (anno anche negativo/a.C.) in {y, doy, fy}. */
export function parseISO(s: string): ParsedDate {
  const m = /(-?\d{1,4})-(\d{1,2})-(\d{1,2})/.exec(s || "");
  if (!m) return { y: 0, doy: 1, fy: 0 };
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const doy = CUM[Math.max(0, Math.min(11, mo - 1))] + d;
  return { y, doy, fy: y + doy / 365 };
}

/** Interpola due date parsate (v. parseISO) per frazione p -> etichetta "12 ott 1492". */
export function dateLabel(a: ParsedDate, b: ParsedDate, p: number): string {
  const fy = a.fy + (b.fy - a.fy) * p;
  const y = Math.floor(fy);
  let doy = Math.round((fy - y) * 365);
  if (doy < 1) doy = 1;
  let mo = 0;
  while (mo < 11 && doy > CUM[mo + 1]) mo++;
  const day = Math.max(1, doy - CUM[mo]);
  return `${day} ${MONTHS[mo]} ${y < 0 ? `${Math.abs(y)} a.C.` : y}`;
}

/** Centroide (medio dei vertici dell'anello più grande) di una geometria Polygon/MultiPolygon
 * GeoJSON. `size` = numero di vertici dell'anello scelto, usato altrove come proxy di importanza. */
export function featCentroid(
  g: GeoGeometry,
): { lon: number; lat: number; size: number } | null {
  const polys = polygonsOf(g);
  let best: GeoRing | null = null;
  let bl = 0;
  for (const poly of polys) {
    const r = poly[0];
    if (r && r.length > bl) {
      bl = r.length;
      best = r;
    }
  }
  if (!best) return null;
  let sx = 0;
  let sy = 0;
  for (const c of best) {
    sx += c[0];
    sy += c[1];
  }
  return { lon: sx / best.length, lat: sy / best.length, size: bl };
}
