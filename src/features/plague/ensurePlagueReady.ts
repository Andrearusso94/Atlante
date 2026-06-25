import { FALLBACK } from "../../data/fallback";
import { setBordersOn, setPlaying } from "../../store/modeSlice";
import { setCurrentSpec } from "../../store/specSlice";
import type { AppDispatch } from "../../store";
import type { GlobeEngine } from "../../engine/GlobeEngine";

export interface EnsurePlagueReadyArgs {
  engine: GlobeEngine;
  dispatch: AppDispatch;
  /** bordersOn corrente (modeSlice) — il chiamante lo legge da Redux, qui si decide solo
   * se accenderlo, esattamente come il v12 leggeva la `bordersOn` di modulo. */
  bordersOn: boolean;
}

/**
 * Porting di `ensurePlagueReady` (v12 righe 976-984), condivisa da Tour e Quiz
 * (RICOGNIZIONE-v12.md §1): porta in primo piano la scena Peste e forza i confini sul
 * 1349, prima che Tour/Quiz si attivino davvero.
 *
 * Guardia iniziale e valore di ritorno fedeli al v12: se il layer è già attivo esce
 * subito con `true` (v12 riga 977); altrimenti tenta scena+confini e ritorna lo stato
 * VERO risultante (`engine.isPlagueActive()`), non un `true` fisso — in caso di mancata
 * rete sui confini del 1300 il chiamante deve poter accorgersene (v12 riga 983).
 */
export async function ensurePlagueReady({ engine, dispatch, bordersOn }: EnsurePlagueReadyArgs): Promise<boolean> {
  if (engine.isPlagueActive()) return true;

  // v12 righe 978-979: `currentSpec=FALLBACK.peste` + `renderScene`+`renderLesson` in un
  // solo try/catch silenzioso. Qui `renderLesson` equivale a `setCurrentSpec`: il
  // pannello lezione (features/lesson/Lesson.tsx) lo legge reattivamente da `currentSpec`.
  dispatch(setCurrentSpec(FALLBACK.peste));
  try {
    await engine.renderScene(FALLBACK.peste);
  } catch {
    // v12: silenzioso, nessun rollback.
  }

  // v12 riga 980: playing=false + icona ▶ (qui via engine.setPlaying, che pilota l'icona
  // a sua volta tramite onTick — vedi features/timeline/Timeline.tsx).
  dispatch(setPlaying(false));
  engine.setPlaying(false);

  // v12 riga 981: accende i confini solo se erano spenti.
  if (!bordersOn) {
    dispatch(setBordersOn(true));
    engine.setBorders(true);
  }

  // v12 riga 982: `updateBorders(1349)` in un try/catch separato, anch'esso silenzioso.
  try {
    await engine.setYear(1349);
  } catch {
    // v12: silenzioso, il ritorno sotto riflette comunque l'esito reale.
  }

  return engine.isPlagueActive();
}
