// Drag pointer + flyTo — PORTATO LETTERALMENTE dal v12 (sezione "interazione + tema" per il
// drag; `flyTo`/`qTarget` erano invece dichiarati nella sezione "STRUMENTI PER LA CLASSE",
// ma è lo stesso concern — la camera del globo — quindi qui stanno insieme, come chiesto.

import { Quaternion, Vector3 } from "three";
import type { Group } from "three";
import { ll2v } from "./geo";

export const qA = (axis: Vector3, angle: number): Quaternion => new Quaternion().setFromAxisAngle(axis, angle);

// --- stato di modulo "temporaneo" (drag + fly-to) — stesso criterio di borders.ts/scene.ts:
// da assorbire come campi d'istanza quando la classe GlobeEngine assemblerà questo modulo.
export let dragging = false;
export let autoPause = 0;
export let qTarget: Quaternion | null = null;

let lx = 0;
let ly = 0;
let downT = 0;
let downX = 0;
let downY = 0;
let movedPx = 0;

/**
 * Aggancia il drag pointer di `container` alla rotazione di `globeGroup`. Ritorna una
 * funzione di dispose (assente nel v12, dove i listener vivevano per tutta la pagina).
 *
 * `onTap` è invocato al rilascio quando si è trattato di un tap e non di un drag
 * (v12: `movedPx<6 && now-downT<500`), con le coordinate schermo del click. Il motore
 * NON decide cosa farne: nel v12 quel punto chiamava `resolvePlagueRegion` e poi
 * instradava fra quiz/card/niente-in-tour — è il "coordinatore del click globo" che,
 * per RICOGNIZIONE-v12.md, vive in App.tsx (deve conoscere più feature insieme).
 */
export function attachPointerControls(
  container: HTMLElement,
  globeGroup: Group,
  onTap?: (x: number, y: number) => void,
): () => void {
  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
    downT = performance.now();
    downX = e.clientX;
    downY = e.clientY;
    movedPx = 0;
    container.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    autoPause = performance.now() + 2500;
    if (movedPx < 6 && performance.now() - downT < 500) onTap?.(e.clientX, e.clientY);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - lx) * 0.005;
    const dy = (e.clientY - ly) * 0.005;
    lx = e.clientX;
    ly = e.clientY;
    movedPx = Math.max(movedPx, Math.hypot(e.clientX - downX, e.clientY - downY));
    globeGroup.quaternion.premultiply(qA(new Vector3(0, 1, 0), dx));
    globeGroup.quaternion.premultiply(qA(new Vector3(1, 0, 0), dy));
  };
  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointermove", onPointerMove);
  return () => {
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointerup", onPointerUp);
    container.removeEventListener("pointermove", onPointerMove);
  };
}

/** Punta la camera verso lat/lon (lo slerp vero e proprio lo fa engine/loop.ts ogni frame
 * leggendo qTarget) e sospende la rotazione automatica molto più a lungo di un semplice
 * rilascio del drag — 10 minuti contro 2.5s, esattamente come nel v12 (6e5 vs 2500 ms):
 * usato da tour/quiz per evitare che il globo riprenda a girare durante una tappa. */
export function flyTo(lat: number, lon: number): void {
  const local = ll2v(lat, lon, 1).normalize();
  qTarget = new Quaternion().setFromUnitVectors(local, new Vector3(0, 0, 1));
  autoPause = performance.now() + 6e5;
}

/** Consuma qTarget: lo chiama engine/loop.ts quando lo slerp ha raggiunto il bersaglio. */
export function clearFlyTarget(): void {
  qTarget = null;
}
