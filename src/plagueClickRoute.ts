export type PlagueClickRoute = "tour" | "quiz" | "igCard";

/** Decide a cosa instrada il tap su una regione Peste, dato lo stato di tour/quiz
 * (v12: pointerup -> resolvePlagueRegion -> se quiz attivo quizAnswer, altrimenti se
 * non in tour openIgCard, altrimenti niente — RICOGNIZIONE-v12.md §5: il quiz ha
 * precedenza sul tour, non sono mai attivi insieme nella UI ma l'ordine riflette il v12).
 * Pura e testabile senza montare GlobeEngine/three.js; usata dal coordinatore in App.tsx,
 * che vive lì perché deve conoscere insieme lo stato di più feature (tour/quiz) e
 * l'istanza di GlobeEngine. */
export function routePlagueClick(mode: { tourActive: boolean; quizActive: boolean }): PlagueClickRoute {
  if (mode.quizActive) return "quiz";
  if (mode.tourActive) return "tour";
  return "igCard";
}
