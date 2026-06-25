import { setPlaying } from "../../store/modeSlice";
import type { AppDispatch } from "../../store";
import type { GlobeEngine } from "../../engine/GlobeEngine";

export interface ResetOnSceneReadyArgs {
  engine: GlobeEngine;
  dispatch: AppDispatch;
}

/**
 * v12 (riga 529, ultima istruzione di `renderScene`, dopo ogni archetipo): ad ogni
 * nuova scena pronta, la timeline riparte sempre da zero e si avvia da sola —
 * `progress=0;scrub.value=0;playing=true;play.textContent="❚❚"`. Qui collegata al
 * callback `GlobeEngine.onSceneReady` (App.tsx).
 *
 * `engine.setProgress(p)` ferma SEMPRE `playing` (engine/loop.ts: comportamento dello
 * scrub manuale) — va quindi chiamato PRIMA di `setPlaying(true)`, non dopo, altrimenti
 * l'autoplay risulterebbe spento appena riacceso.
 */
export function resetTimelineOnSceneReady({ engine, dispatch }: ResetOnSceneReadyArgs): void {
  engine.setProgress(0);
  engine.setPlaying(true);
  dispatch(setPlaying(true));
}
