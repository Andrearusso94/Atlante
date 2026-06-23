// Logica pura del rullino "Instagram" Peste — PORTATA dal v12 (igGo: clamp dell'indice;
// swipe sul rullino: soglia 40px). Nessun riferimento a React/DOM, testabile con stato
// finto (RICOGNIZIONE-v12.md §5).

/** v12 (swipe sul rullino): soglia di trascinamento perché un movimento conti come swipe. */
export const SWIPE_THRESHOLD_PX = 40;

/** v12 `igGo`: `ig.i=Math.max(0,Math.min(ig.n-1,idx))` — clampa l'indice entro [0, n-1]. */
export function clampIgIndex(idx: number, n: number): number {
  if (n <= 0) return 0;
  return Math.max(0, Math.min(n - 1, idx));
}

/** v12 (pointerup sx/dx): `dx>40` → slide precedente (-1), `dx<-40` → successiva (+1),
 * altrimenti nessun movimento (0). */
export function swipeStep(dx: number): -1 | 0 | 1 {
  if (dx > SWIPE_THRESHOLD_PX) return -1;
  if (dx < -SWIPE_THRESHOLD_PX) return 1;
  return 0;
}

/** v12 `igCount`: "i / n" (1-based), vuoto se non ci sono slide. */
export function igCountText(idx: number, n: number): string {
  return n > 0 ? `${idx + 1} / ${n}` : "";
}
